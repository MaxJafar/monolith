import { type RelationsBuilder } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@lifeforge/drizzle'

const pgTable = createModuleTable()

export type LocationCoords = { lon: number; lat: number }

export const walletIncomeExpenseTypeEnum = pgEnum(
  'wallet_income_expense_type',
  ['income', 'expenses']
)

export const walletTransactionTypeEnum = pgEnum('wallet_transaction_type', [
  'transfer',
  'income_expenses'
])

export const walletAssets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  starting_balance: doublePrecision('starting_balance').notNull().default(0),
  is_liability: boolean('is_liability').notNull().default(false),
  credit_limit: doublePrecision('credit_limit').notNull().default(0)
})

export const walletLedgers = pgTable('ledgers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default('')
})

export const walletCategories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default(''),
  type: walletIncomeExpenseTypeEnum('type').notNull().default('expenses')
})

export const walletPlatforms = pgTable('platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default('')
})

export const walletTransactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: walletTransactionTypeEnum('type').notNull().default('income_expenses'),
  amount: doublePrecision('amount').notNull().default(0),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  receipt: text('receipt').notNull().default(''),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const walletTransactionsIncomeExpenses = pgTable(
  'transactions_income_expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    base_transaction: uuid('base_transaction')
      .notNull()
      .references(() => walletTransactions.id, { onDelete: 'cascade' }),
    type: walletIncomeExpenseTypeEnum('type').notNull().default('expenses'),
    particulars: text('particulars').notNull().default(''),
    asset: uuid('asset').references(() => walletAssets.id, {
      onDelete: 'set null'
    }),
    category: uuid('category').references(() => walletCategories.id, {
      onDelete: 'set null'
    }),
    platform: uuid('platform').references(() => walletPlatforms.id, {
      onDelete: 'set null'
    }),
    ledgers: jsonb('ledgers').$type<string[]>().notNull().default([]),
    location_name: text('location_name').notNull().default(''),
    location_coords: jsonb('location_coords').$type<LocationCoords | null>()
  }
)

export const walletTransactionsTransfer = pgTable('transactions_transfer', {
  id: uuid('id').defaultRandom().primaryKey(),
  base_transaction: uuid('base_transaction')
    .notNull()
    .references(() => walletTransactions.id, { onDelete: 'cascade' }),
  from: uuid('from').references(() => walletAssets.id, {
    onDelete: 'set null'
  }),
  to: uuid('to').references(() => walletAssets.id, { onDelete: 'set null' })
})

export const walletTransactionTemplates = pgTable('transaction_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  type: walletIncomeExpenseTypeEnum('type').notNull().default('expenses'),
  amount: doublePrecision('amount').notNull().default(0),
  particulars: text('particulars').notNull().default(''),
  asset: uuid('asset').references(() => walletAssets.id, {
    onDelete: 'set null'
  }),
  category: uuid('category').references(() => walletCategories.id, {
    onDelete: 'set null'
  }),
  platform: uuid('platform').references(() => walletPlatforms.id, {
    onDelete: 'set null'
  }),
  ledgers: jsonb('ledgers').$type<string[]>().notNull().default([]),
  location_name: text('location_name').notNull().default(''),
  location_coords: jsonb('location_coords').$type<LocationCoords | null>()
})

export const walletTransactionsPrompts = pgTable('transactions_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  income: text('income').notNull().default(''),
  expenses: text('expenses').notNull().default('')
})

export const walletBudgets = pgTable('budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: uuid('category').references(() => walletCategories.id, {
    onDelete: 'set null'
  }),
  amount: doublePrecision('amount').notNull().default(0),
  rollover_enabled: boolean('rollover_enabled').notNull().default(false),
  rollover_cap: doublePrecision('rollover_cap').notNull().default(0),
  alert_thresholds: jsonb('alert_thresholds')
    .$type<number[]>()
    .notNull()
    .default([]),
  is_active: boolean('is_active').notNull().default(true),
  year: integer('year').notNull().default(0),
  month: integer('month').notNull().default(0),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const walletSavingsGoals = pgTable('savings_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default(''),
  target_amount: doublePrecision('target_amount').notNull().default(0),
  current_amount: doublePrecision('current_amount').notNull().default(0),
  target_date: timestamp('target_date', { mode: 'date' }),
  asset: uuid('asset').references(() => walletAssets.id, {
    onDelete: 'set null'
  }),
  is_active: boolean('is_active').notNull().default(true),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const tables = {
  assets: walletAssets,
  ledgers: walletLedgers,
  categories: walletCategories,
  platforms: walletPlatforms,
  transactions: walletTransactions,
  transactions_income_expenses: walletTransactionsIncomeExpenses,
  transactions_transfer: walletTransactionsTransfer,
  transaction_templates: walletTransactionTemplates,
  transactions_prompts: walletTransactionsPrompts,
  budgets: walletBudgets,
  savings_goals: walletSavingsGoals
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  transactions_income_expenses: {
    base_transaction_info: r.one.transactions({
      from: r.transactions_income_expenses.base_transaction,
      to: r.transactions.id
    }),
    asset_info: r.one.assets({
      from: r.transactions_income_expenses.asset,
      to: r.assets.id
    }),
    category_info: r.one.categories({
      from: r.transactions_income_expenses.category,
      to: r.categories.id
    }),
    platform_info: r.one.platforms({
      from: r.transactions_income_expenses.platform,
      to: r.platforms.id
    })
  },
  transactions_transfer: {
    base_transaction_info: r.one.transactions({
      from: r.transactions_transfer.base_transaction,
      to: r.transactions.id
    }),
    from_info: r.one.assets({
      from: r.transactions_transfer.from,
      to: r.assets.id
    }),
    to_info: r.one.assets({
      from: r.transactions_transfer.to,
      to: r.assets.id
    })
  },
  transaction_templates: {
    asset_info: r.one.assets({
      from: r.transaction_templates.asset,
      to: r.assets.id
    }),
    category_info: r.one.categories({
      from: r.transaction_templates.category,
      to: r.categories.id
    }),
    platform_info: r.one.platforms({
      from: r.transaction_templates.platform,
      to: r.platforms.id
    })
  },
  budgets: {
    category_info: r.one.categories({
      from: r.budgets.category,
      to: r.categories.id
    })
  },
  savings_goals: {
    asset_info: r.one.assets({
      from: r.savings_goals.asset,
      to: r.assets.id
    })
  }
})
