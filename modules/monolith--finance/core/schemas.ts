import z from 'zod'

import { CURRENCY_CODE } from './currencies'
import { cmp } from './money'
import { CIVIL_DATE, isCivilDate } from './periods'

export const instantSchema = z.string().datetime({ offset: true })

/** A non-negative amount with at most eight fraction digits. */
export const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,18}(\.\d{1,8})?$/, 'Enter an amount such as 12.50')

export const signedAmountSchema = z
  .string()
  .trim()
  .regex(/^-?\d{1,18}(\.\d{1,8})?$/, 'Enter an amount such as -12.50')

/** Any decimal produced by the server, e.g. a base-currency total. */
export const decimalSchema = z.string().regex(/^-?\d+(\.\d+)?$/)

export const rateSchema = z
  .string()
  .trim()
  .regex(/^\d{1,18}(\.\d{1,12})?$/, 'Enter a rate such as 1.7')
  .refine(value => cmp(value, '0') > 0, 'A rate must be above zero')

export const percentSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,6})?$/, 'Enter a percentage such as 18')
  .refine(value => cmp(value, '100') < 0, 'Use a rate below 100%')

export const currencySchema = z
  .string()
  .trim()
  .regex(CURRENCY_CODE, 'Use a currency code such as AZN, USD or BTC')

export const civilDateSchema = z
  .string()
  .regex(CIVIL_DATE)
  .refine(isCivilDate, 'Use a real calendar date')

const idSchema = z.string().uuid()
const name = z.string().trim().min(1).max(120)
const icon = z.string().trim().max(100).default('')
const color = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6})?$/)
  .default('')
const notes = z.string().max(5000).default('')
const sort = z.number().int().min(0).max(100000).default(0)

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(value => {
    if (!value) return true

    try {
      const url = new URL(value)

      return ['http:', 'https:'].includes(url.protocol) && !url.password
    } catch {
      return false
    }
  }, 'Use an HTTP or HTTPS link')
  .default('')

const identity = {
  id: idSchema,
  created: instantSchema,
  updated: instantSchema
}
const guard = {
  id: idSchema.optional(),
  expected_updated: instantSchema.optional()
}

export const deleteInputSchema = z
  .object({ id: idSchema, expected_updated: instantSchema })
  .strict()

/* Accounts ---------------------------------------------------------------- */

export const accountKinds = [
  'bank',
  'card',
  'cash',
  'savings',
  'crypto',
  'investment',
  'debt'
] as const

export const accountKindSchema = z.enum(accountKinds)

export const accountInputSchema = z
  .object({
    name,
    kind: accountKindSchema.default('bank'),
    currency: currencySchema.default('AZN'),
    opening_balance: signedAmountSchema.default('0'),
    institution: z.string().trim().max(120).default(''),
    icon,
    color,
    interest_rate: percentSchema.nullable().default(null),
    include_in_net_worth: z.boolean().default(true),
    archived: z.boolean().default(false),
    sort,
    notes
  })
  .strict()

export const accountSaveSchema = accountInputSchema.extend(guard).strict()

export const accountSchema = accountInputSchema.extend({
  ...identity,
  balance: decimalSchema,
  base_balance: decimalSchema.nullable(),
  transactions: z.number().int().min(0)
})

/* Categories and income streams ------------------------------------------- */

export const categoryKindSchema = z.enum(['income', 'expense'])

export const categoryInputSchema = z
  .object({
    name,
    kind: categoryKindSchema.default('expense'),
    parent_id: idSchema.nullable().default(null),
    icon,
    color,
    /** A monthly budget in the base currency. */
    budget: amountSchema.nullable().default(null),
    tax_rule_id: idSchema.nullable().default(null),
    archived: z.boolean().default(false),
    sort,
    notes
  })
  .strict()

export const categorySaveSchema = categoryInputSchema.extend(guard).strict()

export const categorySchema = categoryInputSchema.extend(identity)

