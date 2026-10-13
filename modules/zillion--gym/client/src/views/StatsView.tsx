import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Card,
  Flex,
  Grid,
  NumberInput,
  ProgressRing,
  Stack,
  Text,
  colorWithOpacity
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'

import type { Formula } from '../../../shared'
import { AnalyticsMetric } from '../components/AnalyticsMetric'
import { AnalyticsRangeControls } from '../components/AnalyticsRangeControls'
import { BodyweightTracker } from '../components/BodyweightTracker'
import { EffortAnalytics } from '../components/EffortAnalytics'
import { ExerciseProgress } from '../components/ExerciseProgress'
import { MuscleMap } from '../components/MuscleMap'
import { SelectInput } from '../components/SelectInput'
import {
  analyticsRange,
  completedInRange,
  estimateStrength,
  initialRange,
  muscleAnalytics,
  rangeTotals
} from '../utils/analytics'
import { clock, weightDisplay, weightKg } from '../utils/workout'

export default function StatsView() {
  const { data } = useGym()
  const { t } = useModuleTranslation()
  const [rangeSelection, setRangeSelection] = useState(initialRange)
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(5)
  const [formula, setFormula] = useState<Formula>('epley')

  if (!data) return null

  const { stats, settings } = data
  const range = analyticsRange(rangeSelection, dayjs().format('YYYY-MM-DD'))
  const workouts = completedInRange(data.workouts, range)
  const totals = rangeTotals(workouts)
  const muscles = muscleAnalytics(workouts)
  const estimate = estimateStrength(weight, reps, formula)
  const weekStart = dayjs()
    .subtract((dayjs().day() + 6) % 7, 'day')
    .format('YYYY-MM-DD')
  const weekCount = data.workouts.filter(
    workout =>
      workout.status === 'completed' &&
      workout.date >= weekStart &&
      workout.date <= dayjs().format('YYYY-MM-DD')
  ).length
  const days = Array.from({ length: 91 }, (_, index) =>
    dayjs()
      .subtract(90 - index, 'day')
      .format('YYYY-MM-DD')
  )
  const activityCounts = new Map(
    stats.heatmap.map(row => [row.date, row.workouts])
  )

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text as="h2" size="2xl" tracking="tight" weight="semibold">
          {t('sections.stats')}
        </Text>
        <Text color="muted">{t('stats.analyticsDescription')}</Text>
      </Stack>
      <Card gap="md">
        <AnalyticsRangeControls
          value={rangeSelection}
          onChange={setRangeSelection}
        />
        <Text color="muted" size="sm">
          {t('stats.rangeHelp')}
        </Text>
      </Card>
      <Grid gap="md" templateCols={{ base: 2, lg: 4 }}>
        <AnalyticsMetric
          accent
          detail={t('stats.completedSessions')}
          icon="tabler:calendar-check"
          label={t('stats.workouts')}
          value={totals.workouts}
        />
        <AnalyticsMetric
          detail={t('stats.completedOnly')}
          icon="tabler:checklist"
          label={t('stats.sets')}
          value={totals.sets}
        />
        <AnalyticsMetric
          detail={t('stats.strengthVolume')}
          icon="tabler:barbell"
          label={t('stats.volume')}
          unit={settings.unit}
          value={weightDisplay(totals.volume, settings.unit)}
        />
        <AnalyticsMetric
          detail={t('stats.sessionTime')}
          icon="tabler:clock"
          label={t('stats.duration')}
          value={clock(totals.duration)}
        />
      </Grid>
      <Card gap="md">
        <Text as="h3" size="lg" weight="semibold">
          {t('stats.consistency')}
        </Text>
        <Grid align="center" gap="lg" templateCols={{ base: 1, md: 2 }}>
          <Flex align="center" gap="lg" wrap="wrap">
            <ProgressRing
              label={t('stats.weeklyGoal', {
                count: weekCount,
                goal: settings.weekly_workout_goal
              })}
              max={settings.weekly_workout_goal}
              value={weekCount}
              valueLabel={`${weekCount}/${settings.weekly_workout_goal}`}
            />
            <Stack flex="1" gap="xs">
              <Text weight="semibold">
                {t('stats.weeklyGoal', {
                  count: weekCount,
                  goal: settings.weekly_workout_goal
                })}
              </Text>
              <Text color="primary" size="sm">
                {t(
                  weekCount >= settings.weekly_workout_goal
                    ? 'stats.goalReached'
                    : 'stats.remainingWorkouts',
                  {
                    count: Math.max(0, settings.weekly_workout_goal - weekCount)
                  }
                )}
              </Text>
              <Text color="muted" size="sm">
                {t('stats.weeklyStreak', { count: stats.streak_weeks })}
              </Text>
            </Stack>
          </Flex>
          <Stack gap="sm" maxWidth="28rem" width="100%">
            <Grid aria-label={t('stats.activity')} gap="xs" templateCols={13}>
              {days.map(date => {
                const count = activityCounts.get(date) ?? 0

                return (
                  <Box
                    key={date}
                    aria-label={`${date}: ${t('history.count', { count })}`}
                    aspectRatio="1"
                    bg={
                      count > 0
                        ? colorWithOpacity('primary', count > 1 ? '90%' : '50%')
                        : colorWithOpacity('muted', '10%')
                    }
                    r="sm"
                    role="img"
                    title={`${date}: ${t('history.count', { count })}`}
                  />
                )
              })}
            </Grid>
            <Flex align="center" gap="md" justify="between" wrap="wrap">
              <Text color="muted" size="xs">
                {days[0]} → {days[days.length - 1]}
              </Text>
              <Flex align="center" gap="md" wrap="wrap">
                {[
                  {
                    key: 'activityNone',
                    color: colorWithOpacity('muted', '10%')
                  },
                  {
                    key: 'activityOne',
                    color: colorWithOpacity('primary', '50%')
                  },
                  {
                    key: 'activityMany',
                    color: colorWithOpacity('primary', '90%')
                  }
                ].map(row => (
                  <Flex key={row.key} align="center" gap="xs">
                    <Box
                      aria-hidden="true"
                      bg={row.color}
                      height="0.75rem"
                      r="sm"
                      width="0.75rem"
                    />
                    <Text color="muted" size="xs">
                      {t(`stats.${row.key}`)}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
            <Text color="muted" size="xs">
              {t('stats.activityLegend')}
            </Text>
          </Stack>
        </Grid>
      </Card>
      <Card gap="md">
        <Text as="h3" size="lg" weight="semibold">
          {t('stats.muscleMap')}
        </Text>
        <Text color="muted" size="sm">
          {t('stats.muscleExplanation')}
        </Text>
        {workouts.length > 0 ? (
          <MuscleMap bodyStyle={settings.body_style} values={muscles} />
        ) : (
          <Text color="muted">{t('stats.noPeriodWorkouts')}</Text>
        )}
      </Card>
      <EffortAnalytics preference={settings.effort} workouts={workouts} />
      <BodyweightTracker />
      <ExerciseProgress range={range} />
      <Card gap="md">
        <Text as="h3" size="lg" weight="semibold">
          {t('stats.calculator')}
        </Text>
        <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
          <NumberInput
            icon="tabler:barbell"
            label={`${t('inputs.weight')} (${settings.unit})`}
            min={0}
            namespace={false}
            value={weightDisplay(weight, settings.unit)}
            onChange={value => setWeight(weightKg(value, settings.unit))}
          />
          <NumberInput
            icon="tabler:hash"
            label="inputs.reps"
            max={12}
            min={1}
            value={reps}
            onChange={setReps}
          />
          <SelectInput
            label="inputs.formula"
            options={(['epley', 'brzycki', 'lombardi'] as const).map(value => ({
              value,
              label: t(`formulas.${value}`)
            }))}
            value={formula}
            onChange={setFormula}
          />
        </Grid>
        <AnalyticsMetric
          accent
          icon="tabler:trophy"
          label={t('stats.estimate_kg')}
          unit={settings.unit}
          value={
            estimate === null ? '—' : weightDisplay(estimate, settings.unit)
          }
        />
        <Text color="muted" size="sm">
          {t('stats.estimateCaution')}
        </Text>
        {stats.records.length > 0 && (
          <Text as="h4" weight="semibold">
            {t('stats.records')}
          </Text>
        )}
        {stats.records.map(record => (
          <Flex
            key={record.exercise_id}
            align="center"
            bg={colorWithOpacity('muted', '5%')}
            gap="md"
            justify="between"
            p="md"
            r="lg"
            wrap="wrap"
          >
            <Stack flex="1" gap="xs">
              <Text weight="medium">{record.name}</Text>
              <Text color="muted" size="xs">
                {record.date}
              </Text>
            </Stack>
            <Text
              className="zillion-gym-metric-value"
              color="primary"
              weight="semibold"
            >
              {weightDisplay(record.estimate_kg, settings.unit)} {settings.unit}{' '}
              · {record.reps} × {weightDisplay(record.weight_kg, settings.unit)}
            </Text>
          </Flex>
        ))}
      </Card>
    </Stack>
  )
}
