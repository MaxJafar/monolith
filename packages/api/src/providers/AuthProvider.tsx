import {
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { InferOutput } from '..'
import { withSessionRefreshLock } from '../client/refreshLock'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken
} from '../client/tokenStore'
import { contract } from '../contract'
import { clearServerPublicKey } from '../crypto/encryption'
import { configureNativeRuntime, getNativeRuntime } from '../desktop/runtime'
import { checkSignOutGuards } from '../desktop/sessionGuards'
import { createApiClient } from '../proxy'

let bootstrapped = false

const workspaceAPI = createApiClient(contract)

export type UserData = InferOutput<typeof workspaceAPI.user.me>['userData']

export type FileReference = NonNullable<UserData['avatar']>

interface AuthData {
  auth: boolean
  setAuth: (value: boolean) => void
  authenticate: ({
    email,
    password
  }: {
    email: string
    password: string
  }) => Promise<string | void>
  logout: () => Promise<void>
  verifyOAuth: (code: string, state: string) => Promise<string | false>
  authenticateWith2FA: (otp: string) => Promise<string>
  authLoading: boolean
  userData: UserData | null
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>
  getAvatarURL: () => string
  tid: RefObject<string>
}

export const AuthContext = createContext<AuthData | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, _setAuth] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const tid = useRef('')

  const setAuth = useCallback(
    (value: boolean) => {
      _setAuth(value)
    },
    [_setAuth]
  )

  const authenticate = useCallback(
    async ({
      email,
      password
    }: {
      email: string
      password: string
    }): Promise<string | void> => {
      try {
        const native = getNativeRuntime()
        const nativeLogin = native
          ? await native.host.login({
              email,
              password,
              deviceName: `Monolith · ${native.host.platform}`
            })
          : null
        const loginData =
          nativeLogin ??
          (await workspaceAPI.auth.login.mutateRaw({
            email,
            password
          }))

        if ('state' in loginData) {
          tid.current =
            'challenge' in loginData ? loginData.challenge : loginData.tid

          return '2fa_required'
        }

        setAccessToken(loginData.accessToken)
        if (native && nativeLogin && !('state' in nativeLogin))
          configureNativeRuntime(
            native.host,
            nativeLogin.profile,
            native.discovery,
            loginData.accessToken
          )

        const userResponse = await workspaceAPI.user.me.queryRaw()

        setUserData(userResponse.userData)
        setAuth(true)

        return 'success: ' + userResponse.userData.name
      } catch (err) {
        if (!(err instanceof Error)) {
          throw new Error('Unknown error', { cause: err })
        }

        if (
          err.message === 'Invalid authorization credentials' ||
          err.message === 'Failed to perform API request'
        ) {
          return 'invalid'
        }

        throw err
      }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await checkSignOutGuards()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error))
      return
    }
    const native = getNativeRuntime()
    if (native) {
      try {
        await native.host.signOut()
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
    }
    window.dispatchEvent(new Event('zillion-gym-sign-out'))

    // A shared-device logout must remove the explicitly opted-in Gym cache.
    try {
      localStorage.removeItem('zillion-gym:offline:owner:v1')
      localStorage.removeItem('zillion-gym:offline:snapshot:v1')
    } catch {
      /* Storage can be denied independently of signing out. */
    }
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .getRegistration('/gym')
        .then(registration => {
          registration?.active?.postMessage({ type: 'GYM_OFFLINE_DISABLE' })
          registration?.active?.postMessage({ type: 'GYM_SIGN_OUT' })
        })
        .catch(() => {})
    clearAccessToken()
    setAuth(false)
    setUserData(null)

    clearServerPublicKey()
    window.dispatchEvent(new Event('monolith-auth-cleared'))
    if (!native) workspaceAPI.auth.logout.mutateRaw(undefined).catch(() => {})
  }, [])

  const verifyOAuth = useCallback(
    async (code: string, state: string): Promise<string | false> => {
      try {
        const storedState = sessionStorage.getItem('oauthState')
        const storedProvider = sessionStorage.getItem('oauthProvider')

        if (!state || !storedState || !storedProvider) {
          return false
        }

        sessionStorage.removeItem('oauthState')
        sessionStorage.removeItem('oauthProvider')

        if (storedState !== state) {
          return false
        }

        const oauthData = await workspaceAPI.auth.oauth.verify.mutateRaw({
          code,
          provider: storedProvider,
          state
        })

        if ('state' in oauthData) {
          tid.current = oauthData.tid

          return '2fa_required'
        }

        setAccessToken(oauthData.accessToken)

        const userResponse = await workspaceAPI.user.me.queryRaw()

        setUserData(userResponse.userData)
        setAuth(true)

        return 'success: ' + userResponse.userData.name
      } catch {
        setAuth(false)
        setUserData(null)

        return false
      } finally {
        setAuthLoading(false)
      }
    },
    []
  )

  const authenticateWith2FA = useCallback(
    async (otp: string): Promise<string> => {
      const native = getNativeRuntime()
      const nativeLogin = native
        ? await native.host.totp(tid.current, otp)
        : null
      const data =
        nativeLogin ??
        (await workspaceAPI.auth['2fa'].verify.mutateRaw({
          otp,
          tid: tid.current
        }))

      setAccessToken(data.accessToken)
      if (native && nativeLogin)
        configureNativeRuntime(
          native.host,
          nativeLogin.profile,
          native.discovery,
          data.accessToken
        )

      const userResponse = await workspaceAPI.user.me.queryRaw()

      setUserData(userResponse.userData)
      setAuth(true)

      return userResponse.userData.name || ''
    },
    []
  )

  const getAvatarURL = useCallback((): string => {
    if (userData?.avatar) {
      return workspaceAPI.getMedia({
        key: userData.avatar.key,
        thumb: '256x0'
      })
    }

    return ''
  }, [userData])

  useEffect(() => {
    if (getAccessToken()) {
      setAuth(true)
      setAuthLoading(true)

      workspaceAPI.user.me
        .queryRaw()
        .then(data => {
          setUserData(data.userData)
        })
        .catch(() => {
          clearAccessToken()
          setAuth(false)
          setUserData(null)
        })
        .finally(() => {
          setAuthLoading(false)
        })

      return
    }

    if (bootstrapped) return

    bootstrapped = true
    setAuthLoading(true)

    withSessionRefreshLock(() => workspaceAPI.auth.refresh.mutateRaw(undefined))
      .then((data: { accessToken: string }) => {
        setAccessToken(data.accessToken)

        return workspaceAPI.user.me.queryRaw()
      })
      .then(data => {
        setUserData(data.userData)
        setAuth(true)
      })
      .catch(() => {
        setAuth(false)
        setUserData(null)
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  const value = useMemo(
    () => ({
      auth,
      setAuth,
      authenticate,
      logout,
      verifyOAuth,
      authenticateWith2FA,
      authLoading,
      userData,
      setUserData,
      getAvatarURL,
      tid
    }),
    [auth, authLoading, userData, setUserData, tid]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthData {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}
