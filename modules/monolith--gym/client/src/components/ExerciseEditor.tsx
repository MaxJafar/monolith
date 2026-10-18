import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Checkbox,
  Flex,
  Grid,
  Stack,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import {
  type Exercise,
  exerciseInputSchema,
  muscleGroupSchema
} from '../../../shared'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import { SelectInput } from './SelectInput'

export function ExerciseEditor({
  exercise,
  onDone
}: {
  exercise?: Exercise
  onDone: () => void
}) {
  const [source] = useState(exercise)

  const [initial] = useState(() => ({
    ...exerciseInputSchema.parse(
      source ?? { name: '_', muscle_group: 'full-body' }
    ),
    name: source?.name ?? ''
  }))

  const [draft, setDraft] = useState(initial)
  const { pending, run } = useGym()
  const { t } = useModuleTranslation()

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  async function save() {
    const success = await run(() =>
      source
        ? workspaceAPI.updateExercise
            .input({ id: source.id })
            .mutate({ ...draft, expected_revision: source.revision })
        : workspaceAPI.createExercise.mutate(draft)
    )

    if (success) {
      allowNavigation()
      onDone()
    }
  }

  return (
    <Stack gap="md">
      <DraftNotice blocker={blocker} />
      <TextInput
        required
        icon="tabler:barbell"
        label="inputs.name"
        placeholder=""
        value={draft.name}
        onChange={name => setDraft({ ...draft, name })}
      />
      <Grid gap="md" templateCols={{ base: 1, sm: 2 }}>
        <SelectInput
          label="inputs.mode"
          options={(['reps', 'time', 'cardio'] as const).map(value => ({
            value,
            label: t(`modes.${value}`)
          }))}
          value={draft.mode}
          onChange={mode => setDraft({ ...draft, mode })}
        />
        <SelectInput
          label="inputs.muscle"
          options={muscleGroupSchema.options.map(value => ({
            value,
            label: t(`muscles.${value}`)
          }))}
          value={draft.muscle_group}
          onChange={muscle_group => setDraft({ ...draft, muscle_group })}
        />
      </Grid>
      <TextInput
        icon="tabler:device-watch"
        label="inputs.equipment"
        placeholder=""
        value={draft.equipment}
        onChange={equipment => setDraft({ ...draft, equipment })}
      />
      <Grid gap="sm" templateCols={{ base: 1, sm: 3 }}>
        {muscleGroupSchema.options
          .filter(group => group !== draft.muscle_group)
          .map(group => (
            <Checkbox
              key={group}
              checked={draft.secondary_muscles.includes(group)}
              label={t(`muscles.${group}`)}
              onCheckedChange={checked =>
                setDraft({
                  ...draft,
                  secondary_muscles: checked
                    ? [...draft.secondary_muscles, group]
                    : draft.secondary_muscles.filter(value => value !== group)
                })
              }
            />
          ))}
      </Grid>
      <TextAreaInput
        icon="tabler:list-details"
        label="inputs.instructions"
        placeholder=""
        value={draft.instructions}
        onChange={instructions => setDraft({ ...draft, instructions })}
      />
      <Flex gap="sm" wrap="wrap">
        <Button
          disabled={!exerciseInputSchema.safeParse(draft).success}
          loading={pending}
          onClick={() => void save()}
        >
          save
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!dirty || window.confirm(t('messages.discardChanges'))) {
              allowNavigation()
              onDone()
            }
          }}
        >
          cancel
        </Button>
      </Flex>
    </Stack>
  )
}
