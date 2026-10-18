import dayjs from 'dayjs'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  DateInput,
  Flex,
  Grid,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useGym } from '@/GymContext'

import { HistoryCalendar } from '../components/HistoryCalendar'
import { HistoryEditor } from '../components/HistoryEditor'
import { SelectInput } from '../components/SelectInput'
import { WorkoutSummary } from '../components/WorkoutSummary'
import { weightDisplay } from '../utils/workout'

export default function HistoryView() {
  const { data, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('completed')
  const [from, setFrom] = useState<string | null>(null)
  const [until, setUntil] = useState<string | null>(null)
  const [shown, setShown] = useState(30)

  if (!data) return null

  const selected = data.workouts.find(
    workout => workout.id === params.get('workout')
  )
  const workouts = data.workouts
    .filter(
      workout =>
        (!status || workout.status === status) &&
        (!from || workout.date >= from) &&
        (!until || workout.date <= until) &&
        `${workout.name} ${workout.notes} ${workout.entries.map(entry => entry.exercise.name).join(' ')}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.started_at.localeCompare(a.started_at)
    )

  function select(id: string | null) {
    const next = new URLSearchParams(params)
    next.delete('summary')

    if (id) next.set('workout', id)
    else next.delete('workout')
    setParams(next)
  }

  return (
    <Stack gap="lg">
      <Text as="h2" size="2xl" weight="semibold">
        {t('sections.history')}
      </Text>
      <HistoryCalendar onSelectWorkout={select} />
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <TextInput
          icon="tabler:search"
          label="inputs.search"
          placeholder=""
          value={search}
          onChange={setSearch}
        />
        <SelectInput
          label="history.status"
          options={['', 'completed', 'active', 'discarded'].map(value => ({
            value,
            label: t(`history.${value || 'all'}`)
          }))}
          value={status}
          onChange={setStatus}
        />
        <DateInput
          icon="tabler:calendar"
          label="history.from"
          value={from ? dayjs(from).toDate() : null}
          onChange={date =>
            setFrom(date ? dayjs(date).format('YYYY-MM-DD') : null)
          }
        />
        <DateInput
          icon="tabler:calendar"
          label="history.until"
          value={until ? dayjs(until).toDate() : null}
          onChange={date =>
            setUntil(date ? dayjs(date).format('YYYY-MM-DD') : null)
          }
        />
      </Grid>
      <Flex align="center" gap="sm" wrap="wrap">
        <Text color="muted">
          {t('history.count', { count: workouts.length })}
        </Text>
        <Button
          variant="plain"
          onClick={() => {
            setSearch('')
            setStatus('completed')
            setFrom(null)
            setUntil(null)
          }}
        >
          resetFilters
        </Button>
      </Flex>
      {from && until && from > until && (
        <Text color="dangerous" role="alert">
          {t('history.invalidRange')}
        </Text>
      )}
      {selected &&
        (selected.status === 'active' ? (
          <Card gap="md">
            <Text>{t('history.activeNotice')}</Text>
            <Button onClick={() => navigate('workout')}>resumeWorkout</Button>
          </Card>
        ) : selected.status === 'completed' && params.get('summary') === '1' ? (
          <WorkoutSummary
            workout={selected}
            onEdit={() => select(selected.id)}
          />
        ) : (
          <HistoryEditor
            key={selected.id}
            workout={selected}
            onClose={() => select(null)}
          />
        ))}
      {workouts.length === 0 && (
        <Card>
          <Text color="muted">{t('history.empty')}</Text>
        </Card>
      )}
      {workouts.slice(0, shown).map(workout => {
        const sets = workout.entries.flatMap(entry =>
          entry.sets.filter(set => set.done)
        )
        const volume = workout.entries
          .filter(entry => entry.target.mode === 'reps')
          .flatMap(entry => entry.sets.filter(set => set.done))
          .reduce((total, set) => total + set.weight_kg * set.reps, 0)

        return (
          <Card key={workout.id} gap="md">
            <Flex align="start" gap="md" justify="between" wrap="wrap">
              <Stack flex="1" gap="xs">
                <Text as="h3" size="lg" weight="semibold">
                  {workout.name}
                </Text>
                <Text color="muted">
                  {dayjs(workout.date).format('ll')} ·{' '}
                  {t(`history.${workout.status}`)}
                </Text>
              </Stack>
              <Button
                icon="tabler:eye"
                variant="secondary"
                onClick={() => select(workout.id)}
              >
                viewWorkout
              </Button>
            </Flex>
            <Text>
              {t('history.summary', {
                exercises: workout.entries.length,
                sets: sets.length,
                volume: weightDisplay(volume, data.settings.unit),
                unit: data.settings.unit
              })}
            </Text>
            {workout.notes && (
              <Text whiteSpace="pre-wrap">{workout.notes}</Text>
            )}
          </Card>
        )
      })}
      {shown < workouts.length && (
        <Button
          variant="secondary"
          onClick={() => setShown(value => value + 30)}
        >
          loadMore
        </Button>
      )}
    </Stack>
  )
}
