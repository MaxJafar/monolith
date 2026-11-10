import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lt,
  lte,
  max,
  min,
  or,
  sql
} from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { z } from 'zod'

import type { BuiltModuleSchema } from '@monolith/drizzle'
import { ClientError } from '@monolith/server-utils'

import {
  MissingRateError,
  computeTransaction,
  computeWish
} from '../core/compute'
import { decimalsOf } from '../core/currencies'
import {
  type RateBook,
  buildRateBook,
  convert,
  rateOf,
  reexpressCustomRates
} from '../core/fx'
import { type Dec, add, isPositive, normalize, sub } from '../core/money'
import {
  type CivilDate,
  bucketStart,
  bucketStarts,
  daysBetween
} from '../core/periods'
import { type Schedule, dueOccurrences, occurrenceDate } from '../core/schedule'
import {
  type Account,
  type Category,
  type Recurring,
  type Settings,
  type Snapshot,
  type Summary,
  type TaxRule,
  type Totals,
  type Transaction,
  type WishlistItem,
  type WishlistList,
  accountInputSchema,
  type accountSaveSchema,
  categoryInputSchema,
  type categorySaveSchema,
  type deleteInputSchema,
  type purchaseInputSchema,
  recurringInputSchema,
  type recurringPostSchema,
  type recurringSaveSchema,
  settingsInputSchema,
  type settingsSaveSchema,
  type setupInputSchema,
  type summaryInputSchema,
  taxRuleInputSchema,
  type taxRuleSaveSchema,
  transactionInputSchema,
  type transactionListInputSchema,
  type transactionSaveSchema,
  wishlistItemInputSchema,
  type wishlistItemSaveSchema,
  wishlistListInputSchema,
  type wishlistListSaveSchema
} from '../core/schemas'
import type { TaxRuleCore } from '../core/tax'
import { checkUpdated, nextUpdated, notFound } from './model'
import { fetchMarketQuotes } from './rates'
import * as schema from './schema.drizzle'
import {
  type TaxSnapshot,
  accounts,
  categories,
  rates,
  recurring,
  settings,
  taxRules,
  transactions,
  wishlistItems,
  wishlistLists
} from './schema.drizzle'

export type FinanceDatabase = PostgresJsDatabase<
  BuiltModuleSchema<typeof schema>
>

export type FinanceStore = Pick<
  FinanceDatabase,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>

type Input<T extends z.ZodType> = z.output<T>

export type Saved = { id: string; updated: string }

