// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, StrictMode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAccessToken, getAccessToken } from '../client/tokenStore'
import { AuthProvider, useAuth } from './AuthProvider'

const mock = vi.hoisted(() => ({
  refresh: vi.fn(),
  login: vi.fn(),
  verify: vi.fn(),
  oauth: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  guards: vi.fn(),
  native: null as any,
  configure: vi.fn(),
  clearKey: vi.fn()
}))
vi.mock('../proxy', () => ({
  createApiClient: () => ({
    auth: {
      refresh: {
        endpoint: 'https://example.invalid/api/auth/refresh',
        mutateRaw: mock.refresh
      },
      login: { mutateRaw: mock.login },
      logout: { mutateRaw: mock.logout },
      '2fa': { verify: { mutateRaw: mock.verify } },
      oauth: { verify: { mutateRaw: mock.oauth } }
    },
    user: { me: { queryRaw: mock.me } },
    getMedia: ({ key }: { key: string }) => 'media/' + key
  })
}))
vi.mock('../desktop/runtime', () => ({
  getNativeRuntime: () => mock.native,
  configureNativeRuntime: mock.configure
}))
vi.mock('../desktop/sessionGuards', () => ({ checkSignOutGuards: mock.guards }))
vi.mock('../crypto/encryption', () => ({ clearServerPublicKey: mock.clearKey }))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const mountedRoots = new Set<Root>()
function cleanup() {
  for (const root of mountedRoots) act(() => root.unmount())
  mountedRoots.clear()
}
function renderHook<Value>(
  read: () => Value,
  {
    wrapper: Wrapper
  }: { wrapper: (props: { children: ReactNode }) => ReactNode }
) {
  const result = { current: undefined as Value }
  function Probe() {
    result.current = read()
    return null
  }
  const root = createRoot(document.createElement('div'))
  mountedRoots.add(root)
  act(() =>
    root.render(
      <Wrapper>
        <Probe />
      </Wrapper>
    )
  )
  return {
    result,
    unmount: () => {
      act(() => root.unmount())
      mountedRoots.delete(root)
    }
  }
}
async function waitFor(assertion: () => void) {
  await vi.waitFor(async () => {
    await act(async () => {
      await Promise.resolve()
    })
    assertion()
  })
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <AuthProvider>{children}</AuthProvider>
  </StrictMode>
)

beforeEach(() => {
  vi.clearAllMocks()
  clearAccessToken()
  mock.native = null
  mock.refresh.mockRejectedValue(new Error('No session'))
  mock.logout.mockResolvedValue(undefined)
  mock.guards.mockResolvedValue(undefined)
  mock.me.mockResolvedValue({
    userData: { id: 'user', name: 'Monolith user', avatar: null }
  })
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('authentication lifecycle', () => {
  it('finishes restoring under StrictMode and restores again after a real remount', async () => {
    mock.refresh.mockResolvedValue({ accessToken: 'restored' })
    const first = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(first.result.current.auth).toBe(true))
    expect(first.result.current.authLoading).toBe(false)
    expect(mock.refresh).toHaveBeenCalledTimes(1)
    first.unmount()
    clearAccessToken()
    const second = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(second.result.current.auth).toBe(true))
    expect(mock.refresh).toHaveBeenCalledTimes(2)
  })
  it('handles the password and second-factor challenge before showing the profile', async () => {
    const { result } = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(result.current.authLoading).toBe(false))
    mock.login.mockResolvedValue({ state: '2fa_required', tid: 'challenge' })
    let answer: unknown
    await act(async () => {
      answer = await result.current.authenticate({
        email: 'user@example.invalid',
        password: 'fixture'
      })
    })
    expect(answer).toBe('2fa_required')
    expect(result.current.auth).toBe(false)
    mock.verify.mockResolvedValue({ accessToken: 'verified' })
    await act(async () => {
      answer = await result.current.authenticateWith2FA('123456')
    })
    expect(mock.verify).toHaveBeenCalledWith({
      tid: 'challenge',
      otp: '123456'
    })
    expect(answer).toBe('Monolith user')
    expect(result.current.auth).toBe(true)
    expect(result.current.tid.current).toBe('')
  })
  it('consumes OAuth state once and rejects a mismatched callback', async () => {
    const { result } = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(result.current.authLoading).toBe(false))
    sessionStorage.setItem('oauthState', 'expected')
    sessionStorage.setItem('oauthProvider', 'google')
    await act(async () => {
      expect(await result.current.verifyOAuth('code', 'wrong')).toBe(false)
    })
    expect(mock.oauth).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oauthState')).toBeNull()
    sessionStorage.setItem('oauthState', 'matching')
    sessionStorage.setItem('oauthProvider', 'google')
    mock.oauth.mockResolvedValue({ accessToken: 'oauth' })
    await act(async () => {
      await result.current.verifyOAuth('code', 'matching')
    })
    expect(mock.oauth).toHaveBeenCalledWith({
      code: 'code',
      state: 'matching',
      provider: 'google'
    })
    expect(result.current.auth).toBe(true)
  })
  it('prevents a pending sign-in from restoring state after logout and clears offline data', async () => {
    const { result } = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(result.current.authLoading).toBe(false))
    let finish!: (value: { accessToken: string }) => void
    mock.login.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    let signing!: Promise<string | void>
    act(() => {
      signing = result.current.authenticate({
        email: 'user@example.invalid',
        password: 'fixture'
      })
    })
    localStorage.setItem('zillion-gym:offline:snapshot:v1', 'private')
    let leaving!: Promise<void>
    await act(async () => {
      leaving = result.current.logout()
    })
    await act(async () => {
      finish({ accessToken: 'late' })
      await Promise.all([signing, leaving])
    })
    expect(result.current.auth).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('zillion-gym:offline:snapshot:v1')).toBeNull()
    expect(mock.clearKey).toHaveBeenCalledTimes(1)
  })
  it('respects unsaved-work guards before signing out', async () => {
    const { result } = renderHook(useAuth, { wrapper })
    await waitFor(() => expect(result.current.authLoading).toBe(false))
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    mock.guards.mockRejectedValue(new Error('Save your draft first'))
    await act(async () => {
      await result.current.logout()
    })
    expect(mock.logout).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith('Save your draft first')
    alert.mockRestore()
  })
})
