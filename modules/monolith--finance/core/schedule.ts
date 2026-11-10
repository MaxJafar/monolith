import { type ComputedTransaction, computeTransaction } from './compute'
import { decimalsOf } from './currencies'
import type { RateBook } from './fx'
import { type Dec, add, div, mul, round, sub } from './money'
import { type CivilDate, addDays, addMonths } from './periods'
import type { TaxBasis, TaxRuleCore } from './tax'

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Schedule = {
  cadence: Cadence
  interval: number
  start_on: CivilDate
  end_on: CivilDate | null
}

const monthsPer: Record<Exclude<Cadence, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12
}

/** The date of occurrence `index` (0 = start). Month ends clamp, never drift. */
export function occurrenceDate(schedule: Schedule, index: number): CivilDate {
  const step = Math.max(1, schedule.interval)

  if (schedule.cadence === 'weekly')
    return addDays(schedule.start_on, 7 * step * index)

  return addMonths(
    schedule.start_on,
    monthsPer[schedule.cadence] * step * index,
    Number(schedule.start_on.slice(8, 10))
  )
}

/** Occurrences inside [from, to], bounded so a bad schedule cannot spin. */
export function occurrencesBetween(
  schedule: Schedule,
  from: CivilDate,
  to: CivilDate,
  limit = 600
): { index: number; date: CivilDate }[] {
  const result: { index: number; date: CivilDate }[] = []
  const last = schedule.end_on && schedule.end_on < to ? schedule.end_on : to

  for (let index = 0; index < 100000 && result.length < limit; index++) {
    const date = occurrenceDate(schedule, index)

    if (date > last) break
    if (date >= from) result.push({ index, date })
  }

  return result
}

/** Occurrences from `nextIndex` that are due on or before `today`. */
export function dueOccurrences(
  schedule: Schedule,
  nextIndex: number,
  today: CivilDate,
  limit = 120
): { index: number; date: CivilDate }[] {
  const result: { index: number; date: CivilDate }[] = []

  for (let index = nextIndex; result.length < limit; index++) {
    const date = occurrenceDate(schedule, index)

    if (date > today || (schedule.end_on && date > schedule.end_on)) break
    result.push({ index, date })
  }

  return result
}

/** Average occurrences per year, for "monthly equivalent" figures. */
export function perYear(cadence: Cadence, interval: number): Dec {
  const step = String(Math.max(1, interval))

  if (cadence === 'weekly') return div('52.1775', step, 6)

  return div(String(12 / monthsPer[cadence]), step, 6)
}

export type PlannedItem = Schedule & {
  kind: 'income' | 'expense'
  amount: Dec
  currency: string
  account_currency: string
  tax_basis: TaxBasis
  rule: TaxRuleCore | null
  active: boolean
}

export type PlanMonth = {
  month: CivilDate
  income_gross: Dec
  income_tax: Dec
  income_received: Dec
  tax_reserve: Dec
  expense: Dec
  vat: Dec
  net: Dec
}

export type PlanProjection = {
  months: PlanMonth[]
  totals: Omit<PlanMonth, 'month'>
  /** Items skipped because a rate is missing. */
  unpriced: number
}

const zeroMonth = (month: CivilDate): PlanMonth => ({
  month,
  income_gross: '0',
  income_tax: '0',
  income_received: '0',
  tax_reserve: '0',
  expense: '0',
  vat: '0',
  net: '0'
})

/**
 * Project a calendar year from recurring items: each actual occurrence is
 * taxed and converted exactly as a posted transaction would be, at today's
 * rates, then summed by month in the base currency.
 */
export function projectYear(
  items: readonly PlannedItem[],
  year: number,
  book: RateBook
): PlanProjection {
  const months = Array.from({ length: 12 }, (_, index) =>
    zeroMonth(`${year}-${String(index + 1).padStart(2, '0')}-01`)
  )

  let unpriced = 0

  for (const item of items) {
    if (!item.active) continue

    let computed: ComputedTransaction

    try {
      computed = computeTransaction(
        {
          kind: item.kind,
          entered_amount: item.amount,
          entered_currency: item.currency,
          account_currency: item.account_currency,
          tax_basis: item.tax_basis,
          rule: item.rule
        },
        book
      )
    } catch {
      unpriced++
      continue
    }

    for (const { date } of occurrencesBetween(
      item,
      `${year}-01-01`,
      `${year}-12-31`
    )) {
      const month = months[Number(date.slice(5, 7)) - 1]!

      if (item.kind === 'income') {
        month.income_gross = add(month.income_gross, computed.base_gross)
        month.income_tax = add(month.income_tax, computed.base_tax)
        month.income_received = add(month.income_received, computed.base_amount)
        if (!computed.withheld)
          month.tax_reserve = add(month.tax_reserve, computed.base_tax)
      } else {
        month.expense = add(month.expense, computed.base_amount)
        month.vat = add(month.vat, computed.base_tax)
      }
    }
  }

  const { month: _all, ...totals } = zeroMonth('')
  const keys = Object.keys(totals) as (keyof typeof totals)[]

  for (const month of months) {
    month.net = sub(month.income_received, month.expense)
    for (const key of keys) totals[key] = add(totals[key], month[key])
  }

  return { months, totals, unpriced }
}

export type Compounding = 'monthly' | 'quarterly' | 'yearly' | 'maturity'

export type DepositInput = {
  principal: Dec
  /** Annual rate in percent. */
  rate: Dec
  months: number
  compounding: Compounding
  /** Added at the end of every month. */
  contribution: Dec
  /** Tax on interest, in percent. */
  tax_rate: Dec
  currency: string
}

export type DepositResult = {
  rows: { month: number; balance: Dec; interest: Dec; contributed: Dec }[]
  interest: Dec
  tax: Dec
  contributed: Dec
  final: Dec
}

/**
 * A deposit's growth month by month. Interest is credited at the end of each
 * compounding period, rounded to the currency like a bank statement; at
 * maturity, simple interest accrues on each month's balance.
 */
export function depositGrowth(input: DepositInput): DepositResult {
  const decimals = decimalsOf(input.currency)
  const months = Math.max(0, Math.min(600, Math.round(input.months)))
  const periodMonths =
    input.compounding === 'monthly'
      ? 1
      : input.compounding === 'quarterly'
        ? 3
        : input.compounding === 'yearly'
          ? 12
          : months || 1
  const monthlyRate = div(input.rate, '1200', 12)

  let balance = round(input.principal, decimals)
  let contributed = balance
  let accrued = '0'
  let interest = '0'

  const rows: DepositResult['rows'] = [
    { month: 0, balance, interest: '0', contributed }
  ]

  for (let month = 1; month <= months; month++) {
    accrued = add(accrued, mul(balance, monthlyRate))

    if (month % periodMonths === 0 || month === months) {
      const credited = round(accrued, decimals)

      balance = add(balance, credited)
      interest = add(interest, credited)
      accrued = '0'
    }

    if (month < months) {
      balance = add(balance, round(input.contribution, decimals))
      contributed = add(contributed, round(input.contribution, decimals))
    }

    rows.push({ month, balance, interest, contributed })
  }

  const tax = round(div(mul(interest, input.tax_rate), '100', 12), decimals)

  return { rows, interest, tax, contributed, final: sub(balance, tax) }
}