export async function lockOwner(db: FinanceStore, owner: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`finance:${owner}`},0))`
  )
}

const iso = (value: Date) => value.toISOString()
const dec = (value: string | null | undefined): Dec | null =>
  value === null || value === undefined ? null : normalize(value)
const unique = <T>(values: T[]) => [...new Set(values)]

function fail(message: string, status = 400): never {
  throw new ClientError(message, status)
}

/* Settings and rates ------------------------------------------------------ */

const defaultSettings = settingsInputSchema.parse({})

async function settingsRow(db: FinanceStore, owner: string) {
  await db
    .insert(settings)
    .values({ owner_id: owner, values: defaultSettings })
    .onConflictDoNothing()

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.owner_id, owner))
    .limit(1)

  if (!row) fail('Settings unavailable', 500)

  return {
    values: settingsInputSchema.parse(row.values),
    configured: row.configured,
    updated: row.updated
  }
}

function settingsDto(row: Awaited<ReturnType<typeof settingsRow>>): Settings {
  return {
    ...row.values,
    configured: row.configured,
    updated: iso(row.updated)
  }
}

export async function getSettings(db: FinanceStore, owner: string) {
  return settingsDto(await settingsRow(db, owner))
}

/** Every currency the owner uses anywhere, so each one gets a rate. */
async function usedCurrencies(
  db: FinanceStore,
  owner: string,
  values: Settings | Input<typeof settingsInputSchema>,
  extra: string[] = []
) {
  const [accountCodes, wishCodes, plannedCodes] = [
    await db
      .select({ code: accounts.currency })
      .from(accounts)
      .where(eq(accounts.owner_id, owner))
      .groupBy(accounts.currency),
    await db
      .select({ code: wishlistItems.currency })
      .from(wishlistItems)
      .where(eq(wishlistItems.owner_id, owner))
      .groupBy(wishlistItems.currency),
    await db
      .select({ code: recurring.currency })
      .from(recurring)
      .where(eq(recurring.owner_id, owner))
      .groupBy(recurring.currency)
  ]

  return unique([
    values.base_currency,
    values.display_currency,
    ...values.currencies,
    ...accountCodes.map(row => row.code),
    ...wishCodes.map(row => row.code),
    ...plannedCodes.map(row => row.code),
    ...extra
  ])
}

async function loadRateBook(
  db: FinanceStore,
  owner: string,
  values: Input<typeof settingsInputSchema>,
  extra: string[] = []
): Promise<RateBook> {
  const codes = await usedCurrencies(db, owner, values, extra)
  const rows = await db.select().from(rates).where(eq(rates.owner_id, owner))

  return buildRateBook(
    values.base_currency,
    codes,
    rows.map(row => ({
      code: row.code,
      custom_rate: dec(row.custom_rate),
      market_usd: dec(row.market_usd),
      market_per_usd: dec(row.market_per_usd),
      market_at: row.market_at ? iso(row.market_at) : null
    }))
  )
}

export async function getRateBook(db: FinanceStore, owner: string) {
  const current = await settingsRow(db, owner)

  return loadRateBook(db, owner, current.values)
}

export async function saveRate(
  db: FinanceStore,
  owner: string,
  input: { code: string; custom_rate: string | null }
) {
  await lockOwner(db, owner)

  const current = await settingsRow(db, owner)

  if (input.code === current.values.base_currency)
    fail('The main currency is always 1. Pin rates for other currencies.')

  const custom =
    input.custom_rate === null ? null : normalize(input.custom_rate)

  await db
    .insert(rates)
    .values({ owner_id: owner, code: input.code, custom_rate: custom })
    .onConflictDoUpdate({
      target: [rates.owner_id, rates.code],
      set: { custom_rate: custom, updated: new Date() }
    })

  if (!current.values.currencies.includes(input.code))
    await db
      .update(settings)
      .set({
        values: {
          ...current.values,
          currencies: [...current.values.currencies, input.code]
        },
        updated: nextUpdated(current.updated)
      })
      .where(eq(settings.owner_id, owner))

  return getRateBook(db, owner)
}

export async function refreshRates(
  db: FinanceStore,
  owner: string,
  coingeckoKey = ''
) {
  const current = await settingsRow(db, owner)
  const codes = (await usedCurrencies(db, owner, current.values)).filter(
    code => code !== 'USD'
  )
  const { quotes, failed } = await fetchMarketQuotes(codes, coingeckoKey)

  await lockOwner(db, owner)

  for (const quote of quotes)
    await db
      .insert(rates)
      .values({
        owner_id: owner,
        code: quote.code,
        market_usd: quote.usd,
        market_per_usd: quote.per_usd,
        market_at: quote.at
      })
      .onConflictDoUpdate({
        target: [rates.owner_id, rates.code],
        set: {
          market_usd: quote.usd,
          market_per_usd: quote.per_usd,
          market_at: quote.at,
          updated: new Date()
        }
      })

  return {
    rates: await loadRateBook(db, owner, current.values),
    refreshed: quotes.map(quote => quote.code),
    failed
  }
}

/**
 * Move the books to another main currency. Pinned rates keep their meaning,
 * and every transaction's booking rate is restated through today's cross
 * rate between the two bases in a single statement, so history keeps its
 * own rate movements and every row still reconciles.
 */
async function rebase(
  db: FinanceStore,
  owner: string,
  values: Input<typeof settingsInputSchema>,
  nextBase: string
) {
  const book = await loadRateBook(db, owner, values, [nextBase])
  // Old-base units for one unit of the new base, e.g. 1.7 AZN per USD.
  // Dividing by it keeps a booked 1.7 AZN per USD exactly 1 after the move.
  const divisor = rateOf(book, nextBase)

  if (!divisor || !isPositive(divisor))
    fail(
      `Add an exchange rate for ${nextBase} before making it your main currency.`
    )

  for (const [code, value] of Object.entries(
    reexpressCustomRates(book, nextBase)
  ))
    await db
      .insert(rates)
      .values({ owner_id: owner, code, custom_rate: value })
      .onConflictDoUpdate({
        target: [rates.owner_id, rates.code],
        set: { custom_rate: value, updated: new Date() }
      })

  const places = decimalsOf(nextBase)

  await db.execute(sql`
    update ${transactions} as t set
      base_rate = r.next_rate,
      base_gross = round(t.gross_amount * r.next_rate, ${places}::int),
      base_tax = round(t.tax_amount * r.next_rate, ${places}::int),
      base_net = round(t.gross_amount * r.next_rate, ${places}::int)
        - round(t.tax_amount * r.next_rate, ${places}::int),
      base_amount = case
        when t.kind = 'transfer' then round(t.amount * r.next_rate, ${places}::int)
        when t.withheld then round(t.gross_amount * r.next_rate, ${places}::int)
          - round(t.tax_amount * r.next_rate, ${places}::int)
        else round(t.gross_amount * r.next_rate, ${places}::int)
      end
    from (
      select id, round(base_rate / ${divisor}::numeric, 12) as next_rate
      from ${transactions} where owner_id = ${owner}
    ) as r
    where t.id = r.id and t.owner_id = ${owner}`)
}

export async function saveSettings(
  db: FinanceStore,
  owner: string,
  input: Input<typeof settingsSaveSchema>
) {
  await lockOwner(db, owner)

  const current = await settingsRow(db, owner)

  if (input.expected_updated)
    checkUpdated(current.updated, input.expected_updated)

  const { expected_updated: _guard, ...fields } = input
  const next = settingsInputSchema.parse(fields)

  next.currencies = unique([
    next.base_currency,
    next.display_currency,
    ...next.currencies
  ])
  if (next.default_account_id)
    await ownedAccount(db, owner, next.default_account_id)
  if (next.wish_category_id)
    await ownedCategory(db, owner, next.wish_category_id, 'expense')
  if (next.base_currency !== current.values.base_currency)
    await rebase(db, owner, current.values, next.base_currency)

  await db
    .update(settings)
    .set({ values: next, updated: nextUpdated(current.updated) })
    .where(eq(settings.owner_id, owner))

  return getSettings(db, owner)
}

/* Ownership helpers ------------------------------------------------------- */

async function ownedAccount(db: FinanceStore, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.owner_id, owner), eq(accounts.id, id)))
    .limit(1)

  return row ?? notFound('Account')
}

async function ownedCategory(
  db: FinanceStore,
  owner: string,
  id: string,
  kind?: 'income' | 'expense'
) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.owner_id, owner), eq(categories.id, id)))
    .limit(1)

  if (!row) notFound('Category')
  if (kind && row.kind !== kind)
    fail(
      kind === 'income'
        ? 'Choose an income stream for income.'
        : 'Choose an expense category for spending.'
    )

  return row
}

async function ownedRule(db: FinanceStore, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(taxRules)
    .where(and(eq(taxRules.owner_id, owner), eq(taxRules.id, id)))
    .limit(1)

  return row ?? notFound('Tax rule')
}

const ruleCore = (row: typeof taxRules.$inferSelect): TaxRuleCore => ({
  kind: row.kind,
  rate: normalize(row.rate),
  inclusive: row.inclusive,
  withheld: row.withheld,
  components: row.components
})

function requireRuleFor(
  rule: typeof taxRules.$inferSelect | null,
  kind: 'income' | 'expense'
) {
  if (rule && kind === 'expense' && rule.kind !== 'vat')
    fail('Spending uses VAT or sales tax rules, not income tax rules.')
}

/* Snapshot ---------------------------------------------------------------- */

/** Net movement per account, optionally only before a date. */
async function accountMovements(
  db: FinanceStore,
  owner: string,
  before?: CivilDate
) {
  const dated = (column: typeof transactions.occurred_on) =>
    before ? lt(column, before) : undefined
  const outgoing = await db
    .select({
      account: transactions.account_id,
      kind: transactions.kind,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      rows: count()
    })
    .from(transactions)
    .where(
      and(eq(transactions.owner_id, owner), dated(transactions.occurred_on))
    )
    .groupBy(transactions.account_id, transactions.kind)
  const incoming = await db
    .select({
      account: transactions.to_account_id,
      total: sql<string>`coalesce(sum(${transactions.to_amount}), 0)`,
      rows: count()
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.owner_id, owner),
        eq(transactions.kind, 'transfer'),
        dated(transactions.occurred_on)
      )
    )
    .groupBy(transactions.to_account_id)
  const movement = new Map<string, { total: Dec; rows: number }>()
  const bump = (account: string, delta: Dec, rows: number) => {
    const current = movement.get(account) ?? { total: '0', rows: 0 }

    movement.set(account, {
      total: add(current.total, delta),
      rows: current.rows + rows
    })
  }

  for (const row of outgoing)
    bump(
      row.account,
      row.kind === 'income' ? normalize(row.total) : sub('0', row.total),
      row.rows
    )
  for (const row of incoming)
    if (row.account) bump(row.account, normalize(row.total), row.rows)

  return movement
}

function accountDto(
  row: typeof accounts.$inferSelect,
  movement: { total: Dec; rows: number } | undefined,
  book: RateBook
): Account {
  const balance = add(normalize(row.opening_balance), movement?.total ?? '0')

  return {
    ...accountInputSchema.strip().parse({
      ...row,
      opening_balance: normalize(row.opening_balance),
      interest_rate: dec(row.interest_rate)
    }),
    id: row.id,
    created: iso(row.created),
    updated: iso(row.updated),
    balance,
    base_balance: convert(book, balance, row.currency, book.base),
    transactions: movement?.rows ?? 0
  }
}

const categoryDto = (row: typeof categories.$inferSelect): Category => ({
  ...categoryInputSchema.strip().parse({ ...row, budget: dec(row.budget) }),
  id: row.id,
  created: iso(row.created),
  updated: iso(row.updated)
})

const taxRuleDto = (row: typeof taxRules.$inferSelect): TaxRule => ({
  ...taxRuleInputSchema.strip().parse({ ...row, rate: normalize(row.rate) }),
  id: row.id,
  created: iso(row.created),
  updated: iso(row.updated)
})

const listDto = (row: typeof wishlistLists.$inferSelect): WishlistList => ({
  ...wishlistListInputSchema.strip().parse(row),
  id: row.id,
  created: iso(row.created),
  updated: iso(row.updated)
})

function wishDto(
  row: typeof wishlistItems.$inferSelect,
  rules: Map<string, typeof taxRules.$inferSelect>,
  book: RateBook
): WishlistItem {
  const rule = row.tax_rule_id ? rules.get(row.tax_rule_id) : undefined
  const totals = computeWish(
    {
      price: normalize(row.price),
      quantity: row.quantity,
      shipping: normalize(row.shipping),
      currency: row.currency,
      rule: rule ? ruleCore(rule) : null
    },
    book
  )

  return {
    ...wishlistItemInputSchema.strip().parse({
      ...row,
      price: normalize(row.price),
      shipping: normalize(row.shipping)
    }),
    id: row.id,
    created: iso(row.created),
    updated: iso(row.updated),
    status: row.status,
    purchased_on: row.purchased_on,
    transaction_id: row.transaction_id,
    ...totals
  }
}

const scheduleOf = (row: typeof recurring.$inferSelect): Schedule => ({
  cadence: row.cadence,
  interval: row.interval,
  start_on: row.start_on,
  end_on: row.end_on
})

function nextOn(row: typeof recurring.$inferSelect): CivilDate | null {
  const date = occurrenceDate(scheduleOf(row), row.next_index)

  return row.end_on && date > row.end_on ? null : date
}

const recurringDto = (row: typeof recurring.$inferSelect): Recurring => ({
  ...recurringInputSchema
    .strip()
    .parse({ ...row, amount: normalize(row.amount) }),
  id: row.id,
  created: iso(row.created),
  updated: iso(row.updated),
  next_index: row.next_index,
  next_on: nextOn(row),
  posted: row.posted
})

export async function getSnapshot(
  db: FinanceStore,
  owner: string
): Promise<Snapshot> {
  const current = await settingsRow(db, owner)
  const book = await loadRateBook(db, owner, current.values)
  const accountRows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.owner_id, owner))
    .orderBy(asc(accounts.sort), asc(accounts.created))
  const categoryRows = await db
    .select()
    .from(categories)
    .where(eq(categories.owner_id, owner))
    .orderBy(asc(categories.sort), asc(categories.created))
  const ruleRows = await db
    .select()
    .from(taxRules)
    .where(eq(taxRules.owner_id, owner))
    .orderBy(asc(taxRules.created))
  const listRows = await db
    .select()
    .from(wishlistLists)
    .where(eq(wishlistLists.owner_id, owner))
    .orderBy(asc(wishlistLists.sort), asc(wishlistLists.created))
  const wishRows = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.owner_id, owner))
    .orderBy(asc(wishlistItems.sort), asc(wishlistItems.created))
  const plannedRows = await db
    .select()
    .from(recurring)
    .where(eq(recurring.owner_id, owner))
    .orderBy(asc(recurring.created))
  const movement = await accountMovements(db, owner)
  const [stats] = await db
    .select({ earliest: min(transactions.occurred_on), rows: count() })
    .from(transactions)
    .where(eq(transactions.owner_id, owner))
  const rules = new Map(ruleRows.map(row => [row.id, row]))

  return {
    settings: settingsDto(current),
    rates: book,
    accounts: accountRows.map(row =>
      accountDto(row, movement.get(row.id), book)
    ),
    categories: categoryRows.map(categoryDto),
    tax_rules: ruleRows.map(taxRuleDto),
    lists: listRows.map(listDto),
    wishes: wishRows.map(row => wishDto(row, rules, book)),
    recurring: plannedRows.map(recurringDto),
    earliest_on: stats?.earliest ?? null,
    transaction_count: stats?.rows ?? 0
  }
}

/* Accounts ---------------------------------------------------------------- */

const saved = (row: { id: string; updated: Date }): Saved => ({
  id: row.id,
  updated: iso(row.updated)
})

async function remember(db: FinanceStore, owner: string, code: string) {
  const current = await settingsRow(db, owner)

  if (current.values.currencies.includes(code)) return
  await db
    .update(settings)
    .set({
      values: {
        ...current.values,
        currencies: [...current.values.currencies, code].slice(0, 40)
      },
      updated: nextUpdated(current.updated)
    })
    .where(eq(settings.owner_id, owner))
}

export async function saveAccount(
  db: FinanceStore,
  owner: string,
  input: Input<typeof accountSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = accountInputSchema.parse(fields)
  const values = {
    ...data,
    opening_balance: normalize(data.opening_balance),
    interest_rate:
      data.interest_rate === null ? null : normalize(data.interest_rate)
  }

  await remember(db, owner, data.currency)

  if (!id) {
    const [row] = await db
      .insert(accounts)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const existing = await ownedAccount(db, owner, id)

  checkUpdated(existing.updated, expected_updated)

  if (existing.currency !== data.currency) {
    const movement = (await accountMovements(db, owner)).get(id)

    if (movement?.rows)
      fail(
        'An account keeps its currency once it has transactions. Open a new account for the other currency and transfer between them.',
        409
      )
  }

  const [row] = await db
    .update(accounts)
    .set({ ...values, updated: nextUpdated(existing.updated) })
    .where(and(eq(accounts.owner_id, owner), eq(accounts.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteAccount(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const existing = await ownedAccount(db, owner, input.id)

  checkUpdated(existing.updated, input.expected_updated)

  const [used] = await db
    .select({ rows: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.owner_id, owner),
        or(
          eq(transactions.account_id, input.id),
          eq(transactions.to_account_id, input.id)
        )
      )
    )
  const [planned] = await db
    .select({ rows: count() })
    .from(recurring)
    .where(
      and(eq(recurring.owner_id, owner), eq(recurring.account_id, input.id))
    )

  if (used?.rows || planned?.rows)
    fail(
      'This account still has transactions or planned items. Archive it instead to keep your history.',
      409
    )

  await db
    .update(wishlistItems)
    .set({ account_id: null })
    .where(
      and(
        eq(wishlistItems.owner_id, owner),
        eq(wishlistItems.account_id, input.id)
      )
    )
  await clearSetting(db, owner, 'default_account_id', input.id)
  await db
    .delete(accounts)
    .where(and(eq(accounts.owner_id, owner), eq(accounts.id, input.id)))
}

async function clearSetting(
  db: FinanceStore,
  owner: string,
  key: 'default_account_id' | 'wish_category_id',
  id: string
) {
  const current = await settingsRow(db, owner)

  if (current.values[key] !== id) return
  await db
    .update(settings)
    .set({
      values: { ...current.values, [key]: null },
      updated: nextUpdated(current.updated)
    })
    .where(eq(settings.owner_id, owner))
}

/* Categories -------------------------------------------------------------- */

export async function saveCategory(
  db: FinanceStore,
  owner: string,
  input: Input<typeof categorySaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = categoryInputSchema.parse(fields)

  if (data.parent_id) {
    if (data.parent_id === id) fail('A category cannot contain itself.')

    const parent = await ownedCategory(db, owner, data.parent_id, data.kind)

    if (parent.parent_id) fail('Subcategories can be one level deep.')

    if (id) {
      const [children] = await db
        .select({ rows: count() })
        .from(categories)
        .where(
          and(eq(categories.owner_id, owner), eq(categories.parent_id, id))
        )

      if (children?.rows)
        fail('A group with subcategories cannot move under another group.')
    }
  }

  if (data.tax_rule_id)
    requireRuleFor(await ownedRule(db, owner, data.tax_rule_id), data.kind)

  const values = {
    ...data,
    budget: data.budget === null ? null : normalize(data.budget)
  }

  if (!id) {
    const [row] = await db
      .insert(categories)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const existing = await ownedCategory(db, owner, id)

  checkUpdated(existing.updated, expected_updated)

  if (existing.kind !== data.kind) {
    const [used] = await db
      .select({ rows: count() })
      .from(transactions)
      .where(
        and(eq(transactions.owner_id, owner), eq(transactions.category_id, id))
      )

    if (used?.rows) fail('A category with transactions keeps its type.', 409)
  }

  const [row] = await db
    .update(categories)
    .set({ ...values, updated: nextUpdated(existing.updated) })
    .where(and(eq(categories.owner_id, owner), eq(categories.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteCategory(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const existing = await ownedCategory(db, owner, input.id)

  checkUpdated(existing.updated, input.expected_updated)

  const [children] = await db
    .select({ rows: count() })
    .from(categories)
    .where(
      and(eq(categories.owner_id, owner), eq(categories.parent_id, input.id))
    )

  if (children?.rows) fail('Move or delete its subcategories first.', 409)

  // History stays: transactions and plans simply become uncategorized.
  await db
    .update(transactions)
    .set({ category_id: null })
    .where(
      and(
        eq(transactions.owner_id, owner),
        eq(transactions.category_id, input.id)
      )
    )
  await db
    .update(recurring)
    .set({ category_id: null })
    .where(
      and(eq(recurring.owner_id, owner), eq(recurring.category_id, input.id))
    )
  await db
    .update(wishlistItems)
    .set({ category_id: null })
    .where(
      and(
        eq(wishlistItems.owner_id, owner),
        eq(wishlistItems.category_id, input.id)
      )
    )
  await clearSetting(db, owner, 'wish_category_id', input.id)
  await db
    .delete(categories)
    .where(and(eq(categories.owner_id, owner), eq(categories.id, input.id)))
}

/* Tax rules --------------------------------------------------------------- */

function cleanRule(data: Input<typeof taxRuleInputSchema>) {
  if (data.kind === 'vat')
    return { ...data, rate: normalize(data.rate), components: [] }
  if (!data.components.length)
    fail('An income tax rule needs at least one component with brackets.')

  return {
    ...data,
    rate: '0',
    components: data.components.map(component => ({
      label: component.label,
      brackets: component.brackets.map(bracket => ({
        up_to: bracket.up_to === null ? null : normalize(bracket.up_to),
        rate: normalize(bracket.rate)
      }))
    }))
  }
}

export async function saveTaxRule(
  db: FinanceStore,
  owner: string,
  input: Input<typeof taxRuleSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const values = cleanRule(taxRuleInputSchema.parse(fields))

  if (!id) {
    const [row] = await db
      .insert(taxRules)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const existing = await ownedRule(db, owner, id)

  checkUpdated(existing.updated, expected_updated)

  if (existing.kind !== values.kind) {
    const [used] = await db
      .select({ rows: count() })
      .from(categories)
      .where(
        and(eq(categories.owner_id, owner), eq(categories.tax_rule_id, id))
      )

    if (used?.rows)
      fail(
        'Categories use this rule. Create a new rule for the other tax type.',
        409
      )
  }

  const [row] = await db
    .update(taxRules)
    .set({ ...values, updated: nextUpdated(existing.updated) })
    .where(and(eq(taxRules.owner_id, owner), eq(taxRules.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteTaxRule(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const existing = await ownedRule(db, owner, input.id)

  checkUpdated(existing.updated, input.expected_updated)

  // Booked transactions keep their tax snapshot and amounts.
  for (const target of [categories, recurring, wishlistItems, transactions])
    await db
      .update(target)
      .set({ tax_rule_id: null })
      .where(and(eq(target.owner_id, owner), eq(target.tax_rule_id, input.id)))
  await db
    .delete(taxRules)
    .where(and(eq(taxRules.owner_id, owner), eq(taxRules.id, input.id)))
}

/* Transactions ------------------------------------------------------------ */

type Booking = Input<typeof transactionInputSchema> & {
  wishlist_item_id?: string | null
  recurring_id?: string | null
  recurring_index?: number | null
}

/** Validate references and compute every stored amount for a booking. */
async function prepareBooking(
  db: FinanceStore,
  owner: string,
  data: Booking,
  values: Input<typeof settingsInputSchema>
) {
  const account = await ownedAccount(db, owner, data.account_id)

  let target: typeof accounts.$inferSelect | null = null
  let rule: typeof taxRules.$inferSelect | null = null

  if (data.kind === 'transfer') {
    if (!data.to_account_id)
      fail('Choose the account that receives the transfer.')
    if (data.to_account_id === data.account_id)
      fail('A transfer needs two different accounts.')
    target = await ownedAccount(db, owner, data.to_account_id)
  } else {
    if (data.category_id)
      await ownedCategory(db, owner, data.category_id, data.kind)

    if (data.tax_rule_id) {
      rule = await ownedRule(db, owner, data.tax_rule_id)
      requireRuleFor(rule, data.kind)
    }
  }

  const book = await loadRateBook(db, owner, values, [
    data.entered_currency,
    account.currency,
    ...(target ? [target.currency] : [])
  ])

  let computed

  try {
    computed = computeTransaction(
      {
        kind: data.kind,
        entered_amount: data.entered_amount,
        entered_currency: data.entered_currency,
        account_currency: account.currency,
        to_account_currency: target?.currency ?? null,
        to_amount: data.to_amount,
        tax_basis: data.tax_basis,
        rule: rule ? ruleCore(rule) : null
      },
      book
    )
  } catch (error) {
    if (error instanceof MissingRateError) fail(error.message)
    throw error
  }

  const snapshot: TaxSnapshot | null = rule
    ? { name: rule.name, kind: rule.kind, parts: computed.parts }
    : null

  return {
    kind: data.kind,
    occurred_on: data.occurred_on,
    account_id: data.account_id,
    to_account_id: data.kind === 'transfer' ? data.to_account_id : null,
    category_id: data.kind === 'transfer' ? null : data.category_id,
    title: data.title,
    notes: data.notes,
    entered_amount: normalize(data.entered_amount),
    entered_currency: data.entered_currency,
    amount: computed.amount,
    gross_amount: computed.gross_amount,
    tax_amount: computed.tax_amount,
    net_amount: computed.net_amount,
    to_amount: computed.to_amount,
    tax_rule_id: data.kind === 'transfer' ? null : data.tax_rule_id,
    tax_basis: data.tax_basis,
    tax_snapshot: snapshot,
    withheld: computed.withheld,
    base_rate: computed.base_rate,
    base_amount: computed.base_amount,
    base_gross: computed.base_gross,
    base_tax: computed.base_tax,
    base_net: computed.base_net
  }
}

function transactionDto(row: typeof transactions.$inferSelect): Transaction {
  return {
    ...transactionInputSchema.strip().parse({
      ...row,
      entered_amount: normalize(row.entered_amount),
      to_amount: dec(row.to_amount)
    }),
    id: row.id,
    created: iso(row.created),
    updated: iso(row.updated),
    amount: normalize(row.amount),
    gross_amount: normalize(row.gross_amount),
    tax_amount: normalize(row.tax_amount),
    net_amount: normalize(row.net_amount),
    to_amount: dec(row.to_amount),
    base_rate: normalize(row.base_rate),
    base_amount: normalize(row.base_amount),
    base_gross: normalize(row.base_gross),
    base_tax: normalize(row.base_tax),
    base_net: normalize(row.base_net),
    withheld: row.withheld,
    tax_name: row.tax_snapshot?.name ?? '',
    tax_parts: row.tax_snapshot?.parts ?? [],
    wishlist_item_id: row.wishlist_item_id,
    recurring_id: row.recurring_id
  }
}

export async function saveTransaction(
  db: FinanceStore,
  owner: string,
  input: Input<typeof transactionSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = transactionInputSchema.parse(fields)
  const current = await settingsRow(db, owner)
  const values = await prepareBooking(db, owner, data, current.values)

  await remember(db, owner, data.entered_currency)

  if (!id) {
    const [row] = await db
      .insert(transactions)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.owner_id, owner), eq(transactions.id, id)))
    .limit(1)

  if (!existing) notFound('Transaction')
  checkUpdated(existing.updated, expected_updated)

  const [row] = await db
    .update(transactions)
    .set({ ...values, updated: nextUpdated(existing.updated) })
    .where(and(eq(transactions.owner_id, owner), eq(transactions.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteTransaction(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.owner_id, owner), eq(transactions.id, input.id)))
    .limit(1)

  if (!existing) notFound('Transaction')
  checkUpdated(existing.updated, input.expected_updated)

  // Deleting a wishlist purchase puts the item back on the wishlist.
  if (existing.wishlist_item_id)
    await db
      .update(wishlistItems)
      .set({
        status: 'wanted',
        purchased_on: null,
        transaction_id: null,
        updated: new Date()
      })
      .where(
        and(
          eq(wishlistItems.owner_id, owner),
          eq(wishlistItems.id, existing.wishlist_item_id)
        )
      )
  await db
    .delete(transactions)
    .where(and(eq(transactions.owner_id, owner), eq(transactions.id, input.id)))
}

export async function listTransactions(
  db: FinanceStore,
  owner: string,
  input: Input<typeof transactionListInputSchema>
) {
  if (input.from > input.to)
    fail('The start date must come before the end date.')

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.owner_id, owner),
        gte(transactions.occurred_on, input.from),
        lte(transactions.occurred_on, input.to)
      )
    )
    .orderBy(desc(transactions.occurred_on), desc(transactions.created))
    .limit(input.limit + 1)

  return {
    items: rows.slice(0, input.limit).map(transactionDto),
    truncated: rows.length > input.limit
  }
}

/* Summary ----------------------------------------------------------------- */

type FlowRow = {
  kind: 'income' | 'expense' | 'transfer'
  occurred_on: string
  category_id: string | null
  account_id: string
  to_account_id: string | null
  amount: string
  to_amount: string | null
  base_amount: string
  base_gross: string
  base_tax: string
  withheld: boolean
}

async function flows(
  db: FinanceStore,
  owner: string,
  from: CivilDate,
  to: CivilDate
): Promise<FlowRow[]> {
  return db
    .select({
      kind: transactions.kind,
      occurred_on: transactions.occurred_on,
      category_id: transactions.category_id,
      account_id: transactions.account_id,
      to_account_id: transactions.to_account_id,
      amount: transactions.amount,
      to_amount: transactions.to_amount,
      base_amount: transactions.base_amount,
      base_gross: transactions.base_gross,
      base_tax: transactions.base_tax,
      withheld: transactions.withheld
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.owner_id, owner),
        gte(transactions.occurred_on, from),
        lte(transactions.occurred_on, to)
      )
    )
    .orderBy(asc(transactions.occurred_on))
}

export function totalsOf(rows: readonly FlowRow[]): Totals {
  const totals: Totals = {
    income_gross: '0',
    income_tax: '0',
    income_received: '0',
    tax_withheld: '0',
    tax_reserve: '0',
    expense: '0',
    vat: '0',
    net: '0',
    count: 0,
    transfers: 0
  }

  for (const row of rows) {
    if (row.kind === 'transfer') {
      totals.transfers++
      continue
    }

    totals.count++

    if (row.kind === 'income') {
      totals.income_gross = add(totals.income_gross, row.base_gross)
      totals.income_tax = add(totals.income_tax, row.base_tax)
      totals.income_received = add(totals.income_received, row.base_amount)
      if (row.withheld)
        totals.tax_withheld = add(totals.tax_withheld, row.base_tax)
      else totals.tax_reserve = add(totals.tax_reserve, row.base_tax)
    } else {
      totals.expense = add(totals.expense, row.base_amount)
      totals.vat = add(totals.vat, row.base_tax)
    }
  }

  totals.net = sub(totals.income_received, totals.expense)

  return totals
}

export async function getSummary(
  db: FinanceStore,
  owner: string,
  input: Input<typeof summaryInputSchema>
): Promise<Summary> {
  if (input.from > input.to)
    fail('The start date must come before the end date.')
  if (daysBetween(input.from, input.to) > 366 * 40)
    fail('Choose a shorter period.')

  const current = await settingsRow(db, owner)
  const book = await loadRateBook(db, owner, current.values)
  const weekStart = current.values.week_start
  const rows = await flows(db, owner, input.from, input.to)
  const previous =
    input.compare_from && input.compare_to
      ? totalsOf(await flows(db, owner, input.compare_from, input.compare_to))
      : null

  const starts = bucketStarts(input.from, input.to, input.bucket, weekStart)
  const buckets = new Map(
    starts.map(start => [
      start,
      { start, income: '0', expense: '0', tax: '0', net: '0' }
    ])
  )
  const byCategory = new Map<string, Summary['categories'][number]>()

  for (const row of rows) {
    if (row.kind === 'transfer') continue

    const bucket = buckets.get(
      bucketStart(row.occurred_on, input.bucket, weekStart)
    )

    if (bucket) {
      if (row.kind === 'income')
        bucket.income = add(bucket.income, row.base_amount)
      else bucket.expense = add(bucket.expense, row.base_amount)
      bucket.tax = add(bucket.tax, row.base_tax)
    }

    const key = `${row.kind}:${row.category_id ?? ''}`
    const entry = byCategory.get(key) ?? {
      category_id: row.category_id,
      kind: row.kind,
      amount: '0',
      gross: '0',
      tax: '0',
      count: 0
    }

    entry.amount = add(entry.amount, row.base_amount)
    entry.gross = add(entry.gross, row.base_gross)
    entry.tax = add(entry.tax, row.base_tax)
    entry.count++
    byCategory.set(key, entry)
  }

  for (const bucket of buckets.values())
    bucket.net = sub(bucket.income, bucket.expense)

  // Net worth at each bucket's end: native balances valued at today's rates.
  const accountRows = (
    await db.select().from(accounts).where(eq(accounts.owner_id, owner))
  ).filter(row => row.include_in_net_worth)
  const included = new Set(accountRows.map(row => row.id))
  const opening = await accountMovements(db, owner, input.from)
  const balances = new Map(
    accountRows.map(row => [
      row.id,
      add(normalize(row.opening_balance), opening.get(row.id)?.total ?? '0')
    ])
  )
  const currencyOf = new Map(accountRows.map(row => [row.id, row.currency]))
  const unpriced = accountRows.filter(
    row => convert(book, '1', row.currency, book.base) === null
  ).length
  const netWorth: Summary['net_worth'] = []

  let cursor = 0

  for (const [index, start] of starts.entries()) {
    const end = starts[index + 1] ?? null

    while (
      cursor < rows.length &&
      (end === null || rows[cursor]!.occurred_on < end)
    ) {
      const row = rows[cursor++]!
      const move = (account: string | null, delta: Dec) => {
        if (account && included.has(account))
          balances.set(account, add(balances.get(account) ?? '0', delta))
      }

      if (row.kind === 'income') move(row.account_id, row.amount)
      else move(row.account_id, sub('0', row.amount))
      if (row.kind === 'transfer') move(row.to_account_id, row.to_amount ?? '0')
    }

    let value = '0'

    for (const [account, balance] of balances) {
      const converted = convert(
        book,
        balance,
        currencyOf.get(account)!,
        book.base
      )

      if (converted !== null) value = add(value, converted)
    }
    netWorth.push({ start, value })
  }

  return {
    base: book.base,
    from: input.from,
    to: input.to,
    bucket: input.bucket,
    totals: totalsOf(rows),
    previous,
    buckets: [...buckets.values()],
    categories: [...byCategory.values()],
    net_worth: netWorth,
    net_worth_unpriced: unpriced
  }
}

/* Wishlist ---------------------------------------------------------------- */

export async function saveList(
  db: FinanceStore,
  owner: string,
  input: Input<typeof wishlistListSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = wishlistListInputSchema.parse(fields)

  if (!id) {
    const [row] = await db
      .insert(wishlistLists)
      .values({ ...data, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const [existing] = await db
    .select()
    .from(wishlistLists)
    .where(and(eq(wishlistLists.owner_id, owner), eq(wishlistLists.id, id)))
    .limit(1)

  if (!existing) notFound('Wishlist')
  checkUpdated(existing.updated, expected_updated)

  const [row] = await db
    .update(wishlistLists)
    .set({ ...data, updated: nextUpdated(existing.updated) })
    .where(and(eq(wishlistLists.owner_id, owner), eq(wishlistLists.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteList(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const [existing] = await db
    .select()
    .from(wishlistLists)
    .where(
      and(eq(wishlistLists.owner_id, owner), eq(wishlistLists.id, input.id))
    )
    .limit(1)

  if (!existing) notFound('Wishlist')
  checkUpdated(existing.updated, input.expected_updated)
  await db
    .update(wishlistItems)
    .set({ list_id: null })
    .where(
      and(
        eq(wishlistItems.owner_id, owner),
        eq(wishlistItems.list_id, input.id)
      )
    )
  await db
    .delete(wishlistLists)
    .where(
      and(eq(wishlistLists.owner_id, owner), eq(wishlistLists.id, input.id))
    )
}

async function ownedWish(db: FinanceStore, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.owner_id, owner), eq(wishlistItems.id, id)))
    .limit(1)

  return row ?? notFound('Wishlist item')
}

export async function saveWish(
  db: FinanceStore,
  owner: string,
  input: Input<typeof wishlistItemSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = wishlistItemInputSchema.parse(fields)

  if (data.list_id) {
    const [list] = await db
      .select({ id: wishlistLists.id })
      .from(wishlistLists)
      .where(
        and(
          eq(wishlistLists.owner_id, owner),
          eq(wishlistLists.id, data.list_id)
        )
      )

    if (!list) notFound('Wishlist')
  }
  if (data.tax_rule_id)
    requireRuleFor(await ownedRule(db, owner, data.tax_rule_id), 'expense')
  if (data.category_id)
    await ownedCategory(db, owner, data.category_id, 'expense')
  if (data.account_id) await ownedAccount(db, owner, data.account_id)
  await remember(db, owner, data.currency)

  const values = {
    ...data,
    price: normalize(data.price),
    shipping: normalize(data.shipping)
  }

  if (!id) {
    const [row] = await db
      .insert(wishlistItems)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const existing = await ownedWish(db, owner, id)

  checkUpdated(existing.updated, expected_updated)

  const [row] = await db
    .update(wishlistItems)
    .set({ ...values, updated: nextUpdated(existing.updated) })
    .where(and(eq(wishlistItems.owner_id, owner), eq(wishlistItems.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteWish(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const existing = await ownedWish(db, owner, input.id)

  checkUpdated(existing.updated, input.expected_updated)
  // A bought item's expense stays in your history.
  await db
    .update(transactions)
    .set({ wishlist_item_id: null })
    .where(
      and(
        eq(transactions.owner_id, owner),
        eq(transactions.wishlist_item_id, input.id)
      )
    )
  await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.owner_id, owner), eq(wishlistItems.id, input.id))
    )
}

/**
 * One toggle moves an item between the wishlist and your spending. Buying
 * books an expense for the calculated total (price × quantity + shipping +
 * VAT), converted into the paying account's currency; un-buying removes
 * exactly that expense.
 */
export async function purchaseWish(
  db: FinanceStore,
  owner: string,
  input: Input<typeof purchaseInputSchema>,
  today: CivilDate
): Promise<Saved> {
  await lockOwner(db, owner)

  const item = await ownedWish(db, owner, input.id)

  checkUpdated(item.updated, input.expected_updated)

  const updated = nextUpdated(item.updated)

  if (!input.purchased) {
    if (item.status !== 'purchased') return saved(item)
    if (item.transaction_id)
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.owner_id, owner),
            eq(transactions.id, item.transaction_id),
            eq(transactions.wishlist_item_id, item.id)
          )
        )

    const [row] = await db
      .update(wishlistItems)
      .set({
        status: 'wanted',
        purchased_on: null,
        transaction_id: null,
        updated
      })
      .where(
        and(eq(wishlistItems.owner_id, owner), eq(wishlistItems.id, item.id))
      )
      .returning()

    return saved(row!)
  }

  if (item.status === 'purchased') return saved(item)

  const current = await settingsRow(db, owner)
  const accountId =
    input.account_id ?? item.account_id ?? current.values.default_account_id

  if (!accountId) fail('Choose the account you paid from.')

  const categoryId =
    input.category_id ?? item.category_id ?? current.values.wish_category_id
  const rule = item.tax_rule_id
    ? await ownedRule(db, owner, item.tax_rule_id)
    : null
  const book = await loadRateBook(db, owner, current.values, [item.currency])
  const totals = computeWish(
    {
      price: normalize(item.price),
      quantity: item.quantity,
      shipping: normalize(item.shipping),
      currency: item.currency,
      rule: rule ? ruleCore(rule) : null
    },
    book
  )
  const occurredOn = input.occurred_on ?? today
  const values = await prepareBooking(
    db,
    owner,
    {
      kind: 'expense',
      occurred_on: occurredOn,
      account_id: accountId,
      to_account_id: null,
      category_id: categoryId,
      title: item.name,
      notes: item.url,
      entered_amount: totals.total,
      entered_currency: item.currency,
      to_amount: null,
      tax_rule_id: rule?.kind === 'vat' ? rule.id : null,
      tax_basis: 'gross'
    },
    current.values
  )
  const [transaction] = await db
    .insert(transactions)
    .values({ ...values, owner_id: owner, wishlist_item_id: item.id })
    .returning()
  const [row] = await db
    .update(wishlistItems)
    .set({
      status: 'purchased',
      purchased_on: occurredOn,
      transaction_id: transaction!.id,
      updated
    })
    .where(
      and(eq(wishlistItems.owner_id, owner), eq(wishlistItems.id, item.id))
    )
    .returning()

  return saved(row!)
}

/* Recurring plan ---------------------------------------------------------- */

async function ownedRecurring(db: FinanceStore, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(recurring)
    .where(and(eq(recurring.owner_id, owner), eq(recurring.id, id)))
    .limit(1)

  return row ?? notFound('Planned item')
}

export async function saveRecurring(
  db: FinanceStore,
  owner: string,
  input: Input<typeof recurringSaveSchema>
): Promise<Saved> {
  await lockOwner(db, owner)

  const { id, expected_updated, ...fields } = input
  const data = recurringInputSchema.parse(fields)

  if (data.end_on && data.end_on < data.start_on)
    fail('The end date must come after the start date.')
  await ownedAccount(db, owner, data.account_id)
  if (data.category_id)
    await ownedCategory(db, owner, data.category_id, data.kind)
  if (data.tax_rule_id)
    requireRuleFor(await ownedRule(db, owner, data.tax_rule_id), data.kind)
  await remember(db, owner, data.currency)

  const values = { ...data, amount: normalize(data.amount) }

  if (!id) {
    const [row] = await db
      .insert(recurring)
      .values({ ...values, owner_id: owner })
      .returning()

    return saved(row!)
  }

  const existing = await ownedRecurring(db, owner, id)

  checkUpdated(existing.updated, expected_updated)

  let nextIndex = existing.next_index

  const rescheduled =
    existing.cadence !== data.cadence ||
    existing.interval !== data.interval ||
    existing.start_on !== data.start_on

  if (rescheduled) {
    // Continue after the last posted occurrence on the new schedule.
    const [last] = await db
      .select({ date: max(transactions.occurred_on) })
      .from(transactions)
      .where(
        and(eq(transactions.owner_id, owner), eq(transactions.recurring_id, id))
      )
    const schedule = { ...data } as Schedule

    nextIndex = 0
    if (last?.date)
      while (
        nextIndex < 100000 &&
        occurrenceDate(schedule, nextIndex) <= last.date
      )
        nextIndex++
  }

  const [row] = await db
    .update(recurring)
    .set({
      ...values,
      next_index: nextIndex,
      updated: nextUpdated(existing.updated)
    })
    .where(and(eq(recurring.owner_id, owner), eq(recurring.id, id)))
    .returning()

  return saved(row!)
}

export async function deleteRecurring(
  db: FinanceStore,
  owner: string,
  input: Input<typeof deleteInputSchema>
) {
  await lockOwner(db, owner)

  const existing = await ownedRecurring(db, owner, input.id)

  checkUpdated(existing.updated, input.expected_updated)
  await db
    .update(transactions)
    .set({ recurring_id: null, recurring_index: null })
    .where(
      and(
        eq(transactions.owner_id, owner),
        eq(transactions.recurring_id, input.id)
      )
    )
  await db
    .delete(recurring)
    .where(and(eq(recurring.owner_id, owner), eq(recurring.id, input.id)))
}

/**
 * Book due occurrences. Each occurrence has a unique index, so a repeated
 * request or two open tabs can never post the same rent twice.
 */
export async function postRecurring(
  db: FinanceStore,
  owner: string,
  input: Input<typeof recurringPostSchema>
) {
  await lockOwner(db, owner)

  const current = await settingsRow(db, owner)
  const filters: SQL[] = [
    eq(recurring.owner_id, owner),
    eq(recurring.active, true)
  ]

  if (input.id) filters.push(eq(recurring.id, input.id))
  if (input.automatic) filters.push(eq(recurring.auto_post, true))

  const items = await db
    .select()
    .from(recurring)
    .where(and(...filters))

  if (input.id && !items.length) notFound('Planned item')

  let posted = 0

  for (const item of items) {
    const schedule = scheduleOf(item)

    let due = dueOccurrences(schedule, item.next_index, input.today)

    // Recording a planned item by hand books the next one even if it is early.
    if (!due.length && input.id && !input.automatic) {
      const date = occurrenceDate(schedule, item.next_index)

      if (!item.end_on || date <= item.end_on)
        due = [{ index: item.next_index, date }]
    }
    if (!due.length) continue

    for (const occurrence of due) {
      const values = await prepareBooking(
        db,
        owner,
        {
          kind: item.kind,
          occurred_on: occurrence.date,
          account_id: item.account_id,
          to_account_id: null,
          category_id: item.category_id,
          title: item.title,
          notes: item.notes,
          entered_amount: normalize(item.amount),
          entered_currency: item.currency,
          to_amount: null,
          tax_rule_id: item.tax_rule_id,
          tax_basis: item.tax_basis
        },
        current.values
      )
      const inserted = await db
        .insert(transactions)
        .values({
          ...values,
          owner_id: owner,
          recurring_id: item.id,
          recurring_index: occurrence.index
        })
        .onConflictDoNothing()
        .returning({ id: transactions.id })

      posted += inserted.length
    }

    await db
      .update(recurring)
      .set({
        next_index: due.at(-1)!.index + 1,
        posted: item.posted + due.length,
        updated: nextUpdated(item.updated)
      })
      .where(and(eq(recurring.owner_id, owner), eq(recurring.id, item.id)))
  }

  return { posted }
}

/* First-run setup --------------------------------------------------------- */

export async function applySetup(
  db: FinanceStore,
  owner: string,
  input: Input<typeof setupInputSchema>
) {
  await lockOwner(db, owner)

  const current = await settingsRow(db, owner)
  const [existing] = await db
    .select({ rows: count() })
    .from(accounts)
    .where(eq(accounts.owner_id, owner))

  if (current.configured || existing?.rows)
    fail('Finance is already set up for this account.', 409)

  const ruleIds = new Map<string, { id: string; kind: 'vat' | 'income' }>()

  for (const { key, ...rule } of input.tax_rules) {
    const [row] = await db
      .insert(taxRules)
      .values({ ...cleanRule(taxRuleInputSchema.parse(rule)), owner_id: owner })
      .returning()

    ruleIds.set(key, { id: row!.id, kind: row!.kind })
  }

  const categoryIds = new Map<string, { id: string; kind: string }>()
  const ordered = [
    ...input.categories.filter(item => !item.parent_key),
    ...input.categories.filter(item => item.parent_key)
  ]

  for (const { key, parent_key, tax_rule_key, ...category } of ordered) {
    const parent = parent_key ? categoryIds.get(parent_key) : null
    const rule = tax_rule_key ? ruleIds.get(tax_rule_key) : null

    if (parent_key && (!parent || parent.kind !== category.kind))
      fail(`The preset category ${key} has no matching group.`)
    if (rule && category.kind === 'expense' && rule.kind !== 'vat')
      fail(`The preset category ${key} uses an income tax rule.`)

    const data = categoryInputSchema.parse({
      ...category,
      parent_id: parent?.id ?? null,
      tax_rule_id: rule?.id ?? null
    })
    const [row] = await db
      .insert(categories)
      .values({
        ...data,
        budget: data.budget === null ? null : normalize(data.budget),
        owner_id: owner
      })
      .returning()

    categoryIds.set(key, { id: row!.id, kind: row!.kind })
  }

  const accountIds: string[] = []

  for (const { key: _key, ...account } of input.accounts) {
    const data = accountInputSchema.parse(account)
    const [row] = await db
      .insert(accounts)
      .values({
        ...data,
        opening_balance: normalize(data.opening_balance),
        interest_rate:
          data.interest_rate === null ? null : normalize(data.interest_rate),
        owner_id: owner
      })
      .returning()

    accountIds.push(row!.id)
  }

  for (const { key: _key, ...list } of input.lists)
    await db.insert(wishlistLists).values({
      ...wishlistListInputSchema.strip().parse(list),
      owner_id: owner
    })

  const wishCategory = input.wish_category_key
    ? categoryIds.get(input.wish_category_key)
    : undefined
  const values = settingsInputSchema.parse({
    ...current.values,
    base_currency: input.base_currency,
    display_currency: input.base_currency,
    currencies: unique([
      input.base_currency,
      ...input.currencies,
      ...input.accounts.map(account => account.currency)
    ]).slice(0, 40),
    default_account_id: accountIds[0] ?? null,
    wish_category_id: wishCategory?.kind === 'expense' ? wishCategory.id : null
  })

  await db
    .update(settings)
    .set({ values, configured: true, updated: nextUpdated(current.updated) })
    .where(eq(settings.owner_id, owner))

  return getSnapshot(db, owner)
}
