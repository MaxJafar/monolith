import { useModuleTranslation } from '@lifeforge/localization'
import { Checkbox, Grid, NumberInput, Text } from '@lifeforge/ui'

import type { ExerciseMode, Unit, WorkoutUpdate } from '../../../shared'
import { weightDisplay, weightKg } from '../utils/workout'
import { SelectInput } from './SelectInput'

type SetValue = WorkoutUpdate['entries'][number]['sets'][number]

export function HistoricalSetEditor({
  value,
  position,
  mode,
  unit,
  onChange
}: {
  value: SetValue
  position: number
  mode: ExerciseMode
  unit: Unit
  onChange: (value: SetValue) => void
}) {
  const { t } = useModuleTranslation()

  const effort =
    value.rir !== null ? 'rir' : value.rpe !== null ? 'rpe' : 'none'

  return (
    <Grid align="center" gap="sm" templateCols={{ base: 1, sm: 2, lg: 4 }}>
      <Text>{t('history.set', { number: position + 1 })}</Text>
      {mode !== 'cardio' && (
        <NumberInput
          icon="tabler:barbell"
          label={`${t('inputs.weight')} (${unit})`}
          max={20000}
          min={0}
          namespace={false}
          value={weightDisplay(value.weight_kg, unit)}
          onChange={weight =>
            onChange({ ...value, weight_kg: weightKg(weight, unit) })
          }
        />
      )}
      <NumberInput
        icon="tabler:hash"
        label={`inputs.${mode === 'reps' ? 'reps' : mode === 'time' ? 'seconds' : 'minutes'}`}
        max={mode === 'time' ? 86400 : 1000}
        min={0}
        value={
          mode === 'reps'
            ? value.reps
            : mode === 'time'
              ? value.seconds
              : value.minutes
        }
        onChange={number =>
          onChange({
            ...value,
            [mode === 'reps'
              ? 'reps'
              : mode === 'time'
                ? 'seconds'
                : 'minutes']: number
          })
        }
      />
      {mode === 'cardio' && (
        <NumberInput
          icon="tabler:run"
          label="inputs.speed_kmh"
          max={200}
          min={0}
          value={value.speed_kmh}
          onChange={speed_kmh => onChange({ ...value, speed_kmh })}
        />
      )}
      {mode === 'reps' && (
        <SelectInput
          label="inputs.effort"
          options={['none', 'rir', 'rpe'].map(value => ({
            value,
            label: t(`effort.${value}`)
          }))}
          value={effort}
          onChange={kind =>
            onChange({
              ...value,
              rir: kind === 'rir' ? 2 : null,
              rpe: kind === 'rpe' ? 8 : null
            })
          }
        />
      )}
      {mode === 'reps' && effort !== 'none' && (
        <NumberInput
          icon="tabler:gauge"
          label={`inputs.${effort}`}
          max={10}
          min={effort === 'rpe' ? 1 : 0}
          value={value[effort] ?? 0}
          onChange={rating => onChange({ ...value, [effort]: rating })}
        />
      )}
      <Checkbox
        checked={value.done}
        label={t('history.done')}
        onCheckedChange={done => onChange({ ...value, done })}
      />
    </Grid>
  )
}
