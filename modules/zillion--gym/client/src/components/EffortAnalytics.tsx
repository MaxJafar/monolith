import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Card, Grid, HorizontalBarChart, Text } from '@lifeforge/ui'

import type { Settings, Workout } from '../../../shared'
import {
  type EffortScale,
  displayEffort,
  effortAnalytics,
  effortScale
} from '../utils/analytics'
import { AnalyticsMetric } from './AnalyticsMetric'
import { SelectInput } from './SelectInput'
import { TrendChart } from './TrendChart'

export function EffortAnalytics({
  workouts,
  preference
}: {
  workouts: Workout[]
  preference: Settings['effort']
}) {
  const { t } = useModuleTranslation()
  const [scaleChoice, setScaleChoice] = useState<EffortScale | ''>('')

  const scale = scaleChoice || effortScale(workouts, preference)
  const stats = effortAnalytics(workouts)

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('stats.effort')}
      </Text>
      <SelectInput
        label="stats.scale"
        options={(['rir', 'rpe'] as const).map(value => ({
          value,
          label: value.toUpperCase()
        }))}
        value={scale}
        onChange={setScaleChoice}
      />
      <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
        <AnalyticsMetric
          accent
          detail={t('stats.effortCoverage', {
            rated: stats.rated,
            done: stats.done
          })}
          icon="tabler:clipboard-check"
          label={t('stats.ratedSets')}
          value={stats.rated}
        />
        <AnalyticsMetric
          icon="tabler:activity"
          label={t('stats.averageEffort')}
          unit={scale.toUpperCase()}
          value={
            stats.average_rir === null
              ? '—'
              : displayEffort(stats.average_rir, scale)
          }
        />
        <AnalyticsMetric
          detail={t('stats.hardThreshold')}
          icon="tabler:flame"
          label={t('stats.hardSets')}
          unit={stats.hard_fraction === null ? undefined : '%'}
          value={
            stats.hard_fraction === null
              ? '—'
              : Math.round(stats.hard_fraction * 100)
          }
        />
      </Grid>
      <Text color="muted" size="sm">
        {t('stats.effortMinimum')}
      </Text>
      {preference === 'none' && (
        <Text color="muted">{t('stats.effortDisabled')}</Text>
      )}
      {stats.weeks.length > 0 && (
        <TrendChart
          domain={[0, 10]}
          invert={scale === 'rir'}
          points={stats.weeks.map(week => ({
            date: week.date,
            value: displayEffort(week.average_rir, scale),
            note: t('stats.effortWeekSets', {
              rated: week.rated,
              done: week.done
            })
          }))}
          title={t('stats.weeklyEffort')}
          unit={scale.toUpperCase()}
        />
      )}
      <Text as="h4" weight="semibold">
        {t('stats.effortHistogram')}
      </Text>
      <HorizontalBarChart
        emptyLabel={t('stats.noRatings')}
        label={t('stats.effortHistogram')}
        max={stats.rated}
        points={
          stats.rated
            ? stats.histogram.map(row => ({
                label: `${scale.toUpperCase()} ${row.rir === 4 ? (scale === 'rpe' ? '≤ 6' : '4+') : displayEffort(row.rir, scale)}`,
                value: row.sets,
                color:
                  row.rir <= 3
                    ? 'var(--color-custom-500)'
                    : 'var(--color-bg-500)',
                detail: t('stats.effortBin', {
                  count: row.sets,
                  share: Math.round((row.sets / stats.rated) * 100)
                })
              }))
            : []
        }
      />
    </Card>
  )
}