/* Tax rules --------------------------------------------------------------- */

export const bracketSchema = z
  .object({ up_to: amountSchema.nullable(), rate: percentSchema })
  .strict()

export const taxComponentSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    brackets: z.array(bracketSchema).min(1).max(12)
  })
  .strict()

export const taxRuleInputSchema = z
  .object({
    name,
    kind: z.enum(['vat', 'income']).default('vat'),
    rate: percentSchema.default('0'),
    inclusive: z.boolean().default(true),
    withheld: z.boolean().default(false),
    components: z.array(taxComponentSchema).max(8).default([]),
    archived: z.boolean().default(false),
    notes
  })
  .strict()

export const taxRuleSaveSchema = taxRuleInputSchema.extend(guard).strict()

export const taxRuleSchema = taxRuleInputSchema.extend(identity)

/* Transactions ------------------------------------------------------------ */

export const transactionKindSchema = z.enum(['income', 'expense', 'transfer'])

export const taxBasisSchema = z.enum(['gross', 'net'])

export const transactionInputSchema = z
  .object({
    kind: transactionKindSchema,
    occurred_on: civilDateSchema,
    account_id: idSchema,
    to_account_id: idSchema.nullable().default(null),
    category_id: idSchema.nullable().default(null),
    title: z.string().trim().max(200).default(''),
    notes,
    entered_amount: amountSchema,
    entered_currency: currencySchema,
    to_amount: amountSchema.nullable().default(null),
    tax_rule_id: idSchema.nullable().default(null),
    tax_basis: taxBasisSchema.default('gross')
  })
  .strict()

export const transactionSaveSchema = transactionInputSchema
  .extend(guard)
  .strict()

const taxPartSchema = z.object({ label: z.string(), tax: decimalSchema })

export const transactionSchema = transactionInputSchema.extend({
  ...identity,
  amount: decimalSchema,
  gross_amount: decimalSchema,
  tax_amount: decimalSchema,
  net_amount: decimalSchema,
  to_amount: decimalSchema.nullable(),
  base_rate: decimalSchema,
  base_amount: decimalSchema,
  base_gross: decimalSchema,
  base_tax: decimalSchema,
  base_net: decimalSchema,
  withheld: z.boolean(),
  tax_name: z.string(),
  tax_parts: z.array(taxPartSchema),
  wishlist_item_id: idSchema.nullable(),
  recurring_id: idSchema.nullable()
})

export const transactionListInputSchema = z
  .object({
    from: civilDateSchema,
    to: civilDateSchema,
    limit: z.coerce.number().int().min(1).max(5000).default(2000)
  })
  .strict()

export const transactionListSchema = z.object({
  items: z.array(transactionSchema),
  truncated: z.boolean()
})

/* Wishlist ---------------------------------------------------------------- */

export const wishlistListInputSchema = z
  .object({ name, icon, color, sort, archived: z.boolean().default(false) })
  .strict()

export const wishlistListSaveSchema = wishlistListInputSchema
  .extend(guard)
  .strict()

export const wishlistListSchema = wishlistListInputSchema.extend(identity)

export const prioritySchema = z.enum(['low', 'medium', 'high'])

export const wishlistItemInputSchema = z
  .object({
    list_id: idSchema.nullable().default(null),
    name: z.string().trim().min(1).max(200),
    url: httpUrlSchema,
    price: amountSchema,
    currency: currencySchema,
    quantity: z.number().int().min(1).max(1000).default(1),
    shipping: amountSchema.default('0'),
    tax_rule_id: idSchema.nullable().default(null),
    priority: prioritySchema.default('medium'),
    target_on: civilDateSchema.nullable().default(null),
    category_id: idSchema.nullable().default(null),
    account_id: idSchema.nullable().default(null),
    sort,
    notes
  })
  .strict()

export const wishlistItemSaveSchema = wishlistItemInputSchema
  .extend(guard)
  .strict()

