import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type CSSProperties, useMemo } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, SearchInput, Stack, Text } from '@monolith/ui'

import { type Dec, add, sub } from '../../../core/money'
import type { Transaction } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { PeriodControl } from '../components/PeriodControl'
import {
  CategoryIcon,
  Loading,
  Segmented,
  SelectInput
} from '../components/controls'
import { useEditors } from '../editors/useEditors'
import { formatDate } from '../utils/format'
import {
  accountOptions,
  categoryLabel,
  categoryLook,
  categoryOptions,
  kindIcons
} from '../utils/options'

type KindFilter = 'all' | Transaction['kind']

export default function ActivityView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const { range, ownerId, params, updateParams, money } = finance
  const requested = params.get('kind')
  const kind: KindFilter =
    requested === 'expense' ||
    requested === 'income' ||
    requested === 'transfer'
      ? requested
      : 'all'
  const accountId = params.get('account') ?? ''
  const categoryId = params.get('category') ?? ''
  const search = (params.get('q') ?? '').trim().toLocaleLowerCase()

  const query = useQuery(
    workspaceAPI.transactions.list
      .input({ from: range.from, to: range.to, limit: 5000 })
      .queryOptions({
        queryKey: [
          ...workspaceAPI.transactions.list.key,
          ownerId,
          range.from,
          range.to
        ],
        enabled: !!ownerId,
        placeholderData: keepPreviousData
      })
  )

  const rows = useMemo(() => {
    const items = query.data?.items ?? []
    const group = categoryId
      ? finance.categoriesById.get(categoryId)
      : undefined

    return items.filter(item => {
      if (kind !== 'all' && item.kind !== kind) return false
      if (
        accountId &&
        item.account_id !== accountId &&
        item.to_account_id !== accountId
      )
        return false

      if (categoryId) {
        const category = item.category_id
          ? finance.categoriesById.get(item.category_id)
          : undefined

        if (
          item.category_id !== categoryId &&
          !(group && !group.parent_id && category?.parent_id === group.id)
        )
          return false
      }
      if (!search) return true

      return [
        item.title,
        item.notes,
        categoryLabel(finance, item.category_id, ''),
        finance.accountsById.get(item.account_id)?.name ?? ''
      ].some(value => value.toLocaleLowerCase().includes(search))
    })
  }, [query.data, kind, accountId, categoryId, search, finance])

  const days = useMemo(() => {
    const map = new Map<string, Transaction[]>()

    for (const row of rows)
      map.set(row.occurred_on, [...(map.get(row.occurred_on) ?? []), row])

    return [...map.entries()]
  }, [rows])

  const totals = rows.reduce(
    (sum, row) =>
      row.kind === 'income'
        ? { ...sum, income: add(sum.income, row.base_amount) }
        : row.kind === 'expense'
          ? { ...sum, expense: add(sum.expense, row.base_amount) }
          : sum,
    { income: '0', expense: '0' }
  )

  const net = finance.shownDifference(totals.income, totals.expense)

  return (
    <>
      <PeriodControl />
      <Card gap="md">
        <Flex align="end" gap="md" wrap="wrap">
          <Flex flex="1" minWidth="14rem">
            <SearchInput
              searchTarget="transactions"
              value={params.get('q') ?? ''}
              onChange={q => updateParams({ q })}
            />
          </Flex>
          <Segmented
            label={t('inputs.kind')}
            options={(['all', 'expense', 'income', 'transfer'] as const).map(
              value => ({
                value,
                label: t(`kinds.${value}`)
              })
            )}
            size="small"
            value={kind}
            onChange={value =>
              updateParams({ kind: value === 'all' ? null : value })
            }
          />
        </Flex>
        <div className="finance-fields">
          <SelectInput
            label="account"
            options={[
              {
                value: '',
                label: t('labels.allAccounts'),
                icon: 'tabler:wallet'
              },
              ...accountOptions(finance, { includeArchived: true })
            ]}
            value={accountId}
            onChange={account => updateParams({ account })}
          />
          <SelectInput
            label="category"
            options={[
              {
                value: '',
                label: t('labels.allCategories'),
                icon: 'tabler:category'
              },
              ...categoryOptions(
                finance,
                'expense',
                t('labels.uncategorized')
              ).slice(1),
              ...categoryOptions(
                finance,
                'income',
                t('labels.uncategorized')
              ).slice(1)
            ]}
            value={categoryId}
            onChange={category => updateParams({ category })}
          />
        </div>
        <Flex className="finance-totals" gap="lg" wrap="wrap">
          <Total
            label={t('series.income')}
            tone="income"
            value={money(totals.income)}
          />
          <Total
            label={t('series.expense')}
            tone="expense"
            value={money(`-${totals.expense}`)}
          />
          <Total
            label={t('series.net')}
            tone="net"
            value={finance.native(net.value, net.code, { sign: true })}
          />
          <Text color="muted" size="sm">
            {t('activity.count', { count: rows.length })}
          </Text>
        </Flex>
      </Card>
      {query.isPending ? (
        <Loading label={t('loading')} />
      ) : !rows.length ? (
        <Card align="start" gap="md">
          <Text color="muted">
            {t(
              query.data?.items.length ? 'activity.noMatches' : 'activity.empty'
            )}
          </Text>
          <Button icon="tabler:plus" onClick={() => editors.transaction()}>
            addTransaction
          </Button>
        </Card>
      ) : (
        <Stack gap="lg">
          {days.map(([day, items], index) => (
            <DayGroup key={day} day={day} index={index} items={items} />
          ))}
          {query.data?.truncated && (
            <Text color="muted" size="sm">
              {t('activity.truncated')}
            </Text>
          )}
        </Stack>
      )}
    </>
  )
}

