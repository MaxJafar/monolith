// SPDX-License-Identifier: 0BSD
import { useEffect, useState } from 'react'

type Probe<Value> =
  | { state: 'pending' }
  | { state: 'ready'; value: Value }
  | { state: 'failed'; error: unknown }

export function useConnectionProbe<Value>(
  host: string,
  request: (host: string, signal: AbortSignal) => Promise<Value>,
  attempt = 0
): Probe<Value> {
  const [snapshot, setSnapshot] = useState<{
    host: string
    attempt: number
    result: Probe<Value>
  }>()
  useEffect(() => {
    const lifetime = new AbortController()
    void request(host, lifetime.signal).then(
      value => {
        if (!lifetime.signal.aborted)
          setSnapshot({ host, attempt, result: { state: 'ready', value } })
      },
      error => {
        if (!lifetime.signal.aborted)
          setSnapshot({ host, attempt, result: { state: 'failed', error } })
      }
    )
    return () => lifetime.abort()
  }, [host, request, attempt])
  return snapshot?.host === host && snapshot.attempt === attempt
    ? snapshot.result
    : { state: 'pending' }
}
