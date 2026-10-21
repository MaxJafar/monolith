// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'

export function useSearchDraft(
  value: string,
  publish: (query: string) => void,
  delay: number,
  disabled: boolean
) {
  const [draft, setDraft] = useState(value)
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callback = useRef(publish)
  const cancel = () => {
    if (pending.current !== null) clearTimeout(pending.current)
    pending.current = null
  }
  useEffect(() => {
    callback.current = publish
  }, [publish])
  useEffect(() => {
    cancel()
    setDraft(value)
  }, [value, delay])
  useEffect(() => {
    if (disabled) cancel()
  }, [disabled])
  useEffect(() => cancel, [])
  return {
    value: delay > 0 ? draft : value,
    change(query: string, immediately = false) {
      cancel()
      setDraft(query)
      if (disabled) return
      if (immediately || delay <= 0) callback.current(query)
      else
        pending.current = setTimeout(() => {
          pending.current = null
          callback.current(query)
        }, delay)
    }
  }
}
