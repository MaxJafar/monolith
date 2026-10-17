import { useEffect, useState } from 'react'

export function useWakeLock(enabled: boolean) {
  const [status, setStatus] = useState<
    'off' | 'active' | 'unsupported' | 'unavailable'
  >('off')
  useEffect(() => {
    if (!enabled) {
      setStatus('off')

      return
    }

    if (!('wakeLock' in navigator)) {
      setStatus('unsupported')

      return
    }
    let cancelled = false
    let lock: WakeLockSentinel | null = null

    async function request() {
      if (document.visibilityState !== 'visible' || lock) return

      try {
        const acquired = await navigator.wakeLock.request('screen')

        if (cancelled) {
          await acquired.release()

          return
        }
        lock = acquired
        setStatus('active')
        acquired.addEventListener('release', () => {
          lock = null
          if (!cancelled) setStatus('unavailable')
        })
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }
    void request()
    document.addEventListener('visibilitychange', request)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [enabled])

  return status
}
