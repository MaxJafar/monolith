import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  Stack,
  Text,
  colorWithOpacity
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'

import {
  type AnalyticsRange,
  type ExerciseMetric,
  displayEffort,
  effortScale,
  exerciseAnalytics,
  exerciseMetrics,
  inAnalyticsRange,
  trendPresentation
} from '../utils/analytics'
import { weightDisplay } from '../utils/workout'
import { AnalyticsMetric } from './AnalyticsMetric'
import { SelectInput } from './SelectInput'
import { TrendChart } from './TrendChart'

export function ExerciseProgress({ range }: { range: AnalyticsRange }) {
  const { data, navigate } = useGym()
  const { t } = useModuleTranslation()
  const [params] = useSearchParams()
  const [exercise, setExercise] = useState(params.get('exercise') ?? '')
  const [metric, setMetric] = useState<ExerciseMetric>('best_weight_kg')

  if (!data) return null

  const logged = new Map<string, string>()

  for (const workout of data.workouts) {
    if (workout.status !== 'completed') continue
    for (const entry of workout.entries)
      if (entry.sets.some(set => set.done))
        logged.set(entry.exercise_id, entry.exercise.name)
  }

  const current = exerciseAnalytics(
    data.workouts,
    exercise,
    data.settings.formula
  )
  const metrics = exerciseMetrics(current.mode)
  const activeMetric = metrics.includes(metric) ? metric : metrics[0]!
  const scale = effortScale(data.workouts, data.settings.effort)
  const sessions = current.sessions.filter(session =>
    inAnalyticsRange(session.date, range)
  )
  const weightMetric = activeMetric.endsWith('_kg')
  const unit = weightMetric
    ? data.settings.unit
    : activeMetric === 'effort'
      ? scale.toUpperCase()
      : activeMetric.endsWith('_seconds')
        ? 's'
        : activeMetric === 'total_minutes'
          ? 'min'
          : activeMetric === 'best_speed_kmh'
            ? 'km/h'
            : 'km'
  const display = (value: number) =>
    weightMetric
      ? weightDisplay(value, data.settings.unit)
      : activeMetric === 'effort'
        ? displayEffort(value, scale)
        : Math.round(value * 100) / 100
  const title = t(
    `stats.${activeMetric === 'effort' ? 'average_effort' : activeMetric}`
  )
  const points = sessions.flatMap(session => {
    const value = session[activeMetric]

    return value === null
      ? []
      : [
          {
            date: session.date,
            value: display(value),
            note: t('stats.sessionSets', {
              count: session.sets,
              rated: session.rated
            })
          }
        ]
  })
  const { summary } = trendPresentation(points)

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('stats.progressHeading')}
      </Text>
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <SelectInput
          label="inputs.exercise"
          options={[
            { value: '', label: t('stats.chooseExercise') },
            ...[...logged.entries()]
              .sort(([, a], [, b]) => a.localeCompare(b))
              .map(([value, label]) => ({ value, label }))
          ]}
          value={exercise}
          onChange={setExercise}
        />
        <SelectInput<ExerciseMetric>
          label="stats.metric"
          options={metrics.map(value => ({
            value,
            label: t(`stats.${value === 'effort' ? 'average_effort' : value}`)
          }))}
          value={activeMetric}
          onChange={setMetric}
        />
      </Grid>
      {current.changedMode && (
        <Text color="muted">
          {t('stats.exerciseModeHelp', { mode: t(`modes.${current.mode}`) })}
        </Text>
      )}
      {summary ? (
        <>
          <Grid
            gap="md"
            templateCols={{ base: 1, md: activeMetric === 'effort' ? 2 : 3 }}
          >
            <AnalyticsMetric
              accent
              detail={summary.last.date}
              icon="tabler:chart-line"
              label={t('stats.latestInRange')}
              unit={unit}
              value={summary.last.value}
            />
            {activeMetric !== 'effort' && (
              <AnalyticsMetric
                icon="tabler:trophy"
                label={t('stats.bestValue')}
                unit={unit}
                value={summary.best}
              />
            )}
            <AnalyticsMetric
              detail={t('stats.completedSessions')}
              icon="tabler:calendar-check"
              label={t('stats.loggedSessions')}
              value={sessions.length}
            />
          </Grid>
          <TrendChart
            domain={activeMetric === 'effort' ? [0, 10] : undefined}
            invert={activeMetric === 'effort' && scale === 'rir'}
            points={points}
            title={title}
            unit={unit}
          />
          <Text as="h4" size="sm" weight="semibold">
            {t('stats.recentSessions')}
          </Text>
          <Stack gap="sm">
            {sessions
              .slice(-5)
              .reverse()
              .map(session => (
                <Flex
                  key={session.workout_id}
                  align="center"
                  bg={colorWithOpacity('muted', '5%')}
                  gap="md"
                  justify="between"
                  p="md"
                  r="lg"
                  wrap="wrap"
                >
                  <Stack flex="1" gap="xs">
                    <Text weight="medium">{session.date}</Text>
                    <Text color="muted" size="xs">
                      {t('stats.sessionSets', {
                        count: session.sets,
                        rated: session.rated
                      })}
                    </Text>
                  </Stack>
                  <Text className="zillion-gym-metric-value" weight="semibold">
                    {session[activeMetric] === null
                      ? '—'
                      : `${display(session[activeMetric])} ${unit}`}
                  </Text>
                  <Button
                    icon="tabler:arrow-up-right"
                    variant="plain"
                    onClick={() =>
                      navigate('history', { workout: session.workout_id })
                    }
                  >
                    viewWorkout
                  </Button>
                </Flex>
              ))}
          </Stack>
        </>
      ) : (
        <Text color="muted">
          {t(exercise ? 'stats.noMetricData' : 'stats.noTrend')}
        </Text>
      )}
    </Card>
  )
}
