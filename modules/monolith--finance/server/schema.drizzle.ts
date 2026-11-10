import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

import type { AccountKind, SettingsInput, TaxRuleInput } from '../core/schemas'

const table = createModuleTable('finance')
const instant = (name: string) =>
  timestamp(name, { mode: 'date', withTimezone: true })
const civil = (name: string) => date(name, { mode: 'string' })
/** Amounts: 28 digits with 8 after the point, exact in Postgres. */
const money = (name: string) =>
  numeric(name, { precision: 28, scale: 8, mode: 'string' })
/** Exchange rates keep 12 fraction digits. */
const rate = (name: string) =>
  numeric(name, { precision: 30, scale: 12, mode: 'string' })
const percent = (name: string) =>
  numeric(name, { precision: 9, scale: 6, mode: 'string' })
const identity = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull(),
  created: instant('created').notNull().defaultNow(),
  updated: instant('updated').notNull().defaultNow()
})

export const settings = table('settings', {
  owner_id: uuid('owner_id').primaryKey(),
  values: jsonb('values').$type<SettingsInput>().notNull(),
  configured: boolean('configured').notNull().default(false),
  updated: instant('updated').notNull().defaultNow()
})

export const accounts = table(
  'accounts',
  {
    ...identity(),
    name: varchar('name', { length: 120 }).notNull(),
    kind: varchar('kind', { length: 20 }).$type<AccountKind>().notNull(),
    currency: varchar('currency', { length: 10 }).notNull(),
    opening_balance: money('opening_balance').notNull().default('0'),
    institution: varchar('institution', { length: 120 }).notNull().default(''),
    icon: varchar('icon', { length: 100 }).notNull().default(''),
    color: varchar('color', { length: 7 }).notNull().default(''),
    interest_rate: percent('interest_rate'),
    include_in_net_worth: boolean('include_in_net_worth')
      .notNull()
      .default(true),
    archived: boolean('archived').notNull().default(false),
    sort: integer('sort').notNull().default(0),
    notes: text('notes').notNull().default('')
  },
  t => [
    uniqueIndex('finance_account_identity').on(t.owner_id, t.id),
    index('finance_account_owner_sort').on(t.owner_id, t.sort),
    check(
      'finance_account_kind',
      sql`${t.kind} in ('bank','card','cash','savings','crypto','investment','debt')`
    )
  ]
)

export const taxRules = table(
  'tax_rules',
  {
    ...identity(),
    name: varchar('name', { length: 120 }).notNull(),
    kind: varchar('kind', { length: 10 })
      .$type<TaxRuleInput['kind']>()
      .notNull(),
    rate: percent('rate').notNull().default('0'),
    inclusive: boolean('inclusive').notNull().default(true),
    withheld: boolean('withheld').notNull().default(false),
    components: jsonb('components')
      .$type<TaxRuleInput['components']>()
      .notNull()
      .default([]),
    archived: boolean('archived').notNull().default(false),
    notes: text('notes').notNull().default('')
  },
  t => [
    uniqueIndex('finance_tax_rule_identity').on(t.owner_id, t.id),
    check('finance_tax_rule_kind', sql`${t.kind} in ('vat','income')`),
    check('finance_tax_rule_rate', sql`${t.rate} >= 0 and ${t.rate} < 100`)
  ]
)

export const categories = table(
  'categories',
  {
    ...identity(),
    name: varchar('name', { length: 120 }).notNull(),
    kind: varchar('kind', { length: 10 })
      .$type<'income' | 'expense'>()
      .notNull(),
    parent_id: uuid('parent_id'),
    icon: varchar('icon', { length: 100 }).notNull().default(''),
    color: varchar('color', { length: 7 }).notNull().default(''),
    budget: money('budget'),
    tax_rule_id: uuid('tax_rule_id'),
    archived: boolean('archived').notNull().default(false),
    sort: integer('sort').notNull().default(0),
    notes: text('notes').notNull().default('')
  },
  t => [
    uniqueIndex('finance_category_identity').on(t.owner_id, t.id),
    index('finance_category_owner_kind').on(t.owner_id, t.kind, t.sort),
    foreignKey({
      columns: [t.owner_id, t.parent_id],
      foreignColumns: [t.owner_id, t.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.tax_rule_id],
      foreignColumns: [taxRules.owner_id, taxRules.id]
    }).onDelete('restrict'),
    check('finance_category_kind', sql`${t.kind} in ('income','expense')`),
    check(
      'finance_category_budget',
      sql`${t.budget} is null or ${t.budget} >= 0`
    ),
    check(
      'finance_category_parent',
      sql`${t.parent_id} is null or ${t.parent_id} <> ${t.id}`
    )
  ]
)

