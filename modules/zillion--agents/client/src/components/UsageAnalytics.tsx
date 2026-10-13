import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  COLORS,
  Card,
  Flex,
  Grid,
  HorizontalBarChart,
  LineChart,
  ProgressRing,
  Stack,
  Text
} from '@lifeforge/ui'

import type { UsageRecord } from '../../../shared'

type UsageTotals = {
  runs: number
  metered_runs: number
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  total_tokens: number
}

const number = (value: number) => new Intl.NumberFormat().format(value)
const compact = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)

export default function UsageAnalytics({
  totals,
  rows
}: {
  totals: UsageTotals
  rows: UsageRecord[]
}) {
  const { t } = useModuleTranslation()

  const chronologicalRows = [...rows].sort(
    (a, b) => dayjs(a.created).valueOf() - dayjs(b.created).valueOf()
  )
  const maximum = Math.max(1, ...rows.map(row => row.total_tokens ?? 0))
  const tickStep = 10 ** Math.floor(Math.log10(maximum))

  return (
    <Stack gap="md">
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <Card gap="md">
          <Text as="h3" weight="semibold">
            {t('metering.mix')}
          </Text>
          <HorizontalBarChart
            formatValue={number}
            label={t('metering.mix')}
            max={totals.total_tokens}
            points={[
              {
                label: t('metering.input'),
                value: totals.metered_runs ? totals.input_tokens : null
              },
              {
                label: t('metering.output'),
                value: totals.metered_runs ? totals.output_tokens : null,
                color: COLORS['blue-400']
              }
            ]}
          />
          <Text color="muted" size="sm">
            {totals.metered_runs
              ? t('metering.cachedHint', {
                  cached: number(totals.cached_input_tokens)
                })
              : t('metering.unknown')}
          </Text>
        </Card>
        <Card align="center" direction="row" gap="lg">
          <ProgressRing
            label={t('metering.metered')}
            max={totals.runs}
            value={totals.metered_runs}
            valueLabel={totals.runs ? undefined : '—'}
          />
          <Stack gap="xs">
            <Text as="h3" weight="semibold">
              {t('metering.metered')}
            </Text>
            <Text size="xl" weight="semibold">
              {number(totals.metered_runs)} / {number(totals.runs)}
            </Text>
            <Text color="muted" size="sm">
              {t('metering.meteredHint')}
            </Text>
          </Stack>
        </Card>
      </Grid>
      {chronologicalRows.length > 1 &&
        chronologicalRows.some(row => row.total_tokens !== null) && (
          <Card gap="sm">
            <Flex align="baseline" gap="sm" justify="between" wrap="wrap">
              <Text as="h3" weight="semibold">
                {t('metering.pageTrend')}
              </Text>
              <Text color="muted" size="sm">
                {t('metering.pageRuns', { count: rows.length })}
              </Text>
            </Flex>
            <Text color="muted" size="sm">
              {t('metering.pageTrendHint')}
            </Text>
            <LineChart
              domain={[0, Math.ceil((maximum * 1.1) / tickStep) * tickStep]}
              formatValue={compact}
              label={t('metering.pageTrend')}
              points={chronologicalRows.map(row => ({
                label: dayjs(row.created).format('MMM D HH:mm'),
                value: row.total_tokens,
                position: dayjs(row.created).valueOf(),
                detail: row.task_title
              }))}
            />
          </Card>
        )}
    </Stack>
  )
}
