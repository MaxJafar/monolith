import { type CSSProperties, useState } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import {
  type Dec,
  add,
  cmp,
  div,
  isPositive,
  toNumber
} from '../../../core/money'
import { addDays } from '../../../core/periods'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { CashflowChart } from '../charts/CashflowChart'
import { Donut } from '../charts/Donut'
import { Meter, Spark, TrendArea } from '../charts/TrendArea'
import { PeriodControl, bucketLabels } from '../components/PeriodControl'
import { CategoryIcon, Loading } from '../components/controls'
import { AnimatedValue, Delta, StatTile } from '../components/figures'
import { useEditors } from '../editors/useEditors'
import {
  type Breakdown,
  budgetFactor,
  projection,
  rollUp,
  slices
} from '../utils/breakdown'
import { formatDate, formatPercent } from '../utils/format'
import { sectionParams } from '../utils/navigation'
import { accountIcons } from '../utils/options'

export default function OverviewView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data } = finance

  if (!data) return null

  return (
    <>
      <PeriodControl />
      {!summary ? <Loading label={t('loading')} /> : <Dashboard />}
    </>
  )
}

function Dashboard() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money, locale } = finance
  const chartNumber = (value: Dec) =>
    toNumber(finance.toDisplay(value) ?? value)

  if (!summary || !data) return null

  const totals = summary.totals
  const previous = summary.previous
  const display = (value: Dec | null) => money(value)
  const net = finance.shownDifference(totals.income_received, totals.expense)
  const savingsRate = isPositive(totals.income_received)
    ? toNumber(div(totals.net, totals.income_received, 6))
    : null
  const netWorthNow = add(
    '0',
    ...data.accounts
      .filter(account => account.include_in_net_worth && account.base_balance)
      .map(account => account.base_balance!)
  )
  const flow = summary.buckets.map(bucket => ({
    key: bucket.start,
    ...bucketLabels(bucket.start, summary.bucket, locale),
    income: chartNumber(bucket.income),
    expense: chartNumber(bucket.expense),
    net: chartNumber(bucket.net)
  }))
  const worth = summary.net_worth.map(point => ({
    key: point.start,
    ...bucketLabels(point.start, summary.bucket, locale),
    value: chartNumber(point.value)
  }))
  // Chart values are already in the display currency (or the base without a rate).
  const shownIn = finance.toDisplay('1') ? finance.display : finance.base
  const inDisplay = (value: number) => finance.native(value.toFixed(2), shownIn)
  const axis = (value: number) =>
    finance.native(value.toFixed(2), shownIn, { compact: true, trim: true })

  return (
    <>
      <section
        className="finance-hero finance-rise"
        data-tone={cmp(totals.net, '0') < 0 ? 'expense' : 'income'}
      >
        <Stack gap="xs">
          <Text color="muted" size="sm">
            {t('overview.net')}
          </Text>
          <AnimatedValue
            className="finance-hero-value"
            format={value => finance.native(value, net.code, { sign: true })}
            value={net.value}
          />
          <Flex align="center" gap="md" wrap="wrap">
            <Delta
              current={totals.net}
              locale={locale}
              previous={previous?.net}
            />
            {savingsRate !== null && (
              <Text color="muted" size="sm">
                {t('overview.savingsRate', {
                  rate: formatPercent(savingsRate, locale)
                })}
              </Text>
            )}
          </Flex>
        </Stack>
        <SavingsRing rate={savingsRate} />
      </section>

      <div className="finance-tiles">
        <StatTile
          delta={
            <Delta
              current={totals.income_received}
              locale={locale}
              previous={previous?.income_received}
            />
          }
          format={display}
          icon="tabler:arrow-up-right"
          index={0}
          label={t('overview.income')}
          tone="income"
          value={totals.income_received}
        >
          {totals.income_tax !== '0' && (
            <Text color="muted" size="xs">
              {t('overview.grossAndTax', {
                gross: money(totals.income_gross),
                tax: money(totals.income_tax)
              })}
            </Text>
          )}
        </StatTile>
        <StatTile
          delta={
            <Delta
              current={totals.expense}
              goodWhenUp={false}
              locale={locale}
              previous={previous?.expense}
            />
          }
          format={display}
          icon="tabler:arrow-down-right"
          index={1}
          label={t('overview.spending')}
          tone="expense"
          value={totals.expense}
        >
          {totals.vat !== '0' && (
            <Text color="muted" size="xs">
              {t('overview.vatIncluded', { vat: money(totals.vat) })}
            </Text>
          )}
        </StatTile>
        <StatTile
          format={display}
          icon="tabler:receipt-tax"
          index={2}
          label={t('overview.taxReserve')}
          tone="accent"
          value={totals.tax_reserve}
        >
          <Text color="muted" size="xs">
            {t('overview.taxReserveHelp')}
          </Text>
        </StatTile>
        <StatTile
          format={display}
          icon="tabler:building-bank"
          index={3}
          label={t('overview.netWorth')}
          tone="net"
          value={netWorthNow}
        >
          <Spark values={worth.map(point => point.value)} />
        </StatTile>
      </div>

      <Card className="finance-rise" style={{ '--i': 4 } as CSSProperties}>
        <CashflowChart
          format={inDisplay}
          formatAxis={axis}
          label={t('overview.cashflow')}
          points={flow}
        />
      </Card>

      <div className="finance-pair">
        <SpendingCard />
        <IncomeCard />
      </div>

      <AccountsStrip />

      <div className="finance-pair">
        <UpcomingCard />
        <WishlistCard />
      </div>

      {worth.length > 1 && (
        <Card className="finance-rise" style={{ '--i': 9 } as CSSProperties}>
          <TrendArea
            format={inDisplay}
            formatAxis={axis}
            label={t('overview.netWorthTrend')}
            note={
              summary.net_worth_unpriced
                ? t('overview.unpriced', { count: summary.net_worth_unpriced })
                : t('overview.netWorthNote')
            }
            points={worth}
          />
        </Card>
      )}
    </>
  )
}

