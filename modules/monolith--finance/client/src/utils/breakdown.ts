import { decimalsOf } from '../../../core/currencies'
import { type Dec, add, cmp, mulRound, toNumber } from '../../../core/money'
import { type PeriodRange, daysBetween } from '../../../core/periods'
import { type PlannedItem, projectYear } from '../../../core/schedule'
import type { Summary } from '../../../core/schemas'
import type { FinanceState } from '../FinanceProvider'

export type Breakdown = {
  id: string
  label: string
  icon: string
  color: string
  amount: Dec
  tax: Dec
  gross: Dec
  count: number
  budget: Dec | null
  children: Breakdown[]
}

const NEUTRALS = ['#8a8a86', '#a3a39f', '#6f6f6b', '#b8b8b4']

/** How many months' budget a period spans: a week is 12/52 of a month. */
export function budgetFactor(granularity: string, range: PeriodRange): string {
  if (granularity === 'week') return '0.230769'
  if (granularity === 'month') return '1'
  if (granularity === 'year') return '12'

  return String(
    Math.max(1, Math.round(daysBetween(range.from, range.to) / 30.4375))
  )
}

/**
 * Roll summary rows up to top-level groups (subcategories stay as children),
 * largest first. Budgets add up across a group and scale to the period.
 */
export function rollUp(
  finance: FinanceState,
  summary: Summary,
  kind: 'income' | 'expense',
  factor: string,
  none: string
): Breakdown[] {
  const groups = new Map<string, Breakdown>()
  const places = decimalsOf(finance.base)
  const scaled = (budget: Dec | null) =>
    budget ? mulRound(budget, factor, places) : null
  const node = (id: string | null): Breakdown => {
    const category = id ? finance.categoriesById.get(id) : undefined

    return {
      id: id ?? 'none',
      label: category?.name ?? none,
      icon: category?.icon || 'tabler:circle-dashed',
      color: category?.color ?? '',
      amount: '0',
      tax: '0',
      gross: '0',
      count: 0,
      budget: scaled(category?.budget ?? null),
      children: []
    }
  }

  for (const row of summary.categories) {
    if (row.kind !== kind) continue

    const category = row.category_id
      ? finance.categoriesById.get(row.category_id)
      : undefined
    const groupId = category?.parent_id ?? row.category_id
    const group = groups.get(groupId ?? 'none') ?? node(groupId)

    group.amount = add(group.amount, row.amount)
    group.tax = add(group.tax, row.tax)
    group.gross = add(group.gross, row.gross)
    group.count += row.count

    if (category?.parent_id) {
      const child = node(row.category_id)

      child.amount = row.amount
      child.tax = row.tax
      child.gross = row.gross
      child.count = row.count
      child.icon =
        child.icon === 'tabler:circle-dashed' ? group.icon : child.icon
      child.color = child.color || group.color
      group.children.push(child)
    }
    groups.set(groupId ?? 'none', group)
  }

  // Budgets also count for groups without spending yet.
  for (const category of finance.data?.categories ?? [])
    if (
      category.kind === kind &&
      !category.parent_id &&
      category.budget &&
      !groups.has(category.id)
    )
      groups.set(category.id, node(category.id))

  for (const group of groups.values()) {
    const childBudgets = (finance.data?.categories ?? [])
      .filter(category => category.parent_id === group.id && category.budget)
      .map(category => scaled(category.budget)!)

    if (childBudgets.length)
      group.budget = add(group.budget ?? '0', ...childBudgets)
    group.children.sort((a, b) => cmp(b.amount, a.amount))
  }

  const ordered = [...groups.values()].sort((a, b) => cmp(b.amount, a.amount))

  let neutral = 0

  for (const group of ordered)
    if (!group.color) group.color = NEUTRALS[neutral++ % NEUTRALS.length]!

  return ordered
}

/** At most `limit` slices; the rest fold into one "Other" slice. */
export function slices(groups: Breakdown[], limit: number, other: string) {
  const visible = groups.filter(group => toNumber(group.amount) > 0)

  if (visible.length <= limit) return visible

  const rest = visible.slice(limit - 1)

  return [
    ...visible.slice(0, limit - 1),
    {
      ...rest[0]!,
      id: 'other',
      label: other,
      icon: 'tabler:dots',
      color: '#a3a39f',
      amount: add('0', ...rest.map(group => group.amount)),
      children: []
    }
  ]
}

/** Recurring items as plan inputs, with each one's account currency and rule. */
export function plannedItems(finance: FinanceState): PlannedItem[] {
  return (finance.data?.recurring ?? []).flatMap(item => {
    const account = finance.accountsById.get(item.account_id)

    if (!account) return []

    return [
      {
        cadence: item.cadence,
        interval: item.interval,
        start_on: item.start_on,
        end_on: item.end_on,
        kind: item.kind,
        amount: item.amount,
        currency: item.currency,
        account_currency: account.currency,
        tax_basis: item.tax_basis,
        rule: finance.ruleCore(item.tax_rule_id),
        active: item.active
      }
    ]
  })
}

export function projection(finance: FinanceState, year: number) {
  return finance.book
    ? projectYear(plannedItems(finance), year, finance.book)
    : null
}
