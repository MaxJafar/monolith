// SPDX-License-Identifier: 0BSD
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { withSessionRefreshLock } from '../client/refreshLock'
import {
  clearAccessToken,
  getAccessToken,
  getAccessTokenRevision,
  setAccessToken
} from '../client/tokenStore'
import { contract } from '../contract'
import { clearServerPublicKey } from '../crypto/encryption'
import {
  type NativeRuntime,
  configureNativeRuntime,
  getNativeRuntime
} from '../desktop/runtime'
import { checkSignOutGuards } from '../desktop/sessionGuards'
import type { ConnectionProfile } from '../desktop/transport'
import { createApiClient } from '../proxy'
import type { InferOutput } from '../types/socket'
import { clearOfflineSession, consumeOAuthState } from './authBrowser'

const account = createApiClient(contract)
export type UserData = InferOutput<typeof account.user.me>['userData']
export type FileReference = NonNullable<UserData['avatar']>
type Credentials = { email: string; password: string }
interface AuthData {
  auth: boolean
  setAuth(value: boolean): void
  authenticate(credentials: Credentials): Promise<string | void>
  authenticateWith2FA(otp: string): Promise<string>
  verifyOAuth(code: string, state: string): Promise<string | false>
  logout(): Promise<void>
  authLoading: boolean
  userData: UserData | null
  setUserData: Dispatch<SetStateAction<UserData | null>>
  getAvatarURL(): string
  tid: RefObject<string>
}
export const AuthContext = createContext<AuthData | undefined>(undefined)
const restoring = new Map<
  string,
  Promise<{ user: UserData; revision: number } | null>
>()

