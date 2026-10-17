import { useCallback, useEffect, useRef, useState } from 'react'

import { checkSignOutGuards, getDesktopUpdater } from '@monolith/api'
import type {
  PlatformUpdateStatus,
  UpdateAction,
  UpdatePreferences
} from '@monolith/configs'

export async function guardUpdateRestart() {
  await checkSignOutGuards()
  const event = new Event('beforeunload', { cancelable: true })

  if (!window.dispatchEvent(event))
    throw Error('Save or resolve unsaved changes before restarting Monolith.')
}

export function useDesktopUpdates() {
  const updater = getDesktopUpdater()

  const [state, setState] = useState<PlatformUpdateStatus>()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const lastInput = useRef(Date.now())
  const lastAutomaticAttempt = useRef(0)
  const actionRef = useRef(false)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    if (!updater) return

    try {
      const next = await updater('status')

      if (mounted.current) {
        setState(next)
        setError('')
      }

      return next
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [updater])
  const act = useCallback(
    async (
      action: UpdateAction,
      preferences?: UpdatePreferences,
      automatic = false
    ) => {
      if (!updater || actionRef.current) return
      actionRef.current = true
      setPending(true)
      setError('')
      const root =
        document.getElementById('app') ?? document.getElementById('root')
      const previousInert = root?.inert ?? false

      try {
        if (action === 'install' || action === 'rollback') {
          await guardUpdateRestart()
          if (
            automatic &&
            (!mounted.current ||
              document.visibilityState !== 'hidden' ||
              Date.now() - lastInput.current <= 120000)
          )
            return
          if (root) root.inert = true
        }

        const result = await updater(action, preferences)

        if (mounted.current) setState(result)
        await refresh()
      } catch (cause) {
        if (mounted.current)
          setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        if (root) root.inert = previousInert
        actionRef.current = false
        if (mounted.current) setPending(false)
      }
    },
    [updater, refresh]
  )
  useEffect(() => {
    mounted.current = true
    if (!updater) return
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    const input = () => {
      lastInput.current = Date.now()
    }
    window.addEventListener('pointerdown', input)
    window.addEventListener('keydown', input)
    document.addEventListener('visibilitychange', input)
    const tick = async () => {
      const next = await refresh()

      if (cancelled) return

      if (
        next?.phase === 'ready' &&
        next.preferences.autoInstall &&
        next.release?.version !== next.failedVersion &&
        document.visibilityState === 'hidden' &&
        Date.now() - lastInput.current > 120000 &&
        Date.now() - lastAutomaticAttempt.current > 60000
      ) {
        lastAutomaticAttempt.current = Date.now()
        await act('install', undefined, true)
      }
      timer = setTimeout(
        tick,
        next &&
          [
            'checking',
            'downloading',
            'verifying',
            'installing',
            'restarting',
            'rollingBack'
          ].includes(next.phase)
          ? 1500
          : 10000
      )
    }
    void tick()

    return () => {
      cancelled = true
      mounted.current = false
      clearTimeout(timer)
      window.removeEventListener('pointerdown', input)
      window.removeEventListener('keydown', input)
      document.removeEventListener('visibilitychange', input)
    }
  }, [updater, refresh, act])

  return { available: !!updater, state, error, pending, act }
}
