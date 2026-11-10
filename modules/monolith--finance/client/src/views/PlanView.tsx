import { type CSSProperties, useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, NumberInput, Stack, Text } from '@monolith/ui'

import { decimalsOf } from '../../../core/currencies'
import {
  type Dec,
  div,
  isPositive,
  mulRound,
  toNumber
} from '../../../core/money'
import {
  type Compounding,
  depositGrowth,
  perYear,
  projectYear
} from '../../../core/schedule'
import type { Recurring } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { CashflowChart } from '../charts/CashflowChart'
import { TrendArea } from '../charts/TrendArea'
import { bucketLabels } from '../components/PeriodControl'
import { AmountInput, CategoryIcon, SelectInput } from '../components/controls'
import { StatTile } from '../components/figures'
import { useEditors } from '../editors/useEditors'
import { plannedItems } from '../utils/breakdown'
import { formatDate, formatPercent } from '../utils/format'

export default function PlanView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()
  const [year, setYear] = useState(Number(finance.today.slice(0, 4)))

  const { data, book, money, locale } = finance

  if (!data || !book) return null

  const plan = projectYear(plannedItems(finance), year, book)
  const shownIn = finance.toDisplay('1') ? finance.display : finance.base
  const value = (amount: Dec) => toNumber(finance.toDisplay(amount) ?? amount)
  const inDisplay = (amount: number) =>
    finance.native(amount.toFixed(2), shownIn)
  const axis = (amount: number) =>
    finance.native(amount.toFixed(2), shownIn, { compact: true, trim: true })
  const rate = isPositive(plan.totals.income_received)
    ? toNumber(div(plan.totals.net, plan.totals.income_received, 6))
    : null

  return (
    <>
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Flex align="center" gap="xs">
          <Button
            aria-label={t('period.previous')}
            icon="tabler:chevron-left"
            variant="plain"
            onClick={() => setYear(year - 1)}
          />
          <Text className="finance-period-label" weight="semibold">
            {t('plan.yearTitle', { year })}
          </Text>
          <Button
            aria-label={t('period.next')}
            icon="tabler:chevron-right"
            variant="plain"
            onClick={() => setYear(year + 1)}
          />
        </Flex>
        <Flex gap="sm" wrap="wrap">
          <Button
            icon="tabler:plus"
            variant="secondary"
            onClick={() => editors.plan(undefined, { kind: 'income' })}
          >
            addPlannedIncome
          </Button>
          <Button
            icon="tabler:plus"
            onClick={() => editors.plan(undefined, { kind: 'expense' })}
          >
            addBill
          </Button>
        </Flex>
      </Flex>

      <div className="finance-tiles">
        <StatTile
          format={v => money(v)}
          icon="tabler:arrow-up-right"
          index={0}
          label={t('plan.income')}
          tone="income"
          value={plan.totals.income_received}
        >
          <Text color="muted" size="xs">
            {t('plan.perMonth', {
              value: money(div(plan.totals.income_received, '12', 2))
            })}
          </Text>
        </StatTile>
        <StatTile
          format={v => money(v)}
          icon="tabler:arrow-down-right"
          index={1}
          label={t('plan.expenses')}
          tone="expense"
          value={plan.totals.expense}
        >
          <Text color="muted" size="xs">
            {t('plan.perMonth', {
              value: money(div(plan.totals.expense, '12', 2))
            })}
          </Text>
        </StatTile>
        <StatTile
          format={v => money(v)}
          icon="tabler:receipt-tax"
          index={2}
          label={t('plan.taxes')}
          tone="accent"
          value={plan.totals.income_tax}
        >
          <Text color="muted" size="xs">
            {t('plan.taxSplit', {
              reserve: money(plan.totals.tax_reserve),
              vat: money(plan.totals.vat)
            })}
          </Text>
        </StatTile>
        <StatTile
          format={v => money(v, { sign: true })}
          icon="tabler:pig-money"
          index={3}
          label={t('plan.savings')}
          tone="net"
          value={plan.totals.net}
        >
          {rate !== null && (
            <Text color="muted" size="xs">
              {t('overview.savingsRate', { rate: formatPercent(rate, locale) })}
            </Text>
          )}
        </StatTile>
      </div>

      <Card
        className="finance-rise"
        gap="sm"
        style={{ '--i': 4 } as CSSProperties}
      >
        <CashflowChart
          format={inDisplay}
          formatAxis={axis}
          label={t('plan.chart', { year })}
          points={plan.months.map(month => ({
            key: month.month,
            ...bucketLabels(month.month, 'month', locale),
            income: value(month.income_received),
            expense: value(month.expense),
            net: value(month.net)
          }))}
        />
        {plan.unpriced > 0 && (
          <Text color="muted" size="xs">
            {t('plan.unpriced', { count: plan.unpriced })}
          </Text>
        )}
      </Card>

      <div className="finance-pair">
        {(['income', 'expense'] as const).map(kind => {
          const items = data.recurring.filter(item => item.kind === kind)

          return (
            <Card key={kind} gap="md">
              <Text as="h2" size="lg" weight="semibold">
                {t(
                  kind === 'income' ? 'plan.incomeItems' : 'plan.expenseItems'
                )}
              </Text>
              {items.length ? (
                <ul className="finance-list">
                  {items.map(item => (
                    <PlanRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <Text color="muted" size="sm">
                  {t(kind === 'income' ? 'plan.noIncome' : 'plan.noExpenses')}
                </Text>
              )}
            </Card>
          )
        })}
      </div>

      <DepositCalculator />
    </>
  )
}

function PlanRow({ item }: { item: Recurring }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const category = item.category_id
    ? finance.categoriesById.get(item.category_id)
    : undefined
  const parent = category?.parent_id
    ? finance.categoriesById.get(category.parent_id)
    : undefined
  const yearly = mulRound(
    item.amount,
    perYear(item.cadence, item.interval),
    decimalsOf(item.currency)
  )
  const due = item.active && item.next_on && item.next_on <= finance.today
  const cadence =
    item.interval > 1
      ? t(`cadence.every.${item.cadence}`, { count: item.interval })
      : t(`cadence.${item.cadence}`)

  return (
    <li data-inactive={!item.active || undefined}>
      <CategoryIcon
        color={category?.color || parent?.color}
        icon={
          category?.icon ||
          parent?.icon ||
          (item.kind === 'income'
            ? 'tabler:briefcase'
            : 'tabler:calendar-repeat')
        }
        size={32}
      />
      <button
        className="finance-list-main finance-link"
        type="button"
        onClick={() => editors.plan(item)}
      >
        <Text size="sm" weight="medium">
          {item.title}
        </Text>
        <Text color={due ? 'dangerous' : 'muted'} size="xs">
          {[
            cadence,
            !item.active
              ? t('plan.paused')
              : due
                ? t('plan.due')
                : item.next_on
                  ? t('plan.next', {
                      date: formatDate(item.next_on, finance.locale, {
                        day: 'numeric',
                        month: 'short'
                      })
                    })
                  : t('plan.ended'),
            item.auto_post ? t('plan.auto') : ''
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </button>
      <Stack align="end" gap="none">
        <Text
          className="finance-figure"
          data-kind={item.kind}
          size="sm"
          weight="semibold"
        >
          {finance.native(item.amount, item.currency)}
        </Text>
        <Text color="muted" size="xs">
          {t('plan.yearly', {
            value: finance.native(yearly, item.currency, { compact: true })
          })}
        </Text>
      </Stack>
      {item.active && item.next_on && (
        <Button
          aria-label={t('plan.recordNow', { title: item.title })}
          icon="tabler:check"
          variant="plain"
          onClick={() =>
            void finance.run(() =>
              workspaceAPI.plan.post.mutate({
                id: item.id,
                today: finance.today,
                automatic: false
              })
            )
          }
        />
      )}
    </li>
  )
}

function DepositCalculator() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const [principal, setPrincipal] = useState<string | null>('10000')
  const [rate, setRate] = useState<string | null>('10.5')
  const [months, setMonths] = useState(12)
  const [compounding, setCompounding] = useState<Compounding>('maturity')
  const [contribution, setContribution] = useState<string | null>('0')
  const [tax, setTax] = useState<string | null>('0')

  const currency = finance.base
  const result =
    principal && rate
      ? depositGrowth({
          principal,
          rate,
          months,
          compounding,
          contribution: contribution ?? '0',
          tax_rate: tax ?? '0',
          currency
        })
      : null
  const shown = (amount: Dec) => finance.native(amount, currency)

  return (
    <Card gap="md">
      <Stack gap="xs">
        <Text as="h2" size="lg" weight="semibold">
          {t('deposit.title')}
        </Text>
        <Text color="muted" size="sm">
          {t('deposit.help')}
        </Text>
      </Stack>
      <div className="finance-fields" data-columns="3">
        <AmountInput
          label="principal"
          suffix={currency}
          value={principal}
          onChange={setPrincipal}
        />
        <AmountInput
          icon="tabler:percentage"
          label="annualRate"
          suffix="%"
          value={rate}
          onChange={setRate}
        />
        <NumberInput
          icon="tabler:calendar"
          label="months"
          max={600}
          min={1}
          value={months}
          onChange={value =>
            setMonths(Math.max(1, Math.min(600, Math.round(value || 1))))
          }
        />
        <SelectInput
          icon="tabler:refresh"
          label="compounding"
          options={(
            ['maturity', 'monthly', 'quarterly', 'yearly'] as const
          ).map(value => ({ value, label: t(`deposit.compounding.${value}`) }))}
          value={compounding}
          onChange={setCompounding}
        />
        <AmountInput
          label="monthlyContribution"
          suffix={currency}
          value={contribution}
          onChange={setContribution}
        />
        <AmountInput
          icon="tabler:receipt-tax"
          label="interestTax"
          suffix="%"
          value={tax}
          onChange={setTax}
        />
      </div>
      {result && (
        <>
          <Flex className="finance-totals" gap="lg" wrap="wrap">
            {[
              ['deposit.contributed', result.contributed, 'neutral'],
              ['deposit.interest', result.interest, 'income'],
              ['deposit.tax', result.tax, 'accent'],
              ['deposit.final', result.final, 'net']
            ].map(([label, amount, tone]) => (
              <Stack
                key={label}
                className="finance-total"
                data-tone={tone}
                gap="none"
              >
                <Text color="muted" size="xs">
                  {t(label!)}
                </Text>
                <Text className="finance-figure" weight="semibold">
                  {shown(amount!)}
                </Text>
              </Stack>
            ))}
          </Flex>
          {result.rows.length > 2 && (
            <TrendArea
              format={amount => finance.native(amount.toFixed(2), currency)}
              formatAxis={amount =>
                finance.native(amount.toFixed(2), currency, {
                  compact: true,
                  trim: true
                })
              }
              label={t('deposit.growth')}
              points={result.rows.map(row => ({
                key: String(row.month),
                label: String(row.month),
                detail: t('deposit.month', { month: row.month }),
                value: toNumber(row.balance)
              }))}
              series="income"
            />
          )}
        </>
      )}
    </Card>
  )
}
