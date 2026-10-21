// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'

export function useConfirmation(
  accept: (() => void | Promise<void>) | undefined,
  close: () => void,
  fallback: string
) {
  const [failure, setFailure] = useState('')
  const [pending, setPending] = useState(false)
  const transaction = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function submit(enabled: boolean) {
    if (!enabled || transaction.current) return
    transaction.current = true
    setPending(true)
    setFailure('')
    try {
      await accept?.()
      if (mounted.current) close()
    } catch (error) {
      if (mounted.current)
        setFailure(error instanceof Error ? error.message : fallback)
    } finally {
      transaction.current = false
      if (mounted.current) setPending(false)
    }
  }
  return { pending, failure, submit, canDismiss: () => !transaction.current }
}
