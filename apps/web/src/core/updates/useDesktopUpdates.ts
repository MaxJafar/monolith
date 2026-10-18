import { useCallback, useEffect, useRef, useState } from 'react'

import {
  checkSignOutGuards,
  getDesktopBackgroundReader,
  getDesktopUpdater
} from '@monolith/api'
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
  const backgroundReader = getDesktopBackgroundReader()

  const [state, setState] = useState<PlatformUpdateStatus>()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const lastInput = useRef(Date.now())
  const wasBackground = useRef(false)
  const lastAutomaticAttempt = useRef(0)
  const actionRef = useRef(false)
  const mounted = useRef(true)
  // Native window minimization does not reliably change WebView2 visibility.
  // Unknown native state must never authorize an unattended restart.
  const isBackground = useCallback(async () => {
    try {
      return backgroundReader
        ? await backgroundReader()
        : document.visibilityState === 'hidden'
    } catch {
      return false
    }
  }, [backgroundReader])
  // An action can start between idle polls. Switch cadence immediately so short
  // downloads show byte progress instead of sitting at zero until the next poll.
  const pollEvery =
    pending ||
    [
      'checking',
      'downloading',
      'verifying',
      'installing',
      'restarting',
      'rollingBack'
    ].includes(state?.phase ?? '')
      ? 500
      : 10000

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
            (!(await isBackground()) ||
              !mounted.current ||
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
    [updater, refresh, isBackground]
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
    window.addEventListener('focus', input)
    window.addEventListener('blur', input)
    document.addEventListener('visibilitychange', input)
    const tick = async () => {
      const next = await refresh()
      const background = await isBackground()

      if (cancelled) return
      if (!background || background !== wasBackground.current)
        lastInput.current = Date.now()
      wasBackground.current = background

      if (
        next?.phase === 'ready' &&
        next.preferences.autoInstall &&
        next.release?.version !== next.failedVersion &&
        background &&
        Date.now() - lastInput.current > 120000 &&
        Date.now() - lastAutomaticAttempt.current > 60000
      ) {
        lastAutomaticAttempt.current = Date.now()
        await act('install', undefined, true)
      }
      if (!cancelled) timer = setTimeout(tick, pollEvery)
    }
    void tick()

    return () => {
      cancelled = true
      mounted.current = false
      clearTimeout(timer)
      window.removeEventListener('pointerdown', input)
      window.removeEventListener('keydown', input)
      window.removeEventListener('focus', input)
      window.removeEventListener('blur', input)
      document.removeEventListener('visibilitychange', input)
    }
  }, [updater, refresh, act, pollEvery, isBackground])

  return { available: !!updater, state, error, pending, act }
}