function SpendingCard() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money } = finance
  const chartNumber = (value: Dec) =>
    toNumber(finance.toDisplay(value) ?? value)

  const editors = useEditors()
  const [active, setActive] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  if (!summary || !data) return null

  const groups = rollUp(
    finance,
    summary,
    'expense',
    budgetFactor(finance.granularity, finance.range),
    t('labels.uncategorized')
  )
  const shown = slices(groups, 7, t('labels.other'))
  const total = add('0', ...groups.map(group => group.amount))
  const focus = shown.find(slice => slice.id === active)

  return (
    <Card
      className="finance-rise"
      gap="md"
      style={{ '--i': 5 } as CSSProperties}
    >
      <Flex align="center" justify="between">
        <Text as="h2" size="lg" weight="semibold">
          {t('overview.byCategory')}
        </Text>
        <Button
          icon="tabler:plus"
          variant="plain"
          onClick={() => editors.transaction(undefined, { kind: 'expense' })}
        >
          addExpense
        </Button>
      </Flex>
      {groups.length ? (
        <div className="finance-breakdown">
          <Donut
            activeId={active}
            caption={focus ? focus.label : t('overview.spending')}
            center={money(focus ? focus.amount : total, { compact: true })}
            label={t('overview.byCategory')}
            slices={shown.map(slice => ({
              id: slice.id,
              label: slice.label,
              value: chartNumber(slice.amount),
              color: slice.color
            }))}
            onActivate={setActive}
          />
          <ul className="finance-legend-list">
            {groups.map(group => (
              <BreakdownRow
                key={group.id}
                expanded={open === group.id}
                group={group}
                share={
                  isPositive(total)
                    ? toNumber(group.amount) / toNumber(total)
                    : 0
                }
                onFocus={setActive}
                onToggle={() => setOpen(open === group.id ? null : group.id)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <Text color="muted">{t('overview.noSpending')}</Text>
      )}
    </Card>
  )
}

function BreakdownRow({
  group,
  share,
  expanded,
  onToggle,
  onFocus
}: {
  group: Breakdown
  share: number
  expanded: boolean
  onToggle: () => void
  onFocus: (id: string | null) => void
}) {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { money, locale } = finance
  const ratio =
    group.budget && isPositive(group.budget)
      ? toNumber(group.amount) / toNumber(group.budget)
      : null

  return (
    <li
      className="finance-legend-row"
      onBlur={() => onFocus(null)}
      onFocus={() => onFocus(group.id)}
      onPointerEnter={() => onFocus(group.id)}
      onPointerLeave={() => onFocus(null)}
    >
      <button
        aria-expanded={group.children.length ? expanded : undefined}
        className="finance-legend-button"
        disabled={!group.children.length}
        type="button"
        onClick={onToggle}
      >
        <CategoryIcon color={group.color} icon={group.icon} size={30} />
        <span className="finance-legend-name">
          <Text size="sm" weight="medium">
            {group.label}
          </Text>
          <Text color="muted" size="xs">
            {formatPercent(share, locale)} ·{' '}
            {t('labels.count', { count: group.count })}
          </Text>
        </span>
        <Text className="finance-figure" size="sm" weight="semibold">
          {money(group.amount)}
        </Text>
      </button>
      {ratio !== null && (
        <Flex align="center" gap="sm">
          <Meter
            label={t('overview.budgetUsed', {
              share: formatPercent(ratio, locale)
            })}
            ratio={ratio}
          />
          <Text color="muted" size="xs" whiteSpace="nowrap">
            {t('overview.ofBudget', {
              budget: money(group.budget, { compact: true })
            })}
          </Text>
        </Flex>
      )}
      {expanded && (
        <ul className="finance-legend-children">
          {group.children.map(child => (
            <li key={child.id}>
              <CategoryIcon color={child.color} icon={child.icon} size={22} />
              <Text size="sm">{child.label}</Text>
              <Text className="finance-figure" color="muted" size="sm">
                {money(child.amount)}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function IncomeCard() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money } = finance
  const chartNumber = (value: Dec) =>
    toNumber(finance.toDisplay(value) ?? value)

  const editors = useEditors()

  if (!summary || !data) return null

  const streams = rollUp(
    finance,
    summary,
    'income',
    '1',
    t('labels.uncategorized')
  )
  const top =
    streams.reduce(
      (best, stream) => Math.max(best, chartNumber(stream.gross)),
      0
    ) || 1

  return (
    <Card
      className="finance-rise"
      gap="md"
      style={{ '--i': 6 } as CSSProperties}
    >
      <Flex align="center" justify="between">
        <Text as="h2" size="lg" weight="semibold">
          {t('overview.streams')}
        </Text>
        <Button
          icon="tabler:plus"
          variant="plain"
          onClick={() => editors.transaction(undefined, { kind: 'income' })}
        >
          addIncome
        </Button>
      </Flex>
      {streams.length ? (
        <ul className="finance-streams">
          {streams.map((stream, index) => {
            const gross = chartNumber(stream.gross)
            const tax = chartNumber(stream.tax)

            return (
              <li key={stream.id} style={{ '--i': index } as CSSProperties}>
                <Flex align="center" gap="sm" justify="between">
                  <Flex align="center" gap="sm" minWidth="0">
                    <CategoryIcon
                      color={stream.color}
                      icon={stream.icon}
                      size={28}
                    />
                    <Text size="sm" weight="medium">
                      {stream.label}
                    </Text>
                  </Flex>
                  <Text className="finance-figure" size="sm" weight="semibold">
                    {money(stream.gross)}
                  </Text>
                </Flex>
                <div
                  aria-label={t('overview.streamSplit', {
                    net: money(add(stream.gross, `-${stream.tax}`)),
                    tax: money(stream.tax)
                  })}
                  className="finance-split"
                  role="img"
                  style={{ width: `${Math.max(4, (gross / top) * 100)}%` }}
                >
                  <span
                    data-series="income"
                    style={{ flexGrow: Math.max(0, gross - tax) }}
                  />
                  {tax > 0 && (
                    <span data-series="accent" style={{ flexGrow: tax }} />
                  )}
                </div>
                {tax > 0 && (
                  <Text color="muted" size="xs">
                    {t('overview.streamTax', { tax: money(stream.tax) })}
                  </Text>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <Text color="muted">{t('overview.noIncome')}</Text>
      )}
    </Card>
  )
}

function AccountsStrip() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money } = finance

  if (!summary || !data) return null

  const accounts = data.accounts.filter(account => !account.archived)

  if (!accounts.length) return null

  return (
    <Stack
      className="finance-rise"
      gap="sm"
      style={{ '--i': 7 } as CSSProperties}
    >
      <Flex align="center" justify="between">
        <Text as="h2" size="lg" weight="semibold">
          {t('sections.accounts')}
        </Text>
        <Button
          as={Link}
          icon="tabler:arrow-right"
          iconPosition="end"
          to={{
            search: sectionParams('accounts', {}, finance.params).toString()
          }}
          variant="plain"
        >
          viewAll
        </Button>
      </Flex>
      <div className="finance-account-strip">
        {accounts.map(account => (
          <article key={account.id} className="finance-account-chip">
            <CategoryIcon
              color={account.color}
              icon={account.icon || accountIcons[account.kind]!}
              size={32}
            />
            <span>
              <Text size="sm" weight="medium">
                {account.name}
              </Text>
              <Text className="finance-figure" weight="semibold">
                {finance.native(account.balance, account.currency)}
              </Text>
              {account.currency !== finance.display && account.base_balance && (
                <Text color="muted" size="xs">
                  ≈ {money(account.base_balance)}
                </Text>
              )}
            </span>
          </article>
        ))}
      </div>
    </Stack>
  )
}

function UpcomingCard() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, locale } = finance

  const editors = useEditors()

  if (!summary || !data) return null

  const horizon = addDays(finance.today, 31)
  const items = data.recurring
    .filter(item => item.active && item.next_on && item.next_on <= horizon)
    .sort((a, b) => (a.next_on! < b.next_on! ? -1 : 1))
    .slice(0, 6)

  return (
    <Card
      className="finance-rise"
      gap="md"
      style={{ '--i': 8 } as CSSProperties}
    >
      <Flex align="center" justify="between">
        <Text as="h2" size="lg" weight="semibold">
          {t('overview.upcoming')}
        </Text>
        <Button
          as={Link}
          icon="tabler:arrow-right"
          iconPosition="end"
          to={{ search: sectionParams('plan', {}, finance.params).toString() }}
          variant="plain"
        >
          viewPlan
        </Button>
      </Flex>
      {items.length ? (
        <ul className="finance-list">
          {items.map(item => {
            const look = item.category_id
              ? finance.categoriesById.get(item.category_id)
              : undefined
            const due = item.next_on! <= finance.today

            return (
              <li key={item.id}>
                <CategoryIcon
                  color={look?.color}
                  icon={
                    look?.icon ||
                    (item.kind === 'income'
                      ? 'tabler:arrow-up-right'
                      : 'tabler:calendar-repeat')
                  }
                  size={30}
                />
                <span className="finance-list-main">
                  <Text size="sm" weight="medium">
                    {item.title}
                  </Text>
                  <Text color={due ? 'dangerous' : 'muted'} size="xs">
                    {due
                      ? t('plan.due')
                      : formatDate(item.next_on!, locale, {
                          day: 'numeric',
                          month: 'short'
                        })}
                  </Text>
                </span>
                <Text
                  className="finance-figure"
                  data-kind={item.kind}
                  size="sm"
                  weight="semibold"
                >
                  {finance.native(
                    item.kind === 'income' ? item.amount : `-${item.amount}`,
                    item.currency,
                    { sign: true }
                  )}
                </Text>
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
              </li>
            )
          })}
        </ul>
      ) : (
        <Stack gap="sm">
          <Text color="muted">{t('overview.noUpcoming')}</Text>
          <Button
            icon="tabler:plus"
            variant="secondary"
            onClick={() => editors.plan()}
          >
            addPlan
          </Button>
        </Stack>
      )}
    </Card>
  )
}

function WishlistCard() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const { summary, data, money } = finance

  if (!summary || !data) return null

  const wanted = data.wishes.filter(item => item.status === 'wanted')
  const total = add('0', ...wanted.map(item => item.base_total ?? '0'))
  const plan = projection(finance, Number(finance.today.slice(0, 4)))
  const monthly =
    plan && isPositive(plan.totals.net) ? div(plan.totals.net, '12', 2) : null
  const months =
    monthly && isPositive(total)
      ? Math.ceil(toNumber(total) / toNumber(monthly))
      : null
  const rank = { high: 0, medium: 1, low: 2 }
  const top = [...wanted]
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .slice(0, 4)

  return (
    <Card
      className="finance-rise"
      gap="md"
      style={{ '--i': 8 } as CSSProperties}
    >
      <Flex align="center" justify="between">
        <Text as="h2" size="lg" weight="semibold">
          {t('sections.wishlist')}
        </Text>
        <Button
          as={Link}
          icon="tabler:arrow-right"
          iconPosition="end"
          to={{
            search: sectionParams('wishlist', {}, finance.params).toString()
          }}
          variant="plain"
        >
          viewAll
        </Button>
      </Flex>
      <Flex align="baseline" gap="sm" wrap="wrap">
        <Text className="finance-figure" size="2xl" weight="semibold">
          {money(total)}
        </Text>
        <Text color="muted" size="sm">
          {t('wishlist.itemsWanted', { count: wanted.length })}
        </Text>
      </Flex>
      {months !== null && (
        <Text color="muted" size="sm">
          {t('wishlist.monthsToAfford', { count: months })}
        </Text>
      )}
      <ul className="finance-list">
        {top.map(item => (
          <li key={item.id}>
            <CategoryIcon
              color={finance.listsById.get(item.list_id ?? '')?.color}
              icon={
                finance.listsById.get(item.list_id ?? '')?.icon || 'tabler:gift'
              }
              size={28}
            />
            <span className="finance-list-main">
              <Text size="sm" weight="medium">
                {item.name}
              </Text>
              <Text color="muted" size="xs">
                {t(`priority.${item.priority}`)}
              </Text>
            </span>
            <Text className="finance-figure" size="sm" weight="semibold">
              {finance.native(item.total, item.currency)}
            </Text>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SavingsRing({ rate }: { rate: number | null }) {
  const { t } = useModuleTranslation()
  const { locale } = useFinance()

  if (rate === null) return null

  const clamped = Math.max(0, Math.min(1, rate))
  const r = 34
  const c = 2 * Math.PI * r

  return (
    <div
      className="finance-ring"
      data-tone={rate < 0 ? 'expense' : rate >= 0.2 ? 'income' : 'accent'}
    >
      <svg aria-hidden="true" viewBox="0 0 80 80">
        <circle className="finance-ring-track" cx="40" cy="40" r={r} />
        <circle
          className="finance-ring-fill"
          cx="40"
          cy="40"
          r={r}
          style={
            {
              '--len': `${clamped * c}px`,
              '--circ': `${c}px`,
              strokeDasharray: `${clamped * c} ${c}`
            } as CSSProperties
          }
        />
      </svg>
      <span>
        <Text weight="semibold">{formatPercent(rate, locale)}</Text>
        <Text color="muted" size="xs">
          {t('overview.saved')}
        </Text>
      </span>
    </div>
  )
}
