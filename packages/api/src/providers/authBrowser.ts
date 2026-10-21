// SPDX-License-Identifier: 0BSD
export function consumeOAuthState(state: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const expected = sessionStorage.getItem('oauthState')
  const provider = sessionStorage.getItem('oauthProvider')
  sessionStorage.removeItem('oauthState')
  sessionStorage.removeItem('oauthProvider')
  return state && expected === state && provider ? provider : null
}

export function clearOfflineSession(): void {
  if (typeof window === 'undefined') return
  // These persisted identifiers must still be cleared on shared devices.
  window.dispatchEvent(new Event('zillion-gym-sign-out'))
  for (const key of [
    'zillion-gym:offline:owner:v1',
    'zillion-gym:offline:snapshot:v1'
  ]) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* Storage can be unavailable. */
    }
  }
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistration('/gym')
      .then(registration => {
        for (const type of ['GYM_OFFLINE_DISABLE', 'GYM_SIGN_OUT'])
          registration?.active?.postMessage({ type })
      })
      .catch(() => {})
  }
}