export const recurring = table(
  'recurring',
  {
    ...identity(),
    kind: varchar('kind', { length: 10 })
      .$type<'income' | 'expense'>()
      .notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    account_id: uuid('account_id').notNull(),
    category_id: uuid('category_id'),
    amount: money('amount').notNull(),
    currency: varchar('currency', { length: 10 }).notNull(),
    tax_rule_id: uuid('tax_rule_id'),
    tax_basis: varchar('tax_basis', { length: 5 })
      .$type<'gross' | 'net'>()
      .notNull()
      .default('gross'),
    cadence: varchar('cadence', { length: 10 })
      .$type<'weekly' | 'monthly' | 'quarterly' | 'yearly'>()
      .notNull(),
    interval: integer('interval').notNull().default(1),
    start_on: civil('start_on').notNull(),
    end_on: civil('end_on'),
    next_index: integer('next_index').notNull().default(0),
    posted: integer('posted').notNull().default(0),
    auto_post: boolean('auto_post').notNull().default(false),
    active: boolean('active').notNull().default(true),
    notes: text('notes').notNull().default('')
  },
  t => [
    uniqueIndex('finance_recurring_identity').on(t.owner_id, t.id),
    foreignKey({
      columns: [t.owner_id, t.account_id],
      foreignColumns: [accounts.owner_id, accounts.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.category_id],
      foreignColumns: [categories.owner_id, categories.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.tax_rule_id],
      foreignColumns: [taxRules.owner_id, taxRules.id]
    }).onDelete('restrict'),
    check('finance_recurring_kind', sql`${t.kind} in ('income','expense')`),
    check(
      'finance_recurring_cadence',
      sql`${t.cadence} in ('weekly','monthly','quarterly','yearly')`
    ),
    check('finance_recurring_interval', sql`${t.interval} between 1 and 52`),
    check('finance_recurring_amount', sql`${t.amount} >= 0`),
    check('finance_recurring_basis', sql`${t.tax_basis} in ('gross','net')`)
  ]
)

export const wishlistLists = table(
  'wishlist_lists',
  {
    ...identity(),
    name: varchar('name', { length: 120 }).notNull(),
    icon: varchar('icon', { length: 100 }).notNull().default(''),
    color: varchar('color', { length: 7 }).notNull().default(''),
    sort: integer('sort').notNull().default(0),
    archived: boolean('archived').notNull().default(false)
  },
  t => [uniqueIndex('finance_wishlist_list_identity').on(t.owner_id, t.id)]
)

