import { useModuleTranslation } from '@monolith/localization'
import { Grid, NumberInput, Stack, Text } from '@monolith/ui'

import type { Prescription, Progression, Unit } from '../../../shared'
import { weightDisplay, weightKg } from '../utils/workout'
import { SelectInput } from './SelectInput'

export function PrescriptionEditor({
  value,
  unit,
  onChange
}: {
  value: Prescription
  unit: Unit
  onChange: (value: Prescription) => void
}) {
  const { t } = useModuleTranslation()

  const policies: Progression[] =
    value.mode === 'cardio'
      ? ['off']
      : value.mode === 'time'
        ? ['off', 'time']
        : ['off', 'linear', 'greyskull', 'double']

  function number(
    field:
      | 'sets'
      | 'reps'
      | 'reps_min'
      | 'seconds'
      | 'minutes'
      | 'speed_kmh'
      | 'rest_seconds',
    min = 0,
    max = 1000
  ) {
    return (
      <NumberInput
        icon="tabler:hash"
        label={`inputs.${field}`}
        max={max}
        min={min}
        value={value[field]}
        onChange={number => onChange({ ...value, [field]: number })}
      />
    )
  }

  return (
    <Stack gap="md">
      <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
        <SelectInput
          label="inputs.mode"
          options={(['reps', 'time', 'cardio'] as const).map(mode => ({
            value: mode,
            label: t(`modes.${mode}`)
          }))}
          value={value.mode}
          onChange={mode => onChange({ ...value, mode, progression: null })}
        />
        {number('sets', 1, 50)}
        {value.mode !== 'cardio' && (
          <NumberInput
            icon="tabler:barbell"
            label={`${t('inputs.weight')} (${unit})`}
            max={weightDisplay(10000, unit)}
            min={0}
            namespace={false}
            value={weightDisplay(value.weight_kg, unit)}
            onChange={weight =>
              onChange({ ...value, weight_kg: weightKg(weight, unit) })
            }
          />
        )}
        {value.mode === 'reps'
          ? number('reps', 1)
          : value.mode === 'time'
            ? number('seconds', 0, 86400)
            : number('minutes', 0, 1440)}
        {value.mode === 'cardio' && number('speed_kmh', 0, 200)}
        {number('rest_seconds', 0, 3600)}
        <SelectInput
          label="inputs.progression"
          options={[
            { value: '', label: t('progression.inherit') },
            ...policies.map(policy => ({
              value: policy,
              label: t(`progression.${policy}`)
            }))
          ]}
          value={value.progression ?? ''}
          onChange={progression =>
            onChange({
              ...value,
              progression: progression === '' ? null : progression
            })
          }
        />
        {value.mode !== 'cardio' && (
          <NumberInput
            icon="tabler:trending-up"
            label={
              value.mode === 'time'
                ? t('inputs.timeIncrement')
                : `${t('inputs.increment')} (${unit})`
            }
            max={1000}
            min={0}
            namespace={false}
            value={
              value.increment === null
                ? 0
                : value.mode === 'time'
                  ? value.increment
                  : weightDisplay(value.increment, unit)
            }
            onChange={increment =>
              onChange({
                ...value,
                increment:
                  increment > 0
                    ? value.mode === 'time'
                      ? increment
                      : weightKg(increment, unit)
                    : null
              })
            }
          />
        )}
        {value.progression === 'double' && number('reps_min', 1)}
      </Grid>
      <Text color="muted">
        {t(`progression.description.${value.progression ?? 'inherit'}`)}
      </Text>
    </Stack>
  )
}
