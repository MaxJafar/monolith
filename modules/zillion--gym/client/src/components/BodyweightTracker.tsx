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
  TextInput,
  colorWithOpacity
} from '@lifeforge/ui'

import { useGym } from '@/GymContext'
import { forgeAPI } from '@/manifest'

import {
  analyticsRange,
  inAnalyticsRange,
  initialRange
} from '../utils/analytics'
import { weightDisplay, weightKg } from '../utils/workout'
import { AnalyticsMetric } from './AnalyticsMetric'
import { AnalyticsRangeControls } from './AnalyticsRangeControls'
import { TrendChart } from './TrendChart'

export function BodyweightTracker() {
  const { data, run, pending } = useGym()
  const { t } = useModuleTranslation()
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [weight, setWeight] = useState(0)
  const [notes, setNotes] = useState('')
  const [goal, setGoal] = useState<number | null>(null)
  const [rangeSelection, setRangeSelection] = useState(initialRange)

  if (!data) return null

  const unit = data.settings.unit
  const range = analyticsRange(rangeSelection, dayjs().format('YYYY-MM-DD'))
  const rows = data.bodyweight
    .filter(row => inAnalyticsRange(row.date, range))
    .sort((a, b) => a.date.localeCompare(b.date))
  const target = data.settings.target_weight_kg
    ? weightDisplay(data.settings.target_weight_kg, unit)
    : null
  const chartValues = rows.map(row => weightDisplay(row.weight_kg, unit))

  if (target !== null) chartValues.push(target)

  const domain: [number, number] | undefined = chartValues.length
    ? [Math.max(0, Math.min(...chartValues) - 1), Math.max(...chartValues) + 1]
    : undefined
  const latest = rows[rows.length - 1]
  const change =
    latest && rows.length > 1
      ? weightDisplay(latest.weight_kg - rows[0]!.weight_kg, unit)
      : null

  return (
    <Card gap="md">
      <Text as="h3" size="lg" weight="semibold">
        {t('stats.bodyweight')}
      </Text>
      <AnalyticsRangeControls
        value={rangeSelection}
        onChange={setRangeSelection}
      />
      <Grid gap="md" templateCols={{ base: 1, md: 3 }}>
        <AnalyticsMetric
          accent
          detail={latest?.date ?? t('stats.noWeighIns')}
          icon="tabler:scale"
          label={t('stats.latestInRange')}
          unit={unit}
          value={latest ? weightDisplay(latest.weight_kg, unit) : '—'}
        />
        <AnalyticsMetric
          icon="tabler:arrows-diff"
          label={t('stats.rangeChange')}
          unit={unit}
          value={change === null ? '—' : `${change > 0 ? '+' : ''}${change}`}
        />
        <AnalyticsMetric
          detail={target === null ? t('stats.noGoal') : undefined}
          icon="tabler:target"
          label={t('stats.targetWeight')}
          unit={unit}
          value={target ?? '—'}
        />
      </Grid>
      <TrendChart
        domain={domain}
        emptyLabel={t('stats.noWeighIns')}
        goal={target}
        points={rows.map(row => ({
          date: row.date,
          value: weightDisplay(row.weight_kg, unit)
        }))}
        showTitle={false}
        title={t('stats.bodyweight')}
        unit={unit}
      />
      {rows.length > 1 && (
        <Text>
          {t('stats.weightChange', {
            change: weightDisplay(
              rows[rows.length - 1]!.weight_kg - rows[0]!.weight_kg,
              unit
            ),
            unit,
            count: rows.length
          })}
        </Text>
      )}
      <Text as="h4" weight="semibold">
        {t('stats.weightLog')}
      </Text>
      <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
        <DateInput
          icon="tabler:calendar"
          label="inputs.date"
          value={dayjs(date).toDate()}
          onChange={value => {
            if (value) setDate(dayjs(value).format('YYYY-MM-DD'))
          }}
        />
        <NumberInput
          icon="tabler:scale"
          label={`${t('inputs.bodyweight')} (${unit})`}
          max={2000}
          min={0}
          namespace={false}
          value={weightDisplay(weight, unit)}
          onChange={value => setWeight(weightKg(value, unit))}
        />
        <TextInput
          icon="tabler:notes"
          label="inputs.notes"
          placeholder=""
          value={notes}
          onChange={setNotes}
        />
        <Button
          disabled={weight <= 0}
          loading={pending}
          onClick={() =>
            void run(() =>
              forgeAPI.saveBodyweight.mutate({
                date,
                weight_kg: weight,
                notes
              })
            )
          }
        >
          saveBodyweight
        </Button>
      </Grid>
      <Text color="muted">{t('stats.weightUpsert')}</Text>
      <Flex align="center" gap="md" wrap="wrap">
        <NumberInput
          icon="tabler:target"
          label={`${t('stats.targetWeight')} (${unit})`}
          max={2000}
          min={0}
          namespace={false}
          value={weightDisplay(
            goal ?? data.settings.target_weight_kg ?? 0,
            unit
          )}
          onChange={value => setGoal(weightKg(value, unit))}
        />
        <Button
          disabled={goal === null || pending}
          variant="secondary"
          onClick={() =>
            void run(async () => {
              await forgeAPI.updateSettings.mutate({
                ...data.settings,
                target_weight_kg: goal && goal > 0 ? goal : null,
                expected_revision: data.settings.revision
              })
              setGoal(null)
            })
          }
        >
          saveGoal
        </Button>
      </Flex>
      {data.settings.target_weight_kg && rows[rows.length - 1] && (
        <Text color="primary">
          {t('stats.goalDistance', {
            value: weightDisplay(
              Math.abs(
                rows[rows.length - 1]!.weight_kg -
                  data.settings.target_weight_kg
              ),
              unit
            ),
            unit
          })}
        </Text>
      )}
      {rows.length > 0 && (
        <Text as="h4" weight="semibold">
          {t('stats.weighInHistory')}
        </Text>
      )}
      <Stack gap="sm" maxHeight="18rem" overflowY="auto">
        {rows
          .slice()
          .reverse()
          .map(row => (
            <Flex
              key={row.id}
              align="center"
              bg={colorWithOpacity('muted', '5%')}
              gap="sm"
              justify="between"
              p="md"
              r="lg"
              wrap="wrap"
            >
              <Stack flex="1" gap="xs">
                <Text weight="medium">{row.date}</Text>
                {row.notes && (
                  <Text color="muted" size="sm">
                    {row.notes}
                  </Text>
                )}
              </Stack>
              <Text className="zillion-gym-metric-value" weight="semibold">
                {weightDisplay(row.weight_kg, unit)} {unit}
              </Text>
              <Flex gap="sm">
                <Button
                  variant="plain"
                  onClick={() => {
                    setDate(row.date)
                    setWeight(row.weight_kg)
                    setNotes(row.notes)
                  }}
                >
                  edit
                </Button>
                <Button
                  dangerous
                  disabled={pending}
                  variant="plain"
                  onClick={() => {
                    if (window.confirm(t('stats.confirmWeightDelete')))
                      void run(() =>
                        forgeAPI.removeBodyweight
                          .input({ id: row.id })
                          .mutate(undefined)
                      )
                  }}
                >
                  delete
                </Button>
              </Flex>
            </Flex>
          ))}
      </Stack>
    </Card>
  )
}
