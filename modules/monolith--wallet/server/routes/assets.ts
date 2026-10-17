import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import {
  walletAssets,
  walletTransactions,
  walletTransactionsIncomeExpenses,
  walletTransactionsTransfer
} from '../schema.drizzle'
import getDateRange from '../utils/getDateRange'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const assetDto = createSelectSchema(walletAssets)

const assetAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  starting_balance: z.number(),
  is_liability: z.boolean(),
  credit_limit: z.number(),
  transaction_count: z.number(),
  current_balance: z.number()
})

const assetInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  starting_balance: z.number(),
  is_liability: z.boolean(),
  credit_limit: z.number()
})

export const list = endpoints
  .query({
    description: 'Get all wallet assets',
    output: {
      OK: z.array(assetAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const [assets, incomeExpenses, transfers] = await Promise.all([
      db.select().from(walletAssets),
      db
        .select({
          type: walletTransactionsIncomeExpenses.type,
          amount: walletTransactions.amount,
          asset: walletTransactionsIncomeExpenses.asset
        })
        .from(walletTransactionsIncomeExpenses)
        .innerJoin(
          walletTransactions,
          eq(
            walletTransactionsIncomeExpenses.base_transaction,
            walletTransactions.id
          )
        ),
      db
        .select({
          amount: walletTransactions.amount,
          from: walletTransactionsTransfer.from,
          to: walletTransactionsTransfer.to
        })
        .from(walletTransactionsTransfer)
        .innerJoin(
          walletTransactions,
          eq(walletTransactionsTransfer.base_transaction, walletTransactions.id)
        )
    ])

    const rows = assets
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(asset => {
        let currentBalance = asset.starting_balance
        let transactionCount = 0

        for (const t of incomeExpenses) {
          if (t.asset !== asset.id) continue

          transactionCount++
          currentBalance += t.type === 'income' ? t.amount : -t.amount
        }

        for (const t of transfers) {
          if (t.from !== asset.id && t.to !== asset.id) continue

          transactionCount++
          currentBalance += t.from === asset.id ? -t.amount : t.amount
        }

        return {
          id: asset.id,
          name: asset.name,
          icon: asset.icon,
          starting_balance: asset.starting_balance,
          is_liability: asset.is_liability,
          credit_limit: asset.credit_limit,
          transaction_count: transactionCount,
          current_balance: parseFloat(currentBalance.toFixed(2))
        }
      })

    return response.ok(rows)
  })

export const getAssetAccumulatedBalance = endpoints
  .query({
    description: 'Get asset balance over time',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletAssets),
        rangeMode: z.enum([
          'week',
          'month',
          'year',
          'all',
          'custom',
          'quarter'
        ]),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: z.object({
        balances: z.record(z.string(), z.number()),
        startBalance: z.number(),
        endBalance: z.number()
      })
    }
  })
  .callback(
    async ({ db, query: { id, rangeMode, startDate, endDate }, response }) => {
      const dateRange = getDateRange(rangeMode, startDate, endDate)

      const asset = requireResult(
        await db.query.assets.findFirst({ where: { id } })
      )

      const starting_balance = asset.starting_balance

      const incomeExpenses = await db
        .select({
          type: walletTransactionsIncomeExpenses.type,
          amount: walletTransactions.amount,
          date: walletTransactions.date
        })
        .from(walletTransactionsIncomeExpenses)
        .innerJoin(
          walletTransactions,
          eq(
            walletTransactionsIncomeExpenses.base_transaction,
            walletTransactions.id
          )
        )
        .where(eq(walletTransactionsIncomeExpenses.asset, id))

      const transfers = await db
        .select({
          amount: walletTransactions.amount,
          date: walletTransactions.date,
          from: walletTransactionsTransfer.from,
          to: walletTransactionsTransfer.to
        })
        .from(walletTransactionsTransfer)
        .innerJoin(
          walletTransactions,
          eq(walletTransactionsTransfer.base_transaction, walletTransactions.id)
        )

      const allTransactions = [
        ...incomeExpenses.map(t => ({
          type: t.type,
          amount: t.amount,
          date: t.date
        })),
        ...transfers
          .filter(t => t.from === id || t.to === id)
          .map(t => ({
            type: t.from === id ? 'expenses' : 'income',
            amount: t.amount,
            date: t.date
          }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime())

      if (allTransactions.length === 0) {
        return response.ok({
          balances: {},
          startBalance: starting_balance,
          endBalance: starting_balance
        })
      }

      let currentBalance = starting_balance

      const accumulatedBalance: Record<string, number> = {}

      const firstDate = dayjs(
        requireResult(allTransactions.at(-1)).date
      ).startOf('day')

      const endDay = dayjs().startOf('day')

      for (
        let current = firstDate;
        current.isBefore(endDay) || current.isSame(endDay, 'day');
        current = current.add(1, 'day')
      ) {
        const dateStr = current.format('YYYY-MM-DD')

        accumulatedBalance[dateStr] = parseFloat(currentBalance.toFixed(2))

        const transactionsOnDate = allTransactions.filter(t =>
          dayjs(t.date).isSame(current, 'day')
        )

        for (const transaction of transactionsOnDate) {
          if (transaction.type === 'expenses') {
            currentBalance -= transaction.amount
          } else if (transaction.type === 'income') {
            currentBalance += transaction.amount
          }
        }
      }

      const filtered = Object.fromEntries(
        Object.entries(accumulatedBalance).filter(([date]) => {
          const dateMoment = dayjs(date)

          const isAfterStartDate = dateRange.startDate
            ? dateMoment.isSameOrAfter(dayjs(dateRange.startDate), 'day')
            : true

          const isBeforeEndDate = dateRange.endDate
            ? dateMoment.isSameOrBefore(dayjs(dateRange.endDate), 'day')
            : true

          return isAfterStartDate && isBeforeEndDate
        })
      )

      const balances = Object.values(filtered)

      return response.ok({
        balances: filtered,
        startBalance: balances[0] ?? starting_balance,
        endBalance: balances.at(-1) ?? starting_balance
      })
    }
  )

export const create = endpoints
  .mutation({
    description: 'Create a new wallet asset',
    input: {
      body: assetInputDto
    },
    output: {
      CREATED: assetDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(walletAssets).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = endpoints
  .mutation({
    description: 'Update asset details',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletAssets)
      }),
      body: assetInputDto
    },
    output: {
      OK: assetDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(walletAssets)
          .set(body)
          .where(eq(walletAssets.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = endpoints
  .mutation({
    description: 'Delete a wallet asset',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletAssets)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(walletAssets).where(eq(walletAssets.id, id))

    return response.noContent()
  })