export const wishlistItemSchema = wishlistItemInputSchema.extend({
  ...identity,
  status: z.enum(['wanted', 'purchased']),
  purchased_on: civilDateSchema.nullable(),
  transaction_id: idSchema.nullable(),
  subtotal: decimalSchema,
  tax: decimalSchema,
  total: decimalSchema,
  base_total: decimalSchema.nullable()
})

export const purchaseInputSchema = z
  .object({
    id: idSchema,
    expected_updated: instantSchema,
    purchased: z.boolean(),
    account_id: idSchema.nullable().default(null),
    category_id: idSchema.nullable().default(null),
    occurred_on: civilDateSchema.nullable().default(null)
  })
  .strict()

/* Recurring plan ---------------------------------------------------------- */

export const cadenceSchema = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
])

export const recurringInputSchema = z
  .object({
    kind: categoryKindSchema,
    title: name,
    account_id: idSchema,
    category_id: idSchema.nullable().default(null),
    amount: amountSchema,
    currency: currencySchema,
    tax_rule_id: idSchema.nullable().default(null),
    tax_basis: taxBasisSchema.default('gross'),
    cadence: cadenceSchema.default('monthly'),
    interval: z.number().int().min(1).max(52).default(1),
    start_on: civilDateSchema,
    end_on: civilDateSchema.nullable().default(null),
    auto_post: z.boolean().default(false),
    active: z.boolean().default(true),
    notes
  })
  .strict()

export const recurringSaveSchema = recurringInputSchema.extend(guard).strict()

export const recurringSchema = recurringInputSchema.extend({
  ...identity,
  next_index: z.number().int().min(0),
  next_on: civilDateSchema.nullable(),
  posted: z.number().int().min(0)
})

export const recurringPostSchema = z
  .object({
    id: idSchema.optional(),
    today: civilDateSchema,
    /** Post only auto-post items, as the app does on open. */
    automatic: z.boolean().default(false)
  })
  .strict()

export const recurringPostResultSchema = z.object({ posted: z.number().int() })

/* Settings and rates ------------------------------------------------------ */

export const settingsInputSchema = z
  .object({
    base_currency: currencySchema.default('AZN'),
    display_currency: currencySchema.default('AZN'),
    currencies: z
      .array(currencySchema)
      .min(1)
      .max(40)
      .default(['AZN', 'USD', 'EUR']),
    week_start: z.number().int().min(1).max(7).default(1),
    default_account_id: idSchema.nullable().default(null),
    wish_category_id: idSchema.nullable().default(null)
  })
  .strict()

export const settingsSaveSchema = settingsInputSchema
  .extend({ expected_updated: instantSchema.optional() })
  .strict()

export const settingsSchema = settingsInputSchema.extend({
  updated: instantSchema,
  configured: z.boolean()
})

export const rateSourceSchema = z.enum(['base', 'custom', 'market', 'missing'])

export const rateEntrySchema = z.object({
  code: z.string(),
  rate: decimalSchema.nullable(),
  source: rateSourceSchema,
  market: decimalSchema.nullable(),
  custom: decimalSchema.nullable(),
  market_at: instantSchema.nullable()
})

export const rateBookSchema = z.object({
  base: z.string(),
  entries: z.record(z.string(), rateEntrySchema)
})

export const rateSaveSchema = z
  .object({ code: currencySchema, custom_rate: rateSchema.nullable() })
  .strict()

export const rateRefreshSchema = z.object({
  rates: rateBookSchema,
  refreshed: z.array(z.string()),
  failed: z.array(z.string())
})

/* Snapshot and setup ------------------------------------------------------ */

export const snapshotSchema = z.object({
  settings: settingsSchema,
  rates: rateBookSchema,
  accounts: z.array(accountSchema),
  categories: z.array(categorySchema),
  tax_rules: z.array(taxRuleSchema),
  lists: z.array(wishlistListSchema),
  wishes: z.array(wishlistItemSchema),
  recurring: z.array(recurringSchema),
  earliest_on: civilDateSchema.nullable(),
  transaction_count: z.number().int().min(0)
})

