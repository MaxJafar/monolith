import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import { Flex, Stack, Text } from '@monolith/ui'

import { useFinance } from '@/FinanceContext'
import { FinanceProvider } from '@/FinanceProvider'
import { CashflowChart } from '@/charts/CashflowChart'
import { bucketLabels, periodLabel } from '@/components/PeriodControl'
import { AnimatedValue } from '@/components/figures'
import '@/styles.css'

import { toNumber } from '../../../core/money'

function Pulse() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money, loading, error, locale } = finance

  if (loading) return <Text role="status">{t('loading')}</Text>
  if (error)
    return (
      <Text color="dangerous" role="alert">
        {error}
      </Text>
    )
  if (!data?.settings.configured)
    return <Text color="muted">{t('widgets.setupFirst')}</Text>
  if (!summary) return <Text role="status">{t('loading')}</Text>

  const shownIn = finance.toDisplay('1') ? finance.display : finance.base
  const value = (amount: string) =>
    toNumber(finance.toDisplay(amount) ?? amount)

  return (
    <Stack className="finance-root finance-widget" gap="md">
      <Flex align="baseline" gap="sm" justify="between" wrap="wrap">
        <Text color="muted" size="sm">
          {periodLabel(finance.granularity, finance.range, locale)}
        </Text>
        <AnimatedValue
          className="finance-widget-net"
          format={amount => money(amount, { sign: true })}
          value={summary.totals.net}
        />
      </Flex>
      <Flex className="finance-totals" gap="lg" wrap="wrap">
        <Stack className="finance-total" data-tone="income" gap="none">
          <Text color="muted" size="xs">
            {t('series.income')}
          </Text>
          <Text className="finance-figure" weight="semibold">
            {money(summary.totals.income_received)}
          </Text>
        </Stack>
        <Stack className="finance-total" data-tone="expense" gap="none">
          <Text color="muted" size="xs">
            {t('series.expense')}
          </Text>
          <Text className="finance-figure" weight="semibold">
            {money(summary.totals.expense)}
          </Text>
        </Stack>
      </Flex>
      <CashflowChart
        format={amount => finance.native(amount.toFixed(2), shownIn)}
        formatAxis={amount =>
          finance.native(amount.toFixed(2), shownIn, {
            compact: true,
            trim: true
          })
        }
        label={t('overview.cashflow')}
        points={summary.buckets.map(bucket => ({
          key: bucket.start,
          ...bucketLabels(bucket.start, summary.bucket, locale),
          income: value(bucket.income),
          expense: value(bucket.expense),
          net: value(bucket.net)
        }))}
      />
    </Stack>
  )
}

export default function FinancePulse() {
  return (
    <FinanceProvider>
      <Pulse />
    </FinanceProvider>
  )
}

export const config: WidgetConfig = {
  id: 'financePulse',
  icon: 'tabler:wallet'
}
