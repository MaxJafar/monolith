import { CURRENCIES, currencyInfo } from '../../../core/currencies'
import { headlineRate } from '../../../core/tax'
import type { FinanceState } from '../FinanceProvider'
import type { Option } from '../components/controls'

export const accountIcons: Record<string, string> = {
  bank: 'tabler:building-bank',
  card: 'tabler:credit-card',
  cash: 'tabler:cash',
  savings: 'tabler:pig-money',
  crypto: 'tabler:currency-bitcoin',
  investment: 'tabler:chart-line',
  debt: 'tabler:receipt-off'
}

export const kindIcons = {
  expense: 'tabler:arrow-down-right',
  income: 'tabler:arrow-up-right',
  transfer: 'tabler:arrows-exchange'
} as const

export function accountOptions(
  finance: FinanceState,
  {
    includeArchived = false,
    exclude
  }: { includeArchived?: boolean; exclude?: string } = {}
): Option<string>[] {
  return (finance.data?.accounts ?? [])
    .filter(
      account =>
        (includeArchived || !account.archived) && account.id !== exclude
    )
    .map(account => ({
      value: account.id,
      label: `${account.name} · ${account.currency}`,
      icon: account.icon || accountIcons[account.kind]
    }))
}

/** Categories of one kind, groups first with their subcategories beneath. */
export function categoryOptions(
  finance: FinanceState,
  kind: 'income' | 'expense',
  none: string
): Option<string>[] {
  const all = (finance.data?.categories ?? []).filter(
    category => category.kind === kind && !category.archived
  )
  const groups = all.filter(category => !category.parent_id)
  const options: Option<string>[] = [
    { value: '', label: none, icon: 'tabler:circle-dashed' }
  ]

  for (const group of groups) {
    options.push({
      value: group.id,
      label: group.name,
      icon: group.icon || 'tabler:folder'
    })
    for (const child of all.filter(category => category.parent_id === group.id))
      options.push({
        value: child.id,
        label: `${group.name} › ${child.name}`,
        icon: child.icon || group.icon || 'tabler:point'
      })
  }

  return options
}

export function groupOptions(
  finance: FinanceState,
  kind: 'income' | 'expense',
  none: string,
  exclude?: string
): Option<string>[] {
  return [
    { value: '', label: none, icon: 'tabler:folders' },
    ...(finance.data?.categories ?? [])
      .filter(
        category =>
          category.kind === kind &&
          !category.parent_id &&
          category.id !== exclude
      )
      .map(category => ({
        value: category.id,
        label: category.name,
        icon: category.icon || 'tabler:folder'
      }))
  ]
}

/** Tax rules allowed for a flow: spending takes VAT, income takes either. */
export function ruleOptions(
  finance: FinanceState,
  kind: 'income' | 'expense',
  none: string
): Option<string>[] {
  return [
    { value: '', label: none, icon: 'tabler:receipt-off' },
    ...(finance.data?.tax_rules ?? [])
      .filter(
        rule => !rule.archived && (kind === 'income' || rule.kind === 'vat')
      )
      .map(rule => ({
        value: rule.id,
        label: `${rule.name} · ${headlineRate(rule)}`,
        icon: rule.kind === 'vat' ? 'tabler:receipt-tax' : 'tabler:file-invoice'
      }))
  ]
}

/** The owner's currencies first, then every known one. */
export function currencyOptions(
  finance: FinanceState,
  extra: string[] = []
): Option<string>[] {
  const mine = [
    ...new Set([
      ...(finance.data?.settings.currencies ?? []),
      ...extra.filter(Boolean)
    ])
  ]
  const rest = Object.keys(CURRENCIES).filter(code => !mine.includes(code))

  return [...mine, ...rest].map(code => ({
    value: code,
    label:
      currencyInfo(code).symbol === code
        ? code
        : `${code} ${currencyInfo(code).symbol}`,
    icon: currencyInfo(code).crypto
      ? 'tabler:currency-bitcoin'
      : 'tabler:currency'
  }))
}

/** Category label including its group, for rows and tooltips. */
export function categoryLabel(
  finance: FinanceState,
  id: string | null,
  none: string
) {
  const category = id ? finance.categoriesById.get(id) : undefined

  if (!category) return none

  const parent = category.parent_id
    ? finance.categoriesById.get(category.parent_id)
    : undefined

  return parent ? `${parent.name} › ${category.name}` : category.name
}

/** A category's visual identity, inheriting its group's icon and color. */
export function categoryLook(finance: FinanceState, id: string | null) {
  const category = id ? finance.categoriesById.get(id) : undefined
  const parent = category?.parent_id
    ? finance.categoriesById.get(category.parent_id)
    : undefined

  return {
    icon: category?.icon || parent?.icon || 'tabler:circle-dashed',
    color: category?.color || parent?.color || ''
  }
}
