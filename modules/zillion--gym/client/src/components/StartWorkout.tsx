import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Checkbox,
  DateInput,
  Grid,
  NumberInput,
  Text,
  TextInput
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { forgeAPI } from '@/manifest'

import { scheduledRoutine } from '../../../shared'
import { weightDisplay, weightKg } from '../utils/workout'
import { SelectInput } from './SelectInput'

export function StartWorkout({ routineId }: { routineId?: string }) {
  const { data, pending, run, navigate, offline } = useGym()
  const { t } = useModuleTranslation()
  const [date, setDate] = useState(() => dayjs().toDate())

  const [selected, setSelected] = useState(
    routineId ??
      (data
        ? scheduledRoutine(data.schedule, dayjs().format('YYYY-MM-DD'))
        : null) ??
      ''
  )

  const [name, setName] = useState('')

  const latest = data?.bodyweight
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  const [weight, setWeight] = useState(() => latest?.weight_kg ?? 0)
  const [skipWeight, setSkipWeight] = useState(false)

  if (!data) return null

  async function start() {
    if (
      await run(() =>
        forgeAPI.startWorkout.mutate({
          command_id: crypto.randomUUID(),
          routine_id: selected || null,
          name:
            name.trim() ||
            (selected
              ? data!.routines.find(routine => routine.id === selected)?.name
              : t('workout.freestyle')),
          date: dayjs(date).format('YYYY-MM-DD'),
          bodyweight_kg: skipWeight ? null : weight
        })
      )
    )
      navigate('workout')
  }

  return (
    <Card gap="md">
      <Text as="h2" size="2xl" weight="semibold">
        {t('workout.start')}
      </Text>
      <SelectInput
        label="inputs.routine"
        options={[
          { value: '', label: t('workout.freestyle') },
          ...data.routines
            .filter(routine => !routine.archived)
            .map(routine => ({ value: routine.id, label: routine.name }))
        ]}
        value={selected}
        onChange={setSelected}
      />
      <TextInput
        icon="tabler:barbell"
        label="inputs.workoutName"
        placeholder=""
        value={name}
        onChange={setName}
      />
      <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
        <DateInput
          icon="tabler:calendar"
          label="inputs.date"
          value={date}
          onChange={value => {
            if (value) setDate(value)
          }}
        />
        <NumberInput
          disabled={skipWeight}
          icon="tabler:scale"
          label={`${t('inputs.bodyweight')} (${data.settings.unit})`}
          max={weightDisplay(1000, data.settings.unit)}
          min={0}
          namespace={false}
          value={weightDisplay(weight, data.settings.unit)}
          onChange={value => setWeight(weightKg(value, data.settings.unit))}
        />
      </Grid>
      <Checkbox
        checked={skipWeight}
        label={t('workout.skipWeight')}
        onCheckedChange={setSkipWeight}
      />
      <Text color="muted">{t('workout.startHelp')}</Text>
      <Button
        disabled={offline || (!skipWeight && weight <= 0)}
        icon="tabler:player-play"
        loading={pending}
        onClick={() => void start()}
      >
        startWorkout
      </Button>
    </Card>
  )
}
