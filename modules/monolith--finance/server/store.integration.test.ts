import dotenv from 'dotenv'
import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import { add, sub } from '../core/money'
import {
  setupInputSchema,
  transactionSaveSchema,
  wishlistItemSaveSchema
} from '../core/schemas'
import { relations, tables } from './schema.drizzle'
import * as schema from './schema.drizzle'
import {
  type FinanceStore,
  applySetup,
  deleteTransaction,
  getSnapshot,
  getSummary,
  listTransactions,
  postRecurring,
  purchaseWish,
  saveRate,
  saveRecurring,
  saveSettings,
  saveTransaction,
  saveWish
} from './store'

const enabled = process.env.ZILLION_INTEGRATION === '1'

if (enabled)
  dotenv.config({
    path: fileURLToPath(new URL('../../../env/.env.local', import.meta.url)),
    quiet: true
  })

const connection = process.env.DATABASE_URL ?? ''

if (enabled) {
  const target = new URL(connection)

  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Finance integration tests require an isolated loopback database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 4, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owners = new Set<string>()

function owner() {
  const id = randomUUID()

  owners.add(id)

  return id
}

async function as<T>(id: string, work: (tx: FinanceStore) => Promise<T>) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${id},true)`)

    return work(tx)
  })
}

const setup = (base = 'AZN') =>
  setupInputSchema.parse({
    base_currency: base,
    currencies: ['USD'],
    accounts: [
      {
        key: 'azn',
        name: 'Bank A',
        kind: 'bank',
        currency: 'AZN',
        opening_balance: '1000'
      },
      { key: 'usd', name: 'Card USD', kind: 'card', currency: 'USD' }
    ],
    tax_rules: [
      {
        key: 'vat',
        name: 'Digital VAT',
        kind: 'vat',
        rate: '18',
        inclusive: false
      },
      {
        key: 'voen',
        name: 'VÖEN 2%',
        kind: 'income',
        withheld: false,
        components: [
          { label: 'Simplified', brackets: [{ up_to: null, rate: '2' }] }
        ]
      }
    ],
    categories: [
      {
        key: 'subs',
        name: 'Subscriptions',
        kind: 'expense',
        tax_rule_key: 'vat'
      },
      {
        key: 'ai',
        name: 'AI tools',
        kind: 'expense',
        parent_key: 'subs',
        tax_rule_key: 'vat'
      },
      { key: 'home', name: 'Household', kind: 'expense' },
      {
        key: 'freelance',
        name: 'Freelance',
        kind: 'income',
        tax_rule_key: 'voen'
      }
    ],
    lists: [{ key: 'tech', name: 'Tech' }],
    wish_category_key: 'home'
  })

afterAll(async () => {
  if (enabled)
    for (const id of owners)
      await as(id, async tx => {
        for (const table of [
          schema.transactions,
          schema.wishlistItems,
          schema.wishlistLists,
          schema.recurring,
          schema.categories,
          schema.taxRules,
          schema.accounts,
          schema.rates,
          schema.settings
        ])
          await tx.delete(table).where(eq(table.owner_id, id))
      })
  await client.end()
})

describe.skipIf(!enabled)('Finance on PostgreSQL with owner RLS', () => {
  it('forces owner row security on every Finance table for a non-bypass role', async () => {
    const [role] = await db.execute<{
      rolsuper: boolean
      rolbypassrls: boolean
    }>(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`
    )

    expect(role).toMatchObject({ rolsuper: false, rolbypassrls: false })

    const catalog = await db.execute<{
      relname: string
      relforcerowsecurity: boolean
    }>(
      sql`select relname, relforcerowsecurity from pg_class where relname like 'finance\\_\\_%' and relkind = 'r'`
    )

    expect(catalog.length).toBe(9)
    expect(catalog.every(row => row.relforcerowsecurity)).toBe(true)
  })

  it('books VAT and currency exactly, toggles a wishlist purchase both ways and stays isolated', async () => {
    const me = owner()
    const other = owner()
    const first = await as(me, tx => applySetup(tx, me, setup()))
    const azn = first.accounts.find(account => account.currency === 'AZN')!
    const usd = first.accounts.find(account => account.currency === 'USD')!
    const ai = first.categories.find(category => category.name === 'AI tools')!
    const vat = first.tax_rules.find(rule => rule.kind === 'vat')!
    const voen = first.tax_rules.find(rule => rule.kind === 'income')!
    const freelance = first.categories.find(
      category => category.kind === 'income'
    )!

    expect(first.settings).toMatchObject({
      configured: true,
      base_currency: 'AZN'
    })
    await expect(as(me, tx => applySetup(tx, me, setup()))).rejects.toThrow()

    // A pinned rate decides every conversion: 1 USD = 1.7 AZN.
    await as(me, tx => saveRate(tx, me, { code: 'USD', custom_rate: '1.7' }))

    await as(me, tx =>
      saveTransaction(
        tx,
        me,
        transactionSaveSchema.parse({
          kind: 'expense',
          occurred_on: '2026-03-05',
          account_id: usd.id,
          category_id: ai.id,
          title: 'ChatGPT',
          entered_amount: '20',
          entered_currency: 'USD',
          tax_rule_id: vat.id,
          tax_basis: 'net'
        })
      )
    )
    await as(me, tx =>
      saveTransaction(
        tx,
        me,
        transactionSaveSchema.parse({
          kind: 'income',
          occurred_on: '2026-03-10',
          account_id: azn.id,
          category_id: freelance.id,
          entered_amount: '850',
          entered_currency: 'AZN',
          tax_rule_id: voen.id
        })
      )
    )
    await as(me, tx =>
      saveTransaction(
        tx,
        me,
        transactionSaveSchema.parse({
          kind: 'transfer',
          occurred_on: '2026-03-11',
          account_id: azn.id,
          to_account_id: usd.id,
          entered_amount: '170',
          entered_currency: 'AZN'
        })
      )
    )

    const listed = await as(me, tx =>
      listTransactions(tx, me, {
        from: '2026-03-01',
        to: '2026-03-31',
        limit: 100
      })
    )
    const subscription = listed.items.find(item => item.title === 'ChatGPT')!

    expect(subscription).toMatchObject({
      amount: '23.6',
      tax_amount: '3.6',
      base_rate: '1.7',
      base_amount: '40.12',
      tax_name: 'Digital VAT'
    })

    let snapshot = await as(me, tx => getSnapshot(tx, me))

    // 1000 + 850 − 170 = 1680 AZN; 100 − 23.60 = 76.40 USD.
    expect(snapshot.accounts.find(a => a.id === azn.id)!.balance).toBe('1680')
    expect(snapshot.accounts.find(a => a.id === usd.id)!.balance).toBe('76.4')
    expect(snapshot.accounts.find(a => a.id === usd.id)!.base_balance).toBe(
      '129.88'
    )

    // The wishlist toggle books the calculated total in the paying account.
    const wish = await as(me, tx =>
      saveWish(
        tx,
        me,
        wishlistItemSaveSchema.parse({
          name: 'Headphones',
          price: '45',
          quantity: 2,
          shipping: '10',
          currency: 'USD',
          tax_rule_id: vat.id,
          list_id: first.lists[0]!.id
        })
      )
    )

    snapshot = await as(me, tx => getSnapshot(tx, me))
    expect(snapshot.wishes[0]).toMatchObject({
      total: '118',
      base_total: '200.6'
    })

    const bought = await as(me, tx =>
      purchaseWish(
        tx,
        me,
        {
          id: wish.id,
          expected_updated: wish.updated,
          purchased: true,
          account_id: null,
          category_id: null,
          occurred_on: '2026-03-20'
        },
        '2026-03-20'
      )
    )
    const afterBuy = await as(me, tx =>
      listTransactions(tx, me, {
        from: '2026-03-20',
        to: '2026-03-20',
        limit: 10
      })
    )

    expect(afterBuy.items).toHaveLength(1)
    expect(afterBuy.items[0]).toMatchObject({
      kind: 'expense',
      account_id: azn.id,
      entered_amount: '118',
      amount: '200.6',
      tax_amount: '30.6',
      title: 'Headphones'
    })

    await as(me, tx =>
      purchaseWish(
        tx,
        me,
        {
          id: wish.id,
          expected_updated: bought.updated,
          purchased: false,
          account_id: null,
          category_id: null,
          occurred_on: null
        },
        '2026-03-20'
      )
    )
    expect(
      (
        await as(me, tx =>
          listTransactions(tx, me, {
            from: '2026-03-20',
            to: '2026-03-20',
            limit: 10
          })
        )
      ).items
    ).toHaveLength(0)

    // Another owner sees nothing, and cannot book into these accounts.
    const theirs = await as(other, tx => getSnapshot(tx, other))

    expect(theirs.accounts).toHaveLength(0)
    await expect(
      as(other, tx =>
        saveTransaction(
          tx,
          other,
          transactionSaveSchema.parse({
            kind: 'expense',
            occurred_on: '2026-03-05',
            account_id: azn.id,
            entered_amount: '1',
            entered_currency: 'AZN'
          })
        )
      )
    ).rejects.toThrow('Account not found')
  })

  it('posts recurring items exactly once and reconciles the summary', async () => {
    const me = owner()
    const first = await as(me, tx => applySetup(tx, me, setup()))
    const azn = first.accounts.find(account => account.currency === 'AZN')!
    const home = first.categories.find(
      category => category.name === 'Household'
    )!
    const rent = await as(me, tx =>
      saveRecurring(tx, me, {
        kind: 'expense',
        title: 'Rent',
        account_id: azn.id,
        category_id: home.id,
        amount: '500',
        currency: 'AZN',
        tax_rule_id: null,
        tax_basis: 'gross',
        cadence: 'monthly',
        interval: 1,
        start_on: '2026-01-31',
        end_on: null,
        auto_post: true,
        active: true,
        notes: ''
      })
    )

    expect(rent.id).toBeTruthy()
    expect(
      await as(me, tx =>
        postRecurring(tx, me, { today: '2026-04-30', automatic: true })
      )
    ).toEqual({ posted: 4 })
    expect(
      await as(me, tx =>
        postRecurring(tx, me, { today: '2026-04-30', automatic: true })
      )
    ).toEqual({ posted: 0 })

    const posted = await as(me, tx =>
      listTransactions(tx, me, {
        from: '2026-01-01',
        to: '2026-12-31',
        limit: 100
      })
    )

    expect(posted.items.map(item => item.occurred_on).sort()).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30'
    ])

    const summary = await as(me, tx =>
      getSummary(tx, me, {
        from: '2026-01-01',
        to: '2026-12-31',
        bucket: 'month',
        compare_from: '2025-01-01',
        compare_to: '2025-12-31'
      })
    )
    const bucketSpend = add(
      '0',
      ...summary.buckets.map(bucket => bucket.expense)
    )

    expect(summary.totals.expense).toBe('2000')
    expect(bucketSpend).toBe(summary.totals.expense)
    expect(summary.previous?.expense).toBe('0')
    // Net worth: opening 1000 AZN − 2000 rent = −1000 by year end.
    expect(summary.net_worth[summary.net_worth.length - 1]!.value).toBe(
      sub('1000', '2000')
    )

    // Deleting a posted occurrence never re-posts it on the next sync.
    const march = posted.items.find(item => item.occurred_on === '2026-03-31')!

    await as(me, tx =>
      deleteTransaction(tx, me, {
        id: march.id,
        expected_updated: march.updated
      })
    )
    expect(
      await as(me, tx =>
        postRecurring(tx, me, { today: '2026-04-30', automatic: true })
      )
    ).toEqual({ posted: 0 })
  })

  it('restates booked amounts when the main currency changes', async () => {
    const me = owner()
    const first = await as(me, tx => applySetup(tx, me, setup()))
    const usd = first.accounts.find(account => account.currency === 'USD')!

    await as(me, tx => saveRate(tx, me, { code: 'USD', custom_rate: '1.7' }))
    await as(me, tx =>
      saveTransaction(
        tx,
        me,
        transactionSaveSchema.parse({
          kind: 'expense',
          occurred_on: '2026-05-01',
          account_id: usd.id,
          entered_amount: '10',
          entered_currency: 'USD'
        })
      )
    )

    const before = await as(me, tx => getSnapshot(tx, me))

    await as(me, tx =>
      saveSettings(tx, me, {
        base_currency: 'USD',
        display_currency: 'USD',
        currencies: before.settings.currencies,
        week_start: 1,
        default_account_id: before.settings.default_account_id,
        wish_category_id: before.settings.wish_category_id,
        expected_updated: before.settings.updated
      })
    )

    const [row] = (
      await as(me, tx =>
        listTransactions(tx, me, {
          from: '2026-05-01',
          to: '2026-05-01',
          limit: 5
        })
      )
    ).items
    const after = await as(me, tx => getSnapshot(tx, me))

    expect(row).toMatchObject({
      base_rate: '1',
      base_amount: '10',
      base_net: '10'
    })
    expect(after.rates.entries.AZN).toMatchObject({
      source: 'custom',
      rate: '0.588235294118'
    })
  })
})
