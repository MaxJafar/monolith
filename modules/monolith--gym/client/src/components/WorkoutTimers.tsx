import dayjs from 'dayjs'
import { useEffect, useRef } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Text } from '@monolith/ui'

import type { WorkTimer } from '../../../shared'
import { useWorkoutClock } from '../hooks/useWorkoutClock'
import { playBeep } from '../utils/sound'
import { clock, timerRemaining } from '../utils/workout'

export function WorkoutTimers({
  workTimer,
  restUntil,
  canComplete,
  pending,
  sound,
  onComplete,
  onSkipRest
}: {
  workTimer: WorkTimer | null
  restUntil: string | null
  canComplete: boolean
  pending: boolean
  sound: boolean
  onComplete: () => Promise<void>
  onSkipRest: () => void
}) {
  const { t } = useModuleTranslation()

  const ticking =
    !!workTimer || (!!restUntil && dayjs(restUntil).isAfter(dayjs()))
  // Active work/rest commands keep their existing background completion behavior.

  const now = useWorkoutClock(ticking, false)
  const attemptedTimer = useRef<string | null>(null)
  const restChime = useRef<string | null>(null)

  const workRemaining = timerRemaining(workTimer, now)
  const restRemaining = restUntil
    ? Math.max(0, Math.ceil((dayjs(restUntil).valueOf() - now) / 1000))
    : 0

  useEffect(() => {
    if (
      workTimer &&
      workRemaining === 0 &&
      canComplete &&
      attemptedTimer.current !== workTimer.started_at
    ) {
      attemptedTimer.current = workTimer.started_at
      void onComplete()
    }
  }, [workTimer, workRemaining, canComplete, onComplete])
  useEffect(() => {
    if (!restUntil) return

    const remaining = dayjs(restUntil).valueOf() - now

    if (remaining > 0) restChime.current = restUntil
    else if (restChime.current === restUntil) {
      restChime.current = null
      playBeep(sound)
    }
  }, [restUntil, now, sound])

  return (
    <>
      {workTimer && (
        <Card aria-live="off" gap="md" role="timer">
          <Text as="h3" size="xl">
            {t('workout.workTimer')} · {clock(workRemaining)}
          </Text>
          <Text>{t('workout.timerHelp')}</Text>
          <Button disabled={!canComplete} onClick={() => void onComplete()}>
            {workRemaining === 0 ? 'completeTimer' : 'stopTimer'}
          </Button>
        </Card>
      )}
      {restRemaining > 0 && (
        <Card aria-live="off" gap="md" role="timer">
          <Text as="h3" size="xl">
            {t('workout.restTimer')} · {clock(restRemaining)}
          </Text>
          <Button disabled={pending} variant="secondary" onClick={onSkipRest}>
            skipRest
          </Button>
        </Card>
      )}
    </>
  )
}
