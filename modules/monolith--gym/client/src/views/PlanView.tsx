import dayjs from 'dayjs'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Checkbox,
  DateInput,
  Flex,
  Grid,
  Stack,
  Text
} from '@monolith/ui'

import { useGym } from '@/GymContext'
import { workspaceAPI } from '@/manifest'

import { PrintPlan } from '../components/PrintPlan'
import { RoutineEditor } from '../components/RoutineEditor'
import { SelectInput } from '../components/SelectInput'
import { downloadJson } from '../utils/workout'

export default function PlanView() {
  const { data, pending, run, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [params] = useSearchParams()
  const [date, setDate] = useState(() => dayjs().toDate())
  const [overrideRoutine, setOverrideRoutine] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  if (!data) return null

  const routineId = params.get('routine')
  const routine = data.routines.find(routine => routine.id === routineId)

  if (routineId === 'new' || routine)
    return <RoutineEditor key={routineId} routine={routine} />

  const visible = data.routines.filter(
    routine => showArchived || !routine.archived
  )
  const routineOptions = [
    { value: '', label: t('plan.restDay') },
    ...data.routines
      .filter(routine => !routine.archived)
      .map(routine => ({ value: routine.id, label: routine.name }))
  ]

  return (
    <Stack className="zillion-gym-plan" gap="lg">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Text as="h2" size="2xl" weight="semibold">
          {t('sections.plan')}
        </Text>
        <Flex className="zillion-gym-controls" gap="sm" wrap="wrap">
          <Button
            icon="tabler:plus"
            onClick={() => navigate('plan', { routine: 'new' })}
          >
            newRoutine
          </Button>
          <Button
            disabled={pending}
            variant="secondary"
            onClick={() =>
              void run(() =>
                workspaceAPI.starterPlan.mutate({ command_id: crypto.randomUUID() })
              )
            }
          >
            starterPlan
          </Button>
          <Button
            icon="tabler:download"
            variant="secondary"
            onClick={() =>
              void run(async () =>
                downloadJson(
                  await workspaceAPI.exportData.input({ scope: 'plan' }).query(),
                  'zillion-gym-plan.json'
                )
              )
            }
          >
            exportPlan
          </Button>
          <PrintPlan />
        </Flex>
      </Flex>
      <Grid gap="lg" templateCols={{ base: 1, lg: 2 }}>
        <Card as="section" gap="md">
          <Text as="h3" size="xl">
            {t('plan.weeklySchedule')}
          </Text>
          {[1, 2, 3, 4, 5, 6, 0].map(weekday => (
            <SelectInput
              key={weekday}
              disabled={pending}
              label={dayjs().day(weekday).format('dddd')}
              namespace={false}
              options={routineOptions}
              value={
                data.schedule.find(item => item.weekday === weekday)
                  ?.routine_id ?? ''
              }
              onChange={id =>
                void run(() =>
                  workspaceAPI.setSchedule.mutate({
                    weekday,
                    date: null,
                    routine_id: id || null
                  })
                )
              }
            />
          ))}
        </Card>
        <Card as="section" gap="md">
          <Text as="h3" size="xl">
            {t('plan.dateOverrides')}
          </Text>
          <Text color="muted">{t('plan.overrideHelp')}</Text>
          <DateInput
            icon="tabler:calendar"
            label="inputs.date"
            value={date}
            onChange={value => {
              if (value) setDate(value)
            }}
          />
          <SelectInput
            label="inputs.routine"
            options={routineOptions}
            value={overrideRoutine}
            onChange={setOverrideRoutine}
          />
          <Button
            disabled={pending}
            onClick={() =>
              void run(() =>
                workspaceAPI.setSchedule.mutate({
                  weekday: null,
                  date: dayjs(date).format('YYYY-MM-DD'),
                  routine_id: overrideRoutine || null
                })
              )
            }
          >
            saveOverride
          </Button>
          {data.schedule
            .filter(item => item.date !== null)
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map(item => (
              <Flex
                key={item.id}
                align="center"
                gap="md"
                justify="between"
                wrap="wrap"
              >
                <Text>
                  {item.date} ·{' '}
                  {data.routines.find(routine => routine.id === item.routine_id)
                    ?.name ?? t('plan.restDay')}
                </Text>
                <Button
                  dangerous
                  disabled={pending}
                  variant="plain"
                  onClick={() =>
                    void run(() =>
                      workspaceAPI.removeSchedule
                        .input({ id: item.id })
                        .mutate(undefined)
                    )
                  }
                >
                  remove
                </Button>
              </Flex>
            ))}
        </Card>
      </Grid>
      <Checkbox
        checked={showArchived}
        label={t('plan.showArchived')}
        onCheckedChange={setShowArchived}
      />
      {!visible.length && (
        <Card>
          <Text>{t('messages.noRoutines')}</Text>
        </Card>
      )}
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        {visible.map(routine => (
          <Card key={routine.id} as="section" gap="md">
            <Text as="h3" size="xl" weight="semibold">
              {routine.name}
            </Text>
            <Text color="muted">
              {t('plan.exerciseCount', { count: routine.entries.length })} ·{' '}
              {t(`progression.${routine.progression}`)}
            </Text>
            <Text whiteSpace="pre-line">{routine.notes}</Text>
            <Stack>
              {routine.entries.map(entry => (
                <Text key={entry.id}>
                  {data.exercises.find(
                    exercise => exercise.id === entry.exercise_id
                  )?.name ?? t('messages.unknownExercise')}{' '}
                  · {entry.prescription.sets} ×{' '}
                  {entry.prescription.mode === 'reps'
                    ? entry.prescription.reps
                    : entry.prescription.mode === 'time'
                      ? `${entry.prescription.seconds}s`
                      : `${entry.prescription.minutes} min`}
                  {entry.superset_group ? ` · ${t('workout.superset')}` : ''}
                </Text>
              ))}
            </Stack>
            <Flex className="zillion-gym-controls" gap="sm" wrap="wrap">
              <Button
                variant="secondary"
                onClick={() => navigate('plan', { routine: routine.id })}
              >
                edit
              </Button>
              <Button
                disabled={pending}
                variant="secondary"
                onClick={() =>
                  void run(() =>
                    workspaceAPI.duplicateRoutine
                      .input({ id: routine.id })
                      .mutate({ expected_revision: routine.revision })
                  )
                }
              >
                duplicate
              </Button>
              <Button
                dangerous={!routine.archived}
                disabled={pending}
                variant="plain"
                onClick={() => {
                  if (
                    routine.archived ||
                    window.confirm(t('messages.archiveRoutine'))
                  )
                    void run(() =>
                      workspaceAPI.archiveRoutine.input({ id: routine.id }).mutate({
                        expected_revision: routine.revision,
                        archived: !routine.archived
                      })
                    )
                }}
              >
                {routine.archived ? 'restore' : 'archive'}
              </Button>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Stack>
  )
}
