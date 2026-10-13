import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { forgeAPI } from '@/manifest'

import {
  type Exercise,
  type Routine,
  type RoutineEntry,
  type RoutineInput,
  prescriptionSchema,
  progressionSchema,
  routineInputSchema
} from '../../../shared'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import { cleanSupersets } from '../utils/workout'
import { ExercisePicker } from './ExercisePicker'
import { RoutineEntryEditor } from './RoutineEntryEditor'
import { SelectInput } from './SelectInput'

export function RoutineEditor({ routine }: { routine?: Routine }) {
  const { t } = useModuleTranslation()
  const { data, run, pending, navigate } = useGym()
  const [source] = useState(routine)

  const [initial] = useState<RoutineInput>(() => ({
    name: source?.name ?? '',
    notes: source?.notes ?? '',
    progression: source?.progression ?? 'linear',
    entries: source?.entries ?? []
  }))

  const [draft, setDraft] = useState(initial)
  const [picker, setPicker] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  const entries = draft.entries.map((entry, position) => ({
    ...entry,
    position
  }))

  function changeEntries(next: RoutineEntry[]) {
    setDraft({ ...draft, entries: cleanSupersets(next) })
  }

  function move(index: number, direction: number) {
    const next = entries.slice(),
      target = index + direction

    if (target < 0 || target >= next.length) return

    const current = next[index]!,
      other = next[target]!
    next[index] = other
    next[target] = current
    changeEntries(next)
  }

  function link(index: number) {
    const next = entries.map(entry => ({ ...entry }))
    const previous = next[index - 1]!,
      current = next[index]!

    if (
      current.superset_group &&
      previous.superset_group === current.superset_group
    )
      current.superset_group = null
    else {
      const group = previous.superset_group ?? crypto.randomUUID()
      previous.superset_group = group
      current.superset_group = group
    }
    changeEntries(next)
  }

  function add(exercise: Exercise) {
    const entry: RoutineEntry = {
      id: crypto.randomUUID(),
      exercise_id: exercise.id,
      superset_group: null,
      position: entries.length,
      prescription: prescriptionSchema.parse({
        mode: exercise.mode,
        rest_seconds: data?.settings.rest_seconds ?? 90
      })
    }
    changeEntries([...entries, entry])
    setPicker(false)
  }

  async function save() {
    if (
      await run(() =>
        source
          ? forgeAPI.updateRoutine
              .input({ id: source.id })
              .mutate({ ...draft, expected_revision: source.revision })
          : forgeAPI.createRoutine.mutate(draft)
      )
    ) {
      allowNavigation()
      navigate('plan')
    }
  }

  return (
    <Stack gap="lg">
      <DraftNotice blocker={blocker} />
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Text as="h2" size="2xl" weight="semibold">
          {t(source ? 'plan.editRoutine' : 'plan.newRoutine')}
        </Text>
        <Button
          variant="secondary"
          onClick={() => {
            if (!dirty || window.confirm(t('messages.discardChanges'))) {
              allowNavigation()
              navigate('plan')
            }
          }}
        >
          back
        </Button>
      </Flex>
      {source &&
        data?.routines.find(routine => routine.id === source.id)?.revision !==
          source.revision && (
          <Card role="alert">
            <Text color="dangerous">{t('messages.staleDraft')}</Text>
          </Card>
        )}
      <TextInput
        required
        icon="tabler:clipboard"
        label="inputs.name"
        placeholder=""
        value={draft.name}
        onChange={name => setDraft({ ...draft, name })}
      />
      <TextAreaInput
        icon="tabler:notes"
        label="inputs.notes"
        placeholder=""
        value={draft.notes}
        onChange={notes => setDraft({ ...draft, notes })}
      />
      <SelectInput
        label="inputs.progression"
        options={progressionSchema.options.map(value => ({
          value,
          label: t(`progression.${value}`)
        }))}
        value={draft.progression}
        onChange={progression => setDraft({ ...draft, progression })}
      />
      <Text color="muted">{t('plan.supersetHelp')}</Text>
      {entries.map((entry, index) => (
        <RoutineEntryEditor
          key={entry.id}
          entry={entry}
          index={index}
          length={entries.length}
          linked={
            !!entry.superset_group &&
            entry.superset_group === entries[index - 1]?.superset_group
          }
          onChange={next =>
            changeEntries(
              entries.map(current => (current.id === next.id ? next : current))
            )
          }
          onLink={() => link(index)}
          onMove={direction => move(index, direction)}
          onRemove={() =>
            changeEntries(entries.filter(current => current.id !== entry.id))
          }
        />
      ))}
      {!entries.length && (
        <Card>
          <Text>{t('messages.noExercises')}</Text>
        </Card>
      )}
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={entries.length >= 100}
          icon="tabler:plus"
          variant="secondary"
          onClick={() => setPicker(value => !value)}
        >
          addExercise
        </Button>
        <Button
          disabled={!routineInputSchema.safeParse(draft).success}
          icon="tabler:check"
          loading={pending}
          onClick={() => void save()}
        >
          save
        </Button>
      </Flex>
      {picker && (
        <Card>
          <ExercisePicker onPick={add} />
        </Card>
      )}
    </Stack>
  )
}
