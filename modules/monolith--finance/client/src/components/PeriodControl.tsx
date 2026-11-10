import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Text } from '@monolith/ui'

import { useFinance } from '../FinanceContext'
import { formatDate } from '../utils/format'
import { granularities } from '../utils/navigation'
import { Segmented } from './controls'

export function periodLabel(
  granularity: string,
  range: { from: string; to: string },
  locale: string
) {
  if (granularity === 'month')
    return formatDate(range.from, locale, { month: 'long', year: 'numeric' })
  if (granularity === 'year') return range.from.slice(0, 4)
  if (granularity === 'week')
    return `${formatDate(range.from, locale, { day: 'numeric', month: 'short' })} – ${formatDate(range.to, locale, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return `${formatDate(range.from, locale, { month: 'short', year: 'numeric' })} – ${formatDate(range.to, locale, { month: 'short', year: 'numeric' })}`
}

/** Week · Month · Year · All, with previous/next and a jump back to today. */
export function PeriodControl() {
  const { t } = useModuleTranslation()

  const {
    granularity,
    range,
    today,
    locale,
    setGranularity,
    shiftPeriod,
    resetPeriod
  } = useFinance()
  const current = today >= range.from && today <= range.to

  return (
    <Flex
      align="center"
      className="finance-period"
      gap="sm"
      justify="between"
      wrap="wrap"
    >
      <Segmented
        label={t('period.label')}
        options={granularities.map(value => ({
          value,
          label: t(`period.${value}`)
        }))}
        value={granularity}
        onChange={setGranularity}
      />
      <Flex align="center" gap="xs">
        {granularity !== 'all' && (
          <Button
            aria-label={t('period.previous')}
            icon="tabler:chevron-left"
            variant="plain"
            onClick={() => shiftPeriod(-1)}
          />
        )}
        <Text
          aria-live="polite"
          className="finance-period-label"
          weight="semibold"
        >
          {periodLabel(granularity, range, locale)}
        </Text>
        {granularity !== 'all' && (
          <Button
            aria-label={t('period.next')}
            icon="tabler:chevron-right"
            variant="plain"
            onClick={() => shiftPeriod(1)}
          />
        )}
        {!current && granularity !== 'all' && (
          <Button
            icon="tabler:calendar-event"
            variant="secondary"
            onClick={resetPeriod}
          >
            today
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

/** Axis and tooltip labels for a summary bucket. */
export function bucketLabels(start: string, bucket: string, locale: string) {
  if (bucket === 'day')
    return {
      label: formatDate(start, locale, { day: 'numeric' }),
      detail: formatDate(start, locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long'
      })
    }
  if (bucket === 'week')
    return {
      label: formatDate(start, locale, { day: 'numeric', month: 'short' }),
      detail: formatDate(start, locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }
  if (bucket === 'month')
    return {
      label: formatDate(start, locale, { month: 'short' }),
      detail: formatDate(start, locale, { month: 'long', year: 'numeric' })
    }

  return { label: start.slice(0, 4), detail: start.slice(0, 4) }
}
