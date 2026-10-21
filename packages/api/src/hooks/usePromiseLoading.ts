// SPDX-License-Identifier: 0BSD
import { useCallback, useEffect, useRef, useState } from 'react'

export function usePromiseLoading<Args extends unknown[]>(
  operation: (...args: Args) => Promise<unknown>,
  onError?: (error: unknown) => void
): [boolean, (...args: Args) => Promise<void>] {
  const jobs = useRef(new Set<Promise<unknown>>())
  const active = useRef(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const run = useCallback(
    async (...args: Args) => {
      const job = Promise.resolve().then(() => operation(...args))
      jobs.current.add(job)
      if (active.current) setBusy(true)
      try {
        await job
      } catch (error) {
        if (onError) onError(error)
        else console.error(error)
      } finally {
        jobs.current.delete(job)
        if (active.current) setBusy(jobs.current.size > 0)
      }
    },
    [operation, onError]
  )
  return [busy, run]
}
