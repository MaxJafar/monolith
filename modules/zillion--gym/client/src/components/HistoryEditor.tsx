import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  DateInput,
  Flex,
  Grid,
  NumberInput,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { forgeAPI } from '@/manifest'

import {
  type Workout,
  type WorkoutUpdate,
  workoutUpdateSchema
} from '../../../shared'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import { weightDisplay, weightKg } from '../utils/workout'
import { HistoricalSetEditor } from './HistoricalSetEditor'

export function HistoryEditor({
  workout,
  onClose
}: {
  workout: Workout
  onClose: () => void
}) {
  const { data, run, pending } = useGym()
  const { t } = useModuleTranslation()

  const [baseline] = useState(() => ({
    original: workoutUpdateSchema.parse(workout),
    revision: workout.revision
  }))

  const [draft, setDraft] = useState<WorkoutUpdate>(baseline.original)

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.original)

  const guard = useDraftGuard(dirty)

  const unit = data!.settings.unit

  async function save() {
    if (
      await run(() =>
        forgeAPI.updateWorkout.input({ id: workout.id }).mutate({
          ...draft,
          expected_revision: baseline.revision,
          command_id: crypto.randomUUID()
        })
      )
    ) {
      guard.allowNavigation()
      onClose()
    }
  }

  async function remove() {
    if (
      window.confirm(t('history.confirmDelete')) &&
      (await run(() =>
        forgeAPI.deleteWorkout.input({ id: workout.id }).mutate({
          expected_revision: baseline.revision,
          command_id: crypto.randomUUID()
        })
      ))
    ) {
      guard.allowNavigation()
      onClose()
    }
  }

  return (
    <Card aria-label={t('history.edit')} gap="lg" role="region">
      <Flex gap="md" justify="between" wrap="wrap">
        <Text as="h3" size="xl" weight="semibold">
          {t('history.edit')}
        </Text>
        <Button
          variant="plain"
          onClick={() => {
            if (!dirty || window.confirm(t('messages.unsaved'))) {
              guard.allowNavigation()
              onClose()
            }
          }}
        >
          close
        </Button>
      </Flex>
      <DraftNotice blocker={guard.blocker} />
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <TextInput
          icon="tabler:barbell"
          label="inputs.name"
          placeholder=""
          value={draft.name}
          onChange={name => setDraft({ ...draft, name })}
        />
        <DateInput
          icon="tabler:calendar"
          label="inputs.date"
          value={dayjs(draft.date).toDate()}
          onChange={date => {
            if (date)
              setDraft({ ...draft, date: dayjs(date).format('YYYY-MM-DD') })
          }}
        />
        <NumberInput
          icon="tabler:scale"
          label={`${t('inputs.bodyweight')} (${unit})`}
          max={2000}
          min={0}
          namespace={false}
          value={weightDisplay(draft.bodyweight_kg ?? 0, unit)}
          onChange={weight =>
            setDraft({
              ...draft,
              bodyweight_kg: weight > 0 ? weightKg(weight, unit) : null
            })
          }
        />
      </Grid>
      <TextAreaInput
        icon="tabler:notes"
        label="inputs.notes"
        placeholder=""
        value={draft.notes}
        onChange={notes => setDraft({ ...draft, notes })}
      />
      {draft.entries.map((entry, index) => (
        <Stack key={entry.id} gap="md">
          <Text as="h4" size="lg" weight="medium">
            {workout.entries.find(item => item.id === entry.id)?.exercise.name}
          </Text>
          {entry.sets.map((set, position) => (
            <HistoricalSetEditor
              key={set.id}
              mode={entry.target.mode}
              position={position}
              unit={unit}
              value={set}
              onChange={next =>
                setDraft({
                  ...draft,
                  entries: draft.entries.map((item, current) =>
                    current === index
                      ? {
                          ...item,
                          sets: item.sets.map(old =>
                            old.id === next.id ? next : old
                          )
                        }
                      : item
                  )
                })
              }
            />
          ))}
        </Stack>
      ))}
      <Text color="muted">{t('history.recalculate')}</Text>
      <Flex gap="md" wrap="wrap">
        <Button
          disabled={!dirty || !workoutUpdateSchema.safeParse(draft).success}
          icon="tabler:device-floppy"
          loading={pending}
          onClick={() => void save()}
        >
          saveChanges
        </Button>
        <Button
          dangerous
          disabled={pending || dirty}
          variant="plain"
          onClick={() => void remove()}
        >
          deleteWorkout
        </Button>
      </Flex>
    </Card>
  )
}
