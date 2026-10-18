let fallbackQueue: Promise<unknown> = Promise.resolve()

/** Rotating HttpOnly refresh cookies are shared by tabs, so serialize refreshes. */
export function withSessionRefreshLock<T>(
  action: () => Promise<T>
): Promise<T> {
  const browser: { locks?: LockManager } =
    typeof navigator === 'undefined' ? {} : navigator

  if (browser.locks) {
    return browser.locks.request('zillionos:session-refresh', action)
  }

  const result = fallbackQueue.then(action, action)
  fallbackQueue = result.then(
    () => undefined,
    () => undefined
  )

  return result
}
