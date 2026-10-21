// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'

/** Keep authentication submissions single-flight and ignore a dismissed screen. */
export function useCredentialAction() {
  const mounted = useRef(false)
  const locked = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function run(operation: (active: () => boolean) => Promise<void>) {
    if (locked.current || !mounted.current) return
    locked.current = true
    setPending(true)
    setFailed(false)
    try {
      await operation(() => mounted.current)
    } catch {
      if (mounted.current) setFailed(true)
    } finally {
      locked.current = false
      if (mounted.current) setPending(false)
    }
  }
  return { pending, failed, run, clearError: () => setFailed(false) }
}
