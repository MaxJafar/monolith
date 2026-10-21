// SPDX-License-Identifier: 0BSD
import { useCallback, useEffect, useRef, useState } from 'react'

import { type IconPage, fetchIconPage } from './catalog'

type Result = IconPage & { key: string; loading: boolean; error?: Error }
const empty: IconPage = { icons: [], more: false, next: 0 }
export function useIconResults(prefix: string, query: string) {
  const key = JSON.stringify([prefix, query.trim()])
  const [result, setResult] = useState<Result>({ ...empty, key, loading: true })
  const [attempt, setAttempt] = useState(0)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  useEffect(() => {
    const active = new AbortController()
    controller.current = active
    busy.current = true
    setResult({ ...empty, key, loading: true })
    void fetchIconPage({ prefix, query }, active.signal)
      .then(
        page => {
          if (!active.signal.aborted)
            setResult({ ...page, key, loading: false })
        },
        error => {
          if (!active.signal.aborted)
            setResult({
              ...empty,
              key,
              loading: false,
              error: error instanceof Error ? error : new Error(String(error))
            })
        }
      )
      .finally(() => {
        if (!active.signal.aborted) busy.current = false
      })
    return () => active.abort()
  }, [key, prefix, query, attempt])
  const more = useCallback(async () => {
    const active = controller.current
    if (
      !active ||
      active.signal.aborted ||
      busy.current ||
      result.key !== key ||
      !result.more
    )
      return
    busy.current = true
    setResult(current => ({ ...current, loading: true, error: undefined }))
    try {
      const page = await fetchIconPage(
        { prefix, query, start: result.next },
        active.signal
      )
      if (!active.signal.aborted)
        setResult(current => ({
          ...page,
          icons: [...new Set([...current.icons, ...page.icons])],
          key,
          loading: false
        }))
    } catch (error) {
      if (!active.signal.aborted)
        setResult(current => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error))
        }))
    } finally {
      if (!active.signal.aborted) busy.current = false
    }
  }, [key, prefix, query, result.key, result.more, result.next])
  return {
    ...(result.key === key ? result : { ...empty, key, loading: true }),
    loadMore: more,
    retry: () => setAttempt(value => value + 1)
  }
}
