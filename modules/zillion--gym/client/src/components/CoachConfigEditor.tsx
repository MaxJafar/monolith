import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Checkbox,
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
  type CoachConfig,
  type CoachSnapshot,
  coachConfigInputSchema
} from '../../../coachShared'
import { DraftNotice, useDraftGuard } from '../useDraftGuard'
import { SelectInput } from './SelectInput'

export function CoachConfigEditor({
  config,
  agents
}: {
  config: CoachConfig
  agents: CoachSnapshot['agents']
}) {
  const { run, pending } = useGym()
  const { t } = useModuleTranslation()

  const initial = {
    ...config,
    intake: config.intake ?? {
      goal: '',
      experience: 'beginner' as const,
      weekdays: [1, 3, 5],
      session_minutes: 45,
      equipment: [],
      limitations: '',
      preferences: ''
    }
  }

  const [draft, setDraft] = useState(initial)
  const [baseline, setBaseline] = useState(initial)

  const [equipment, setEquipment] = useState(
    initial.intake.equipment.join(', ')
  )

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(baseline) ||
    equipment !== baseline.intake.equipment.join(', ')

  const guard = useDraftGuard(dirty)

  const value = {
    enabled: draft.enabled,
    consent: draft.consent,
    agent_id: draft.agent_id,
    run_budget_cents: draft.run_budget_cents,
    daily_limit: draft.daily_limit,
    cadence: draft.cadence,
    sessions_per_review: draft.sessions_per_review,
    intake: draft.intake.goal.trim()
      ? {
          ...draft.intake,
          equipment: equipment
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        }
      : null
  }
  const valid =
    coachConfigInputSchema.safeParse(value).success &&
    (!draft.enabled || (draft.consent && !!draft.agent_id && !!value.intake))

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('coach.settings')}
      </Text>
      <DraftNotice blocker={guard.blocker} />
      {config.revision !== baseline.revision && (
        <Text color="dangerous" role="alert">
          {t('messages.staleDraft')}
        </Text>
      )}
      <Checkbox
        checked={draft.enabled}
        label={t('coach.enabled')}
        onCheckedChange={enabled => setDraft({ ...draft, enabled })}
      />
      <Checkbox
        checked={draft.consent}
        label={t('coach.consent')}
        onCheckedChange={consent =>
          setDraft({
            ...draft,
            consent,
            enabled: consent ? draft.enabled : false
          })
        }
      />
      <Text color="muted">{t('coach.consentDetails')}</Text>
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <SelectInput
          label="coach.agent"
          options={[
            { value: '', label: t('coach.chooseAgent') },
            ...agents.map(agent => ({
              value: agent.id,
              label: `${agent.name} · ${agent.adapter} · ${agent.status}`
            }))
          ]}
          value={draft.agent_id ?? ''}
          onChange={id => setDraft({ ...draft, agent_id: id || null })}
        />
        <NumberInput
          icon="tabler:coin"
          label="coach.budget"
          max={10000}
          min={0}
          value={draft.run_budget_cents / 100}
          onChange={budget =>
            setDraft({ ...draft, run_budget_cents: Math.round(budget * 100) })
          }
        />
        <NumberInput
          icon="tabler:shield"
          label="coach.dailyLimit"
          max={20}
          min={1}
          value={draft.daily_limit}
          onChange={daily_limit => setDraft({ ...draft, daily_limit })}
        />
        <SelectInput
          label="coach.cadence"
          options={(['off', 'weekly', 'sessions'] as const).map(value => ({
            value,
            label: t(`coach.cadences.${value}`)
          }))}
          value={draft.cadence}
          onChange={cadence => setDraft({ ...draft, cadence })}
        />
        {draft.cadence === 'sessions' && (
          <NumberInput
            icon="tabler:barbell"
            label="coach.sessionsPerReview"
            max={60}
            min={2}
            value={draft.sessions_per_review}
            onChange={sessions_per_review =>
              setDraft({ ...draft, sessions_per_review })
            }
          />
        )}
        <TextInput
          icon="tabler:target"
          label="coach.goal"
          placeholder=""
          value={draft.intake.goal}
          onChange={goal =>
            setDraft({ ...draft, intake: { ...draft.intake, goal } })
          }
        />
        <SelectInput
          label="coach.experience"
          options={(['beginner', 'intermediate', 'advanced'] as const).map(
            value => ({ value, label: t(`coach.experiences.${value}`) })
          )}
          value={draft.intake.experience}
          onChange={experience =>
            setDraft({ ...draft, intake: { ...draft.intake, experience } })
          }
        />
        <NumberInput
          icon="tabler:clock"
          label="coach.sessionMinutes"
          max={240}
          min={10}
          value={draft.intake.session_minutes}
          onChange={session_minutes =>
            setDraft({ ...draft, intake: { ...draft.intake, session_minutes } })
          }
        />
        <TextInput
          icon="tabler:barbell"
          label="coach.equipment"
          placeholder=""
          value={equipment}
          onChange={setEquipment}
        />
      </Grid>
      <Stack gap="sm">
        <Text>{t('coach.weekdays')}</Text>
        <Flex gap="md" wrap="wrap">
          {Array.from({ length: 7 }, (_, weekday) => (
            <Checkbox
              key={weekday}
              checked={draft.intake.weekdays.includes(weekday)}
              label={dayjs().day(weekday).format('dddd')}
              onCheckedChange={selected =>
                setDraft({
                  ...draft,
                  intake: {
                    ...draft.intake,
                    weekdays: selected
                      ? [...draft.intake.weekdays, weekday].sort()
                      : draft.intake.weekdays.filter(day => day !== weekday)
                  }
                })
              }
            />
          ))}
        </Flex>
      </Stack>
      <TextAreaInput
        icon="tabler:notes"
        label="coach.limitations"
        placeholder=""
        value={draft.intake.limitations}
        onChange={limitations =>
          setDraft({ ...draft, intake: { ...draft.intake, limitations } })
        }
      />
      <TextAreaInput
        icon="tabler:heart"
        label="coach.preferences"
        placeholder=""
        value={draft.intake.preferences}
        onChange={preferences =>
          setDraft({ ...draft, intake: { ...draft.intake, preferences } })
        }
      />
      <Button
        disabled={!dirty || !valid}
        loading={pending}
        onClick={() =>
          void run(async () => {
            const result = await forgeAPI.saveCoachConfig.mutate({
              ...value,
              expected_revision: baseline.revision
            })
            const next = {
              ...result.config,
              intake: result.config.intake ?? initial.intake
            }
            setBaseline(next)
            setDraft(next)
            setEquipment(next.intake.equipment.join(', '))
            guard.allowNavigation()
          })
        }
      >
        saveCoachSettings
      </Button>
    </Card>
  )
}
