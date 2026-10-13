import { useMemo, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Flex, NumberInput, Stack, Text } from '@lifeforge/ui'

import { useGym } from '@/GymContext'

import type { WorkoutEntry, WorkoutSet } from '../../../shared'
import { weightDisplay, weightKg } from '../utils/workout'
import { WorkoutSetRow } from './WorkoutSetRow'

export function WorkoutEntryCard({
  entry,
  pending,
  timerActive,
  onChange,
  onToggle,
  onTimer,
  onRemove
}: {
  entry: WorkoutEntry
  pending: boolean
  timerActive: boolean
  onChange: (entry: WorkoutEntry) => void
  onToggle: (setId: string) => void
  onTimer: (setId: string) => void
  onRemove: () => void
}) {
  const { data } = useGym()
  const { t } = useModuleTranslation()

  const [workingKg, setWorkingKg] = useState(
    () => entry.sets.find(set => !set.done)?.weight_kg ?? entry.target.weight_kg
  )

  const last = useMemo(
    () =>
      data?.workouts
        .filter(workout => workout.status === 'completed')
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .flatMap(workout =>
          workout.entries.filter(
            previous => previous.exercise_id === entry.exercise_id
          )
        )[0],
    [data?.workouts, entry.exercise_id]
  )

  if (!data) return null

  const nextWeight = entry.suggestion.weight_kg ?? entry.target.weight_kg
  const nextTarget =
    entry.target.mode === 'reps'
      ? `${entry.target.sets} × ${entry.suggestion.reps ?? entry.target.reps} ${t('inputs.reps')} · ${nextWeight === 0 ? t('library.bodyweight') : `${weightDisplay(nextWeight, data.settings.unit)} ${data.settings.unit}`}`
      : entry.target.mode === 'time'
        ? `${entry.target.sets} × ${entry.suggestion.seconds ?? entry.target.seconds} ${t('inputs.seconds')}${nextWeight > 0 ? ` · ${weightDisplay(nextWeight, data.settings.unit)} ${data.settings.unit}` : ''}`
        : `${entry.target.sets} × ${entry.target.minutes} ${t('inputs.minutes')} · ${entry.target.speed_kmh} km/h`

  function changeSet(next: WorkoutSet) {
    onChange({
      ...entry,
      sets: entry.sets.map(set => (set.id === next.id ? next : set))
    })
  }

  function addSet() {
    const previous = entry.sets[entry.sets.length - 1]!
    onChange({
      ...entry,
      sets: [
        ...entry.sets,
        {
          ...previous,
          id: crypto.randomUUID(),
          position: entry.sets.length,
          done: false,
          rir: null,
          rpe: null
        }
      ]
    })
  }

  return (
    <Card as="section" gap="md">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack>
          <Text as="h3" size="xl" weight="semibold">
            {entry.exercise.name}
          </Text>
          <Text color="muted">
            {t(`modes.${entry.target.mode}`)} ·{' '}
            {t(`muscles.${entry.exercise.muscle_group}`)} ·{' '}
            {entry.exercise.equipment}
          </Text>
        </Stack>
        <Button
          dangerous
          disabled={pending || timerActive}
          variant="plain"
          onClick={onRemove}
        >
          removeExercise
        </Button>
      </Flex>
      <Text whiteSpace="pre-line">{entry.exercise.instructions}</Text>
      {last && (
        <Text color="muted">
          {t('workout.lastSets')}:{' '}
          {last.sets
            .filter(set => set.done)
            .map(set =>
              entry.target.mode === 'reps'
                ? `${weightDisplay(set.weight_kg, data.settings.unit)} ${data.settings.unit} × ${set.reps}`
                : entry.target.mode === 'time'
                  ? `${set.seconds}s`
                  : `${set.minutes} min @ ${set.speed_kmh} km/h`
            )
            .join(' · ')}
        </Text>
      )}
      <Text
        color={entry.suggestion.kind === 'deload' ? 'dangerous' : 'primary'}
      >
        {t(`suggestions.${entry.suggestion.reason}`, {
          misses: entry.suggestion.misses,
          weight:
            entry.suggestion.weight_kg === undefined
              ? ''
              : weightDisplay(entry.suggestion.weight_kg, data.settings.unit),
          unit: data.settings.unit,
          reps: entry.suggestion.reps ?? entry.target.reps,
          seconds: entry.suggestion.seconds ?? entry.target.seconds
        })}
      </Text>
      <Text color="primary">
        {t('workout.suggestedTarget')}: {nextTarget}
      </Text>
      <Text color="muted">
        {t('workout.originalTarget')}: {entry.target.sets} ×{' '}
        {entry.target.mode === 'reps'
          ? `${entry.target.reps} ${t('inputs.reps')}`
          : entry.target.mode === 'time'
            ? `${entry.target.seconds} ${t('inputs.seconds')}`
            : `${entry.target.minutes} ${t('inputs.minutes')} @ ${entry.target.speed_kmh} km/h`}
        {entry.target.mode !== 'cardio'
          ? ` · ${weightDisplay(entry.target.weight_kg, data.settings.unit)} ${data.settings.unit}`
          : ''}
      </Text>
      {entry.target.mode !== 'cardio' && (
        <Flex align="end" gap="sm" wrap="wrap">
          <NumberInput
            disabled={pending || timerActive}
            icon="tabler:barbell"
            label={`${t('workout.workingWeight')} (${data.settings.unit})`}
            max={weightDisplay(10000, data.settings.unit)}
            min={0}
            namespace={false}
            value={weightDisplay(workingKg, data.settings.unit)}
            onChange={value =>
              setWorkingKg(weightKg(value, data.settings.unit))
            }
          />
          <Button
            disabled={
              pending || timerActive || entry.sets.every(set => set.done)
            }
            variant="secondary"
            onClick={() => {
              if (
                window.confirm(
                  t('workout.confirmWorkingWeight', {
                    weight: weightDisplay(workingKg, data.settings.unit),
                    unit: data.settings.unit
                  })
                )
              )
                onChange({
                  ...entry,
                  sets: entry.sets.map(set =>
                    set.done ? set : { ...set, weight_kg: workingKg }
                  )
                })
            }}
          >
            applyWorkingWeight
          </Button>
        </Flex>
      )}
      {entry.sets.map((set, index) => (
        <WorkoutSetRow
          key={set.id}
          canRemove={entry.sets.length > 1}
          disabled={pending}
          index={index}
          mode={entry.target.mode}
          set={set}
          settings={data.settings}
          timerActive={timerActive}
          onChange={changeSet}
          onRemove={() =>
            onChange({
              ...entry,
              sets: entry.sets.filter(current => current.id !== set.id)
            })
          }
          onTimer={() => onTimer(set.id)}
          onToggle={() => onToggle(set.id)}
        />
      ))}
      <Button
        disabled={pending || entry.sets.length >= 100}
        icon="tabler:plus"
        variant="secondary"
        onClick={addSet}
      >
        addSet
      </Button>
    </Card>
  )
}