function restoreSession() {
  const address = account.auth.refresh.endpoint
  const pending = restoring.get(address)
  if (pending) return pending
  const task = (async () => {
    if (!getAccessToken()) {
      const before = getAccessTokenRevision()
      const credentials = await withSessionRefreshLock(() =>
        account.auth.refresh.mutateRaw(undefined)
      )
      if (before !== getAccessTokenRevision()) return null
      setAccessToken(credentials.accessToken)
    }
    const revision = getAccessTokenRevision()
    const profile = await account.user.me.queryRaw()
    return revision === getAccessTokenRevision()
      ? { user: profile.userData, revision }
      : null
  })().finally(() => {
    if (restoring.get(address) === task) restoring.delete(address)
  })
  restoring.set(address, task)
  return task
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const tid = useRef('')
  const epoch = useRef(0)
  const mounted = useRef(false)

  const current = useCallback(
    (operation: number) => mounted.current && operation === epoch.current,
    []
  )
  const establish = useCallback(
    async (
      accessToken: string,
      operation: number,
      desktop?: { runtime: NativeRuntime; profile: ConnectionProfile }
    ) => {
      if (!current(operation)) return ''
      if (desktop)
        configureNativeRuntime(
          desktop.runtime.host,
          desktop.profile,
          desktop.runtime.discovery,
          accessToken
        )
      else setAccessToken(accessToken)
      const revision = getAccessTokenRevision()
      const profile = await account.user.me.queryRaw()
      if (!current(operation) || revision !== getAccessTokenRevision())
        return ''
      tid.current = ''
      setUserData(profile.userData)
      setAuth(true)
      setAuthLoading(false)
      return profile.userData.name || ''
    },
    [current]
  )

  const authenticate = useCallback(
    async (credentials: Credentials): Promise<string | void> => {
      const operation = ++epoch.current
      try {
        const native = getNativeRuntime()
        const nativeResult = native
          ? await native.host.login({
              ...credentials,
              deviceName: 'Monolith · ' + native.host.platform
            })
          : null
        const response =
          nativeResult ??
          (await withSessionRefreshLock(() =>
            account.auth.login.mutateRaw(credentials)
          ))
        if (!current(operation)) return
        if ('state' in response) {
          tid.current =
            'challenge' in response ? response.challenge : response.tid
          return '2fa_required'
        }
        const name = await establish(
          response.accessToken,
          operation,
          native && nativeResult && !('state' in nativeResult)
            ? { runtime: native, profile: nativeResult.profile }
            : undefined
        )
        return 'success: ' + name
      } catch (error) {
        if (
          error instanceof Error &&
          [
            'Invalid authorization credentials',
            'Failed to perform API request'
          ].includes(error.message)
        )
          return 'invalid'
        throw error instanceof Error
          ? error
          : new Error('Authentication failed', { cause: error })
      }
    },
    [current, establish]
  )

  const authenticateWith2FA = useCallback(
    async (otp: string): Promise<string> => {
      const operation = ++epoch.current
      const native = getNativeRuntime()
      const nativeResult = native
        ? await native.host.totp(tid.current, otp)
        : null
      const response =
        nativeResult ??
        (await withSessionRefreshLock(() =>
          account.auth['2fa'].verify.mutateRaw({ tid: tid.current, otp })
        ))
      return establish(
        response.accessToken,
        operation,
        native && nativeResult
          ? { runtime: native, profile: nativeResult.profile }
          : undefined
      )
    },
    [establish]
  )

  const verifyOAuth = useCallback(
    async (code: string, state: string): Promise<string | false> => {
      const operation = ++epoch.current
      try {
        const provider = consumeOAuthState(state)
        if (!provider) return false
        const response = await withSessionRefreshLock(() =>
          account.auth.oauth.verify.mutateRaw({ code, state, provider })
        )
        if (!current(operation)) return false
        if ('state' in response) {
          tid.current = response.tid
          return '2fa_required'
        }
        return 'success: ' + (await establish(response.accessToken, operation))
      } catch {
        if (current(operation)) {
          setAuth(false)
          setUserData(null)
        }
        return false
      } finally {
        if (current(operation)) setAuthLoading(false)
      }
    },
    [current, establish]
  )

  const logout = useCallback(async () => {
    try {
      await checkSignOutGuards()
      const native = getNativeRuntime()
      if (native) await native.host.signOut()
      epoch.current += 1
      clearOfflineSession()
      clearAccessToken()
      clearServerPublicKey()
      tid.current = ''
      setAuth(false)
      setUserData(null)
      setAuthLoading(false)
      if (typeof window !== 'undefined')
        window.dispatchEvent(new Event('monolith-auth-cleared'))
      if (!native) {
        await withSessionRefreshLock(() =>
          account.auth.logout.mutateRaw(undefined, { timeout: 15_000 })
        ).catch(() => {})
      }
    } catch (error) {
      if (typeof window !== 'undefined')
        window.alert(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const getAvatarURL = useCallback(
    () =>
      userData?.avatar
        ? account.getMedia({ key: userData.avatar.key, thumb: '256x0' })
        : '',
    [userData]
  )

  useEffect(() => {
    mounted.current = true
    const operation = ++epoch.current
    setAuthLoading(true)
    void restoreSession()
      .then(result => {
        if (
          !current(operation) ||
          !result ||
          result.revision !== getAccessTokenRevision()
        )
          return
        setUserData(result.user)
        setAuth(true)
      })
      .catch(() => {
        if (current(operation)) {
          setAuth(false)
          setUserData(null)
        }
      })
      .finally(() => {
        if (current(operation)) setAuthLoading(false)
      })
    return () => {
      mounted.current = false
      epoch.current += 1
    }
  }, [current])

  const value = useMemo<AuthData>(
    () => ({
      auth,
      setAuth,
      authenticate,
      authenticateWith2FA,
      verifyOAuth,
      logout,
      authLoading,
      userData,
      setUserData,
      getAvatarURL,
      tid
    }),
    [
      auth,
      authenticate,
      authenticateWith2FA,
      verifyOAuth,
      logout,
      authLoading,
      userData,
      getAvatarURL
    ]
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthData {
  const state = useContext(AuthContext)
  if (!state) throw new Error('useAuth requires an AuthProvider')
  return state
}
