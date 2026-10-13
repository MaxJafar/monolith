import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Card, Checkbox, Flex, Grid, NumberInput } from '@lifeforge/ui'

import type { ExerciseMode, Settings, WorkoutSet } from '../../../shared'
import { weightDisplay, weightKg } from '../utils/workout'

export function WorkoutSetRow({
  set,
  mode,
  index,
  settings,
  disabled,
  timerActive,
  onChange,
  onToggle,
  onTimer,
  onRemove,
  canRemove
}: {
  set: WorkoutSet
  mode: ExerciseMode
  index: number
  settings: Settings
  disabled: boolean
  timerActive: boolean
  onChange: (set: WorkoutSet) => void
  onToggle: () => void
  onTimer: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const { t } = useModuleTranslation()

  const effort =
    set.rir !== null ? 'rir' : set.rpe !== null ? 'rpe' : settings.effort
  const effortValue = effort === 'rir' ? set.rir : set.rpe

  function number(
    field: 'reps' | 'seconds' | 'minutes' | 'speed_kmh',
    max: number
  ) {
    return (
      <NumberInput
        disabled={disabled || set.done}
        icon="tabler:hash"
        label={`inputs.${field}`}
        max={max}
        min={0}
        value={set[field]}
        onChange={value => onChange({ ...set, [field]: value })}
      />
    )
  }

  return (
    <Card bg={{ base: 'bg-100', dark: 'bg-800' }} gap="md" p="md">
      <Grid gap="md" templateCols={{ base: 1, sm: 2, lg: 3 }}>
        {mode !== 'cardio' && (
          <NumberInput
            disabled={disabled || set.done}
            icon="tabler:barbell"
            label={`${t('inputs.weight')} (${settings.unit})`}
            max={weightDisplay(10000, settings.unit)}
            min={0}
            namespace={false}
            value={weightDisplay(set.weight_kg, settings.unit)}
            onChange={value =>
              onChange({ ...set, weight_kg: weightKg(value, settings.unit) })
            }
          />
        )}
        {mode === 'reps'
          ? number('reps', 1000)
          : mode === 'time'
            ? number('seconds', 86400)
            : number('minutes', 1440)}
        {mode === 'cardio' && number('speed_kmh', 200)}
        {mode === 'reps' && effort !== 'none' && (
          <Flex direction="column" gap="sm">
            <Checkbox
              checked={effortValue !== null}
              disabled={disabled || set.done}
              label={t('workout.recordEffort', { scale: effort.toUpperCase() })}
              onCheckedChange={checked =>
                onChange({
                  ...set,
                  rir: checked && effort === 'rir' ? 0 : null,
                  rpe: checked && effort === 'rpe' ? 6 : null
                })
              }
            />
            {effortValue !== null && (
              <NumberInput
                disabled={disabled || set.done}
                icon="tabler:gauge"
                label={effort.toUpperCase()}
                max={10}
                min={effort === 'rpe' ? 6 : 0}
                namespace={false}
                value={effortValue}
                onChange={value => onChange({ ...set, [effort]: value })}
              />
            )}
          </Flex>
        )}
      </Grid>
      <Flex align="center" gap="md" wrap="wrap">
        <Checkbox
          checked={set.done}
          disabled={disabled}
          label={t('workout.doneSet', { number: index + 1 })}
          onCheckedChange={onToggle}
        />
        {mode === 'time' && (
          <Button
            disabled={disabled || timerActive || set.done || set.seconds <= 0}
            icon="tabler:player-play"
            variant="secondary"
            onClick={onTimer}
          >
            startTimer
          </Button>
        )}
        <Button
          dangerous
          disabled={disabled || !canRemove}
          variant="plain"
          onClick={onRemove}
        >
          removeSet
        </Button>
      </Flex>
    </Card>
  )
}
