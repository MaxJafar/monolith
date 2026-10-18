import { useCallback, useRef, useState } from 'react'

/** Pending remains true until every invocation settles, including overlapping saves. */
export function usePromiseLoading<Args extends unknown[]>(
  operation: (...args: Args) => Promise<unknown>,
  onError?: (error: unknown) => void
): [boolean, (...args: Args) => Promise<void>] {
  const pending = useRef(0)
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (...args: Args) => {
      pending.current += 1
      setBusy(true)
      try {
        await operation(...args)
      } catch (error) {
        if (onError) onError(error)
        else console.error(error)
      } finally {
        pending.current -= 1
        setBusy(pending.current !== 0)
      }
    },
    [operation, onError]
  )
  return [busy, run]
}
