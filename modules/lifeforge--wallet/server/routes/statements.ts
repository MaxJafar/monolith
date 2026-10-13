import dayjs from 'dayjs'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  walletCategories,
  walletTransactions,
  walletTransactionsIncomeExpenses
} from '../schema.drizzle'
import {
  EnrichedTransactionOutput,
  enrichedTransactionQuery,
  mapToEnrichedTransaction
} from '../utils/enrichedTransaction'
import { getAllAssetAccumulatedBalance } from '../utils/getAllAssetAccumulatedBalance'

const comparisonItemDto = z.object({
  currentAmount: z.number(),
  previousAmount: z.number(),
  change: z.number(),
  percentageChange: z.number()
})

const comparisonDto = z.object({
  currentTotal: z.number(),
  previousTotal: z.number(),
  totalChange: z.number(),
  totalPercentageChange: z.number(),
  items: z.record(z.string(), comparisonItemDto)
})

const assetBalanceDto = z.object({
  last: z.number(),
  current: z.number(),
  change: z.number(),
  percentage: z.number()
})

const transactionBlockDto = z.object({
  items: z.array(EnrichedTransactionOutput),
  total: z.number(),
  count: z.number()
})

const platformBreakdownDto = z.array(
  z.object({
    platform: z.string().nullable(),
    amount: z.number(),
    count: z.number(),
    percentage: z.number()
  })
)

function percentageChange(change: number, previous: number): number {
  return previous !== 0 ? (change / previous) * 100 : 0
}