function Total({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <Stack className="finance-total" data-tone={tone} gap="none">
      <Text color="muted" size="xs">
        {label}
      </Text>
      <Text className="finance-figure" weight="semibold">
        {value}
      </Text>
    </Stack>
  )
}

function DayGroup({
  day,
  items,
  index
}: {
  day: string
  items: Transaction[]
  index: number
}) {
  const finance = useFinance()

  const net = items.reduce<Dec>(
    (sum, item) =>
      item.kind === 'income'
        ? add(sum, item.base_amount)
        : item.kind === 'expense'
          ? sub(sum, item.base_amount)
          : sum,
    '0'
  )

  return (
    <section
      className="finance-day finance-rise"
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
    >
      <Flex align="baseline" className="finance-day-head" justify="between">
        <Text size="sm" weight="semibold">
          {formatDate(day, finance.locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </Text>
        <Text className="finance-figure" color="muted" size="sm">
          {finance.money(net, { sign: true })}
        </Text>
      </Flex>
      <ul className="finance-rows">
        {items.map(item => (
          <TransactionRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

export function TransactionRow({ item }: { item: Transaction }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const account = finance.accountsById.get(item.account_id)
  const target = item.to_account_id
    ? finance.accountsById.get(item.to_account_id)
    : undefined
  const look =
    item.kind === 'transfer'
      ? { icon: kindIcons.transfer, color: '' }
      : categoryLook(finance, item.category_id)
  const label =
    item.title ||
    (item.kind === 'transfer'
      ? t('kinds.transfer')
      : categoryLabel(finance, item.category_id, t('labels.uncategorized')))
  const currency = account?.currency ?? finance.base
  const signed = item.kind === 'income' ? item.amount : `-${item.amount}`

  return (
    <li>
      <button
        className="finance-row"
        data-kind={item.kind}
        type="button"
        onClick={() => editors.transaction(item)}
      >
        <CategoryIcon color={look.color} icon={look.icon} size={36} />
        <span className="finance-row-main">
          <Text size="sm" weight="medium">
            {label}
          </Text>
          <Text color="muted" size="xs">
            {[
              item.kind === 'transfer'
                ? `${account?.name ?? ''} → ${target?.name ?? ''}`
                : item.title
                  ? categoryLabel(
                      finance,
                      item.category_id,
                      t('labels.uncategorized')
                    )
                  : '',
              item.kind !== 'transfer' ? account?.name : '',
              item.recurring_id ? t('activity.planned') : '',
              item.wishlist_item_id ? t('activity.fromWishlist') : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </span>
        <span className="finance-row-amount">
          <Text
            className="finance-figure"
            data-kind={item.kind}
            size="sm"
            weight="semibold"
          >
            {item.kind === 'transfer'
              ? finance.native(item.amount, currency)
              : finance.native(signed, currency, { sign: true })}
          </Text>
          {item.tax_amount !== '0' && (
            <Text color="muted" size="xs">
              {t(
                item.kind === 'income'
                  ? 'activity.taxShort'
                  : 'activity.vatShort',
                {
                  value: finance.native(item.tax_amount, currency)
                }
              )}
            </Text>
          )}
          {item.entered_currency !== currency && (
            <Text color="muted" size="xs">
              {finance.native(item.entered_amount, item.entered_currency)}
            </Text>
          )}
          {item.kind === 'transfer' &&
            target &&
            item.to_amount &&
            target.currency !== currency && (
              <Text color="muted" size="xs">
                → {finance.native(item.to_amount, target.currency)}
              </Text>
            )}
        </span>
      </button>
    </li>
  )
}
