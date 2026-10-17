import dayjs from 'dayjs'

import { Text } from '@monolith/ui'

import { useWorkoutClock } from '../hooks/useWorkoutClock'
import { clock } from '../utils/workout'

export function SessionClock({ startedAt }: { startedAt: string }) {
  const now = useWorkoutClock()

  return (
    <Text aria-live="off" role="timer">
      {clock((now - dayjs(startedAt).valueOf()) / 1000)}
    </Text>
  )
}