const key = z.string().trim().min(1).max(60)

export const setupInputSchema = z
  .object({
    base_currency: currencySchema,
    currencies: z.array(currencySchema).min(1).max(40),
    accounts: z.array(accountInputSchema.extend({ key }).strict()).max(30),
    tax_rules: z.array(taxRuleInputSchema.extend({ key }).strict()).max(30),
    categories: z
      .array(
        categoryInputSchema
          .omit({ parent_id: true, tax_rule_id: true })
          .extend({
            key,
            parent_key: key.nullable().default(null),
            tax_rule_key: key.nullable().default(null)
          })
          .strict()
      )
      .max(200),
    lists: z.array(wishlistListInputSchema.extend({ key }).strict()).max(40),
    /** The expense category wishlist purchases book into. */
    wish_category_key: key.nullable().default(null)
  })
  .strict()

/* Summary ----------------------------------------------------------------- */

export const bucketSchema = z.enum(['day', 'week', 'month', 'year'])

export const summaryInputSchema = z
  .object({
    from: civilDateSchema,
    to: civilDateSchema,
    bucket: bucketSchema,
    compare_from: civilDateSchema.optional(),
    compare_to: civilDateSchema.optional()
  })
  .strict()

export const totalsSchema = z.object({
  income_gross: decimalSchema,
  income_tax: decimalSchema,
  income_received: decimalSchema,
  tax_withheld: decimalSchema,
  tax_reserve: decimalSchema,
  expense: decimalSchema,
  vat: decimalSchema,
  net: decimalSchema,
  count: z.number().int(),
  transfers: z.number().int()
})

export const summarySchema = z.object({
  base: z.string(),
  from: civilDateSchema,
  to: civilDateSchema,
  bucket: bucketSchema,
  totals: totalsSchema,
  previous: totalsSchema.nullable(),
  buckets: z.array(
    z.object({
      start: civilDateSchema,
      income: decimalSchema,
      expense: decimalSchema,
      tax: decimalSchema,
      net: decimalSchema
    })
  ),
  categories: z.array(
    z.object({
      category_id: idSchema.nullable(),
      kind: categoryKindSchema,
      amount: decimalSchema,
      gross: decimalSchema,
      tax: decimalSchema,
      count: z.number().int()
    })
  ),
  net_worth: z.array(
    z.object({ start: civilDateSchema, value: decimalSchema })
  ),
  net_worth_unpriced: z.number().int()
})

export type Account = z.infer<typeof accountSchema>

export type AccountInput = z.infer<typeof accountInputSchema>

export type AccountKind = z.infer<typeof accountKindSchema>

export type Category = z.infer<typeof categorySchema>

export type CategoryInput = z.infer<typeof categoryInputSchema>

export type TaxRule = z.infer<typeof taxRuleSchema>

export type TaxRuleInput = z.infer<typeof taxRuleInputSchema>

export type Transaction = z.infer<typeof transactionSchema>

export type TransactionInput = z.infer<typeof transactionInputSchema>

export type WishlistList = z.infer<typeof wishlistListSchema>

export type WishlistItem = z.infer<typeof wishlistItemSchema>

export type WishlistItemInput = z.infer<typeof wishlistItemInputSchema>

export type Recurring = z.infer<typeof recurringSchema>

export type RecurringInput = z.infer<typeof recurringInputSchema>

export type Settings = z.infer<typeof settingsSchema>

export type SettingsInput = z.infer<typeof settingsInputSchema>

export type Snapshot = z.infer<typeof snapshotSchema>

export type Summary = z.infer<typeof summarySchema>

export type Totals = z.infer<typeof totalsSchema>

export type SetupInput = z.input<typeof setupInputSchema>
