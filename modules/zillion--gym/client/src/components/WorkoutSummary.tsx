import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, Stack, Text } from '@lifeforge/ui'

import { useGym } from '@/GymContext'

import type { GymStats, MuscleGroup, Workout } from '../../../shared'
import { clock, weightDisplay } from '../utils/workout'
import { MuscleMap } from './MuscleMap'

export function WorkoutSummary({
  workout,
  onEdit
}: {
  workout: Workout
  onEdit: () => void
}) {
  const { data } = useGym()
  const { t } = useModuleTranslation()

  if (!data) return null

  const sets = workout.entries.flatMap(entry =>
    entry.sets.filter(set => set.done)
  )
  const volume = workout.entries
    .filter(entry => entry.target.mode === 'reps')
    .reduce(
      (sum, entry) =>
        sum +
        entry.sets
          .filter(set => set.done)
          .reduce((sum, set) => sum + set.weight_kg * set.reps, 0),
      0
    )
  const muscles = new Map<MuscleGroup, GymStats['muscles'][number]>()

  for (const entry of workout.entries) {
    const completed = entry.sets.filter(set => set.done)
    const hard = completed.filter(
      set => (set.rir ?? (set.rpe === null ? Infinity : 10 - set.rpe)) <= 3
    ).length

    for (const [group, factor] of [
      [entry.exercise.muscle_group, 1],
      ...entry.exercise.secondary_muscles.map(group => [group, 0.5] as const)
    ] as const) {
      const previous = muscles.get(group) ?? {
        muscle_group: group,
        sets: 0,
        hard_sets: 0
      }
      muscles.set(group, {
        ...previous,
        sets: previous.sets + completed.length * factor,
        hard_sets: previous.hard_sets + hard * factor
      })
    }
  }

  const records = data.stats.records.filter(
    record => record.workout_id === workout.id
  )

  return (
    <Card aria-label={t('workout.summaryTitle')} gap="lg" role="region">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack gap="xs">
          <Text as="h3" size="xl" weight="semibold">
            {t('workout.summaryTitle')}
          </Text>
          <Text>
            {workout.name} · {dayjs(workout.date).format('ll')}
          </Text>
        </Stack>
        <Button variant="secondary" onClick={onEdit}>
          editWorkoutHistory
        </Button>
      </Flex>
      <Text>
        {t('history.summary', {
          exercises: workout.entries.length,
          sets: sets.length,
          volume: weightDisplay(volume, data.settings.unit),
          unit: data.settings.unit
        })}
      </Text>
      <Text>
        {t('workout.summaryDuration', {
          duration: clock(
            dayjs(workout.finished_at).diff(dayjs(workout.started_at), 'second')
          )
        })}
      </Text>
      {records.length > 0 && (
        <Stack gap="sm">
          <Text weight="semibold">{t('stats.records')}</Text>
          {records.map(record => (
            <Text key={record.exercise_id} color="primary">
              {record.name} ·{' '}
              {weightDisplay(record.estimate_kg, data.settings.unit)}{' '}
              {data.settings.unit} · {t('stats.estimate_kg')}
            </Text>
          ))}
        </Stack>
      )}
      <MuscleMap
        bodyStyle={data.settings.body_style}
        values={[...muscles.values()]}
      />
      {workout.notes && <Text whiteSpace="pre-wrap">{workout.notes}</Text>}
    </Card>
  )
}