export const wishlistItems = table(
  'wishlist_items',
  {
    ...identity(),
    list_id: uuid('list_id'),
    name: varchar('name', { length: 200 }).notNull(),
    url: text('url').notNull().default(''),
    price: money('price').notNull(),
    currency: varchar('currency', { length: 10 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    shipping: money('shipping').notNull().default('0'),
    tax_rule_id: uuid('tax_rule_id'),
    priority: varchar('priority', { length: 10 })
      .$type<'low' | 'medium' | 'high'>()
      .notNull()
      .default('medium'),
    target_on: civil('target_on'),
    category_id: uuid('category_id'),
    account_id: uuid('account_id'),
    status: varchar('status', { length: 10 })
      .$type<'wanted' | 'purchased'>()
      .notNull()
      .default('wanted'),
    purchased_on: civil('purchased_on'),
    transaction_id: uuid('transaction_id'),
    sort: integer('sort').notNull().default(0),
    notes: text('notes').notNull().default('')
  },
  t => [
    uniqueIndex('finance_wishlist_item_identity').on(t.owner_id, t.id),
    index('finance_wishlist_item_list').on(t.owner_id, t.list_id, t.sort),
    foreignKey({
      columns: [t.owner_id, t.list_id],
      foreignColumns: [wishlistLists.owner_id, wishlistLists.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.tax_rule_id],
      foreignColumns: [taxRules.owner_id, taxRules.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.category_id],
      foreignColumns: [categories.owner_id, categories.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.account_id],
      foreignColumns: [accounts.owner_id, accounts.id]
    }).onDelete('restrict'),
    check(
      'finance_wishlist_item_status',
      sql`${t.status} in ('wanted','purchased')`
    ),
    check(
      'finance_wishlist_item_priority',
      sql`${t.priority} in ('low','medium','high')`
    ),
    check(
      'finance_wishlist_item_quantity',
      sql`${t.quantity} between 1 and 1000`
    ),
    check(
      'finance_wishlist_item_amounts',
      sql`${t.price} >= 0 and ${t.shipping} >= 0`
    )
  ]
)

export type TaxSnapshot = {
  name: string
  kind: 'vat' | 'income' | null
  parts: { label: string; tax: string }[]
}

export const transactions = table(
  'transactions',
  {
    ...identity(),
    kind: varchar('kind', { length: 10 })
      .$type<'income' | 'expense' | 'transfer'>()
      .notNull(),
    occurred_on: civil('occurred_on').notNull(),
    account_id: uuid('account_id').notNull(),
    to_account_id: uuid('to_account_id'),
    category_id: uuid('category_id'),
    title: varchar('title', { length: 200 }).notNull().default(''),
    notes: text('notes').notNull().default(''),
    entered_amount: money('entered_amount').notNull(),
    entered_currency: varchar('entered_currency', { length: 10 }).notNull(),
    amount: money('amount').notNull(),
    gross_amount: money('gross_amount').notNull(),
    tax_amount: money('tax_amount').notNull().default('0'),
    net_amount: money('net_amount').notNull(),
    to_amount: money('to_amount'),
    tax_rule_id: uuid('tax_rule_id'),
    tax_basis: varchar('tax_basis', { length: 5 })
      .$type<'gross' | 'net'>()
      .notNull()
      .default('gross'),
    tax_snapshot: jsonb('tax_snapshot').$type<TaxSnapshot>(),
    withheld: boolean('withheld').notNull().default(false),
    base_rate: rate('base_rate').notNull(),
    base_amount: money('base_amount').notNull(),
    base_gross: money('base_gross').notNull(),
    base_tax: money('base_tax').notNull().default('0'),
    base_net: money('base_net').notNull(),
    wishlist_item_id: uuid('wishlist_item_id'),
    recurring_id: uuid('recurring_id'),
    recurring_index: integer('recurring_index')
  },
  t => [
    uniqueIndex('finance_transaction_identity').on(t.owner_id, t.id),
    index('finance_transaction_owner_date').on(t.owner_id, t.occurred_on),
    index('finance_transaction_account').on(t.owner_id, t.account_id),
    index('finance_transaction_to_account').on(t.owner_id, t.to_account_id),
    index('finance_transaction_category').on(t.owner_id, t.category_id),
    uniqueIndex('finance_transaction_recurring').on(
      t.owner_id,
      t.recurring_id,
      t.recurring_index
    ),
    uniqueIndex('finance_transaction_wish').on(t.owner_id, t.wishlist_item_id),
    foreignKey({
      columns: [t.owner_id, t.account_id],
      foreignColumns: [accounts.owner_id, accounts.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.to_account_id],
      foreignColumns: [accounts.owner_id, accounts.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.category_id],
      foreignColumns: [categories.owner_id, categories.id]
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.owner_id, t.tax_rule_id],
      foreignColumns: [taxRules.owner_id, taxRules.id]
    }).onDelete('restrict'),
    check(
      'finance_transaction_kind',
      sql`${t.kind} in ('income','expense','transfer')`
    ),
    check(
      'finance_transaction_transfer',
      sql`(${t.kind} = 'transfer') = (${t.to_account_id} is not null)`
    ),
    check(
      'finance_transaction_accounts',
      sql`${t.to_account_id} is null or ${t.to_account_id} <> ${t.account_id}`
    ),
    check(
      'finance_transaction_amounts',
      sql`${t.amount} >= 0 and ${t.gross_amount} >= 0 and ${t.tax_amount} >= 0 and ${t.base_rate} > 0`
    ),
    check(
      'finance_transaction_reconciles',
      sql`${t.gross_amount} - ${t.tax_amount} = ${t.net_amount} and ${t.base_gross} - ${t.base_tax} = ${t.base_net}`
    )
  ]
)

export const rates = table(
  'rates',
  {
    owner_id: uuid('owner_id').notNull(),
    code: varchar('code', { length: 10 }).notNull(),
    custom_rate: rate('custom_rate'),
    market_usd: rate('market_usd'),
    market_per_usd: rate('market_per_usd'),
    market_at: instant('market_at'),
    updated: instant('updated').notNull().defaultNow()
  },
  t => [
    primaryKey({ columns: [t.owner_id, t.code] }),
    check(
      'finance_rate_positive',
      sql`(${t.custom_rate} is null or ${t.custom_rate} > 0) and (${t.market_usd} is null or ${t.market_usd} > 0) and (${t.market_per_usd} is null or ${t.market_per_usd} > 0)`
    )
  ]
)

export const tables = {
  settings,
  accounts,
  taxRules,
  categories,
  recurring,
  wishlistLists,
  wishlistItems,
  transactions,
  rates
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({
  settings: {},
  accounts: {},
  taxRules: {},
  categories: {},
  recurring: {},
  wishlistLists: {},
  wishlistItems: {},
  transactions: {},
  rates: {}
})