export const get = forge
  .query({
    description: 'Get fully computed financial statement for a month',
    input: {
      query: z.object({
        year: z.string(),
        month: z.string()
      })
    },
    output: {
      OK: z.object({
        overview: z.object({
          monthlyIncome: z.number(),
          monthlyExpenses: z.number(),
          netIncome: z.number()
        }),
        assets: z.object({
          balances: z.record(z.string(), assetBalanceDto),
          total: assetBalanceDto,
          liabilitiesTotal: assetBalanceDto,
          netWorth: assetBalanceDto
        }),
        categoryComparison: z.object({
          income: comparisonDto,
          expenses: comparisonDto
        }),
        transactions: z.object({
          income: transactionBlockDto,
          expenses: transactionBlockDto,
          transfer: transactionBlockDto,
          totalCount: z.number()
        }),
        platformBreakdown: platformBreakdownDto
      })
    }
  })
  .callback(async ({ db, query: { year, month }, response }) => {
    const parsedYear = parseInt(year)

    const parsedMonth = parseInt(month)

    const startOfMonth = dayjs()
      .year(parsedYear)
      .month(parsedMonth - 1)
      .startOf('month')

    const endOfMonth = startOfMonth.endOf('month')

    const startOfPrevMonth = startOfMonth.subtract(1, 'month')

    const endOfPrevMonth = startOfMonth.subtract(1, 'day').endOf('day')

    const rows = await enrichedTransactionQuery(db)
      .where(
        and(
          gte(walletTransactions.date, startOfMonth.toDate()),
          lte(walletTransactions.date, endOfMonth.toDate())
        )
      )
      .orderBy(asc(walletTransactions.date), asc(walletTransactions.created))

    const monthTransactions = rows.map(
      ({ base, sub, transfer, asset, category, platform, ledger }) =>
        mapToEnrichedTransaction(base, sub, transfer, {
          asset,
          category,
          platform,
          ledger
        })
    )

    const prevMonthRows = await db
      .select({
        type: walletTransactionsIncomeExpenses.type,
        category: walletTransactionsIncomeExpenses.category,
        amount: walletTransactions.amount
      })
      .from(walletTransactionsIncomeExpenses)
      .innerJoin(
        walletTransactions,
        eq(
          walletTransactionsIncomeExpenses.base_transaction,
          walletTransactions.id
        )
      )
      .where(
        and(
          gte(walletTransactions.date, startOfPrevMonth.toDate()),
          lte(walletTransactions.date, endOfPrevMonth.toDate())
        )
      )

    const categories = await db.select().from(walletCategories)

    let monthlyIncome = 0
    let monthlyExpenses = 0

    const blocks: Record<
      'income' | 'expenses' | 'transfer',
      z.infer<typeof EnrichedTransactionOutput>[]
    > = {
      income: [],
      expenses: [],
      transfer: []
    }

    for (const transaction of monthTransactions) {
      blocks[transaction.type].push(transaction)

      if (transaction.type === 'income') {
        monthlyIncome += transaction.amount
      } else if (transaction.type === 'expenses') {
        monthlyExpenses += transaction.amount
      }
    }

    const buildBlock = (list: z.infer<typeof EnrichedTransactionOutput>[]) => ({
      items: list,
      total: parseFloat(
        list.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)
      ),
      count: list.length
    })

    const buildComparison = (type: 'income' | 'expenses') => {
      const items: Record<string, z.infer<typeof comparisonItemDto>> = {}

      for (const category of categories.filter(c => c.type === type)) {
        items[category.id] = {
          currentAmount: 0,
          previousAmount: 0,
          change: 0,
          percentageChange: 0
        }
      }

      let currentTotal = 0
      let previousTotal = 0

      for (const transaction of monthTransactions) {
        if (transaction.type !== type || !transaction.category) continue

        currentTotal += transaction.amount

        items[transaction.category] ??= {
          currentAmount: 0,
          previousAmount: 0,
          change: 0,
          percentageChange: 0
        }

        requireResult(items[transaction.category]).currentAmount +=
          transaction.amount
      }

      for (const row of prevMonthRows) {
        if (row.type !== type || !row.category) continue

        previousTotal += row.amount

        items[row.category] ??= {
          currentAmount: 0,
          previousAmount: 0,
          change: 0,
          percentageChange: 0
        }

        requireResult(items[row.category]).previousAmount += row.amount
      }

      for (const id in items) {
        const item = requireResult(items[id])

        item.change = item.currentAmount - item.previousAmount
        item.percentageChange = percentageChange(
          item.change,
          item.previousAmount
        )
      }

      const totalChange = currentTotal - previousTotal

      return {
        currentTotal,
        previousTotal,
        totalChange,
        totalPercentageChange: percentageChange(totalChange, previousTotal),
        items
      }
    }

    const balanceMap = await getAllAssetAccumulatedBalance(db, year, month)

    const balances: Record<string, z.infer<typeof assetBalanceDto>> = {}

    const buildBalance = (last: number, current: number) => {
      const change = current - last

      return {
        last: parseFloat(last.toFixed(2)),
        current: parseFloat(current.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        percentage: percentageChange(change, last)
      }
    }

    let assetLast = 0
    let assetCurrent = 0

    let liabilityLast = 0
    let liabilityCurrent = 0

    for (const assetId in balanceMap) {
      const { last, current, is_liability } = requireResult(balanceMap[assetId])

      const change = current - last

      balances[assetId] = {
        last,
        current,
        change,
        percentage: percentageChange(change, last)
      }

      if (is_liability) {
        liabilityLast += last
        liabilityCurrent += current
      } else {
        assetLast += last
        assetCurrent += current
      }
    }

    const incomeBlock = buildBlock(blocks.income)
    const expensesBlock = buildBlock(blocks.expenses)
    const transferBlock = buildBlock(blocks.transfer)

    const platformGroups: Record<
      string,
      { platform: string | null; amount: number; count: number }
    > = {}

    for (const transaction of blocks.expenses) {
      if (transaction.type !== 'expenses') continue

      const key = transaction.platform ?? 'unassigned'

      platformGroups[key] ??= {
        platform: transaction.platform,
        amount: 0,
        count: 0
      }

      platformGroups[key].amount += transaction.amount
      platformGroups[key].count += 1
    }

    const platformTotal = Object.values(platformGroups).reduce(
      (acc, { amount }) => acc + amount,
      0
    )

    const platformBreakdown = Object.values(platformGroups)
      .map(item => ({
        platform: item.platform,
        amount: parseFloat(item.amount.toFixed(2)),
        count: item.count,
        percentage: platformTotal > 0 ? (item.amount / platformTotal) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    return response.ok({
      overview: {
        monthlyIncome,
        monthlyExpenses,
        netIncome: monthlyIncome - monthlyExpenses
      },
      assets: {
        balances,
        total: buildBalance(assetLast, assetCurrent),
        liabilitiesTotal: buildBalance(-liabilityLast, -liabilityCurrent),
        netWorth: buildBalance(
          assetLast + liabilityLast,
          assetCurrent + liabilityCurrent
        )
      },
      categoryComparison: {
        income: buildComparison('income'),
        expenses: buildComparison('expenses')
      },
      transactions: {
        income: incomeBlock,
        expenses: expensesBlock,
        transfer: transferBlock,
        totalCount:
          incomeBlock.count + expensesBlock.count + transferBlock.count
      },
      platformBreakdown
    })
  })
