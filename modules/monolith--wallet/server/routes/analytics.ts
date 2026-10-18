import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import z from 'zod'

import type { BuiltModuleSchema } from '@monolith/drizzle'
import { requireResult } from '@monolith/server-utils'

import endpoints, { type WalletSchema } from '../endpoints'
import {
  walletTransactions,
  walletTransactionsIncomeExpenses,
  walletTransactionsTransfer
} from '../schema.drizzle'
import {
  RANGE_MODE,
  getPreviousDateRange,
  isWithinDateRange,
  resolveDateRange
} from '../utils/dateRange'

type WalletDb = PostgresJsDatabase<BuiltModuleSchema<WalletSchema>>

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const TypesCountOutput = z.record(
  z.string(),
  z.object({
    transactionCount: z.number(),
    accumulatedAmount: z.number(),
    previousCount: z.number(),
    previousAmount: z.number(),
    percentageChange: z.number()
  })
)

const IncomeExpensesSummaryOutput = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  monthlyIncome: z.number(),
  monthlyExpenses: z.number()
})

const CategoryBreakdownItem = z.object({
  amount: z.number(),
  count: z.number(),
  percentage: z.number()
})

const CategoryBreakdownOutput = z.object({
  income: z.record(z.string(), CategoryBreakdownItem),
  expenses: z.record(z.string(), CategoryBreakdownItem)
})

const SpendingByPlatformOutput = z.array(
  z.object({
    platform: z.string(),
    amount: z.number(),
    count: z.number(),
    percentage: z.number()
  })
)

const EntityBreakdownItem = z.object({
  income: z.number(),
  expenses: z.number(),
  count: z.number()
})

const EntityBreakdownOutput = z.object({
  categories: z.record(z.string(), EntityBreakdownItem),
  platforms: z.record(z.string(), EntityBreakdownItem),
  ledgers: z.record(z.string(), EntityBreakdownItem)
})

const AvailableYearMonthsOutput = z.object({
  years: z.array(z.number()),
  monthsByYear: z.record(z.string(), z.array(z.number()))
})

const TransactionCountByDayOutput = z.record(
  z.string(),
  z.object({
    income: z.number(),
    expenses: z.number(),
    transfer: z.number(),
    incomeAmount: z.number(),
    expensesAmount: z.number(),
    transferAmount: z.number(),
    total: z.number(),
    count: z.number()
  })
)

const ChartDataOutput = z.array(
  z.object({
    date: z.string(),
    income: z.number(),
    expenses: z.number()
  })
)

const DailyBreakdownOutput = z.array(
  z.object({
    date: z.string(),
    income: z.number(),
    expenses: z.number()
  })
)

async function fetchTransactions(db: WalletDb) {
  const [incomeExpenses, transfers] = await Promise.all([
    db
      .select({
        type: walletTransactionsIncomeExpenses.type,
        amount: walletTransactions.amount,
        date: walletTransactions.date,
        category: walletTransactionsIncomeExpenses.category,
        platform: walletTransactionsIncomeExpenses.platform,
        ledgers: walletTransactionsIncomeExpenses.ledgers,
        location_name: walletTransactionsIncomeExpenses.location_name,
        location_coords: walletTransactionsIncomeExpenses.location_coords
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
        date: walletTransactions.date
      })
      .from(walletTransactionsTransfer)
      .innerJoin(
        walletTransactions,
        eq(walletTransactionsTransfer.base_transaction, walletTransactions.id)
      )
  ])

  return { incomeExpenses, transfers }
}

export const getTypesCount = endpoints
  .query({
    description: 'Get transaction counts and totals by type',
    input: {
      query: z.object({
        year: z.string().optional(),
        month: z.string().optional(),
        range: RANGE_MODE.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: TypesCountOutput
    }
  })
  .callback(
    async ({
      db,
      query: { year, month, range, startDate, endDate },
      response
    }) => {
      const parsedYear = year ? parseInt(year) : undefined

      const parsedMonth = month ? parseInt(month) : undefined

      const hasRange = parsedYear !== undefined && parsedMonth !== undefined

      const dateRange = range
        ? resolveDateRange(range, startDate, endDate)
        : null

      const previousRange = range
        ? getPreviousDateRange(range, startDate, endDate)
        : null

      const { incomeExpenses, transfers } = await fetchTransactions(db)

      const inCurrentRange = (date: Date) => {
        if (dateRange) {
          return isWithinDateRange(date, dateRange)
        }

        return (
          !hasRange ||
          (date.getFullYear() === parsedYear &&
            date.getMonth() + 1 === parsedMonth)
        )
      }

      const inPreviousRange = (date: Date) =>
        previousRange ? isWithinDateRange(date, previousRange) : false

      const typesCount: Record<
        string,
        {
          transactionCount: number
          accumulatedAmount: number
          previousCount: number
          previousAmount: number
          percentageChange: number
        }
      > = {
        income: {
          transactionCount: 0,
          accumulatedAmount: 0,
          previousCount: 0,
          previousAmount: 0,
          percentageChange: 0
        },
        expenses: {
          transactionCount: 0,
          accumulatedAmount: 0,
          previousCount: 0,
          previousAmount: 0,
          percentageChange: 0
        },
        transfer: {
          transactionCount: 0,
          accumulatedAmount: 0,
          previousCount: 0,
          previousAmount: 0,
          percentageChange: 0
        }
      }

      for (const transaction of incomeExpenses) {
        const entry = requireResult(typesCount[transaction.type])

        if (inCurrentRange(transaction.date)) {
          entry.transactionCount++
          entry.accumulatedAmount += transaction.amount
        } else if (inPreviousRange(transaction.date)) {
          entry.previousCount++
          entry.previousAmount += transaction.amount
        }
      }

      for (const transaction of transfers) {
        const entry = requireResult(typesCount.transfer)

        if (inCurrentRange(transaction.date)) {
          entry.transactionCount++
          entry.accumulatedAmount += transaction.amount
        } else if (inPreviousRange(transaction.date)) {
          entry.previousCount++
          entry.previousAmount += transaction.amount
        }
      }

      for (const entry of Object.values(typesCount)) {
        entry.percentageChange =
          entry.previousAmount > 0
            ? ((entry.accumulatedAmount - entry.previousAmount) /
                entry.previousAmount) *
              100
            : 0
      }

      return response.ok(typesCount)
    }
  )

export const getIncomeExpensesSummary = endpoints
  .query({
    description: 'Get income and expenses summary for a month',
    input: {
      query: z.object({
        year: z.string(),
        month: z.string()
      })
    },
    output: {
      OK: IncomeExpensesSummaryOutput
    }
  })
  .callback(async ({ db, query: { year, month }, response }) => {
    const parsedYear = parseInt(year)

    const parsedMonth = parseInt(month)

    const start = dayjs(`${parsedYear}-${parsedMonth}-01`).startOf('month')

    const end = dayjs(`${parsedYear}-${parsedMonth}-01`).endOf('month')

    const { incomeExpenses } = await fetchTransactions(db)

    const inThisMonth = incomeExpenses.filter(
      transaction =>
        dayjs(transaction.date).isSameOrAfter(start) &&
        dayjs(transaction.date).isSameOrBefore(end)
    )

    const totalIncome = incomeExpenses.reduce(
      (acc, cur) => (cur.type === 'income' ? acc + cur.amount : acc),
      0
    )

    const totalExpenses = incomeExpenses.reduce(
      (acc, cur) => (cur.type === 'expenses' ? acc + cur.amount : acc),
      0
    )

    const monthlyIncome = inThisMonth.reduce(
      (acc, cur) => (cur.type === 'income' ? acc + cur.amount : acc),
      0
    )

    const monthlyExpenses = inThisMonth.reduce(
      (acc, cur) => (cur.type === 'expenses' ? acc + cur.amount : acc),
      0
    )

    return response.ok({
      totalIncome,
      totalExpenses,
      monthlyIncome,
      monthlyExpenses
    })
  })

export const getCategoriesBreakdown = endpoints
  .query({
    description: 'Get income and expenses breakdown by category for a month',
    input: {
      query: z.object({
        year: z.string().optional(),
        month: z.string().optional(),
        range: RANGE_MODE.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: CategoryBreakdownOutput
    }
  })
  .callback(
    async ({
      db,
      query: { year, month, range, startDate, endDate },
      response
    }) => {
      const dateRange = range
        ? resolveDateRange(range, startDate, endDate)
        : year && month
          ? {
              startDate: dayjs()
                .year(parseInt(year))
                .month(parseInt(month) - 1)
                .startOf('month')
                .format('YYYY-MM-DD'),
              endDate: dayjs()
                .year(parseInt(year))
                .month(parseInt(month) - 1)
                .endOf('month')
                .format('YYYY-MM-DD')
            }
          : { startDate: null, endDate: null }

      const { incomeExpenses } = await fetchTransactions(db)

      const transactions = incomeExpenses.filter(transaction =>
        isWithinDateRange(transaction.date, dateRange)
      )

      const incomeByCategory: Record<
        string,
        { amount: number; count: number; percentage: number }
      > = {}

      const expensesByCategory: Record<
        string,
        { amount: number; count: number; percentage: number }
      > = {}

      for (const transaction of transactions) {
        const categoryId = transaction.category

        const amount = transaction.amount

        const type = transaction.type

        if (!categoryId) continue

        const targetMap =
          type === 'income' ? incomeByCategory : expensesByCategory

        if (targetMap[categoryId]) {
          targetMap[categoryId].amount += amount
          targetMap[categoryId].count += 1
        } else {
          targetMap[categoryId] = { amount, count: 1, percentage: 0 }
        }
      }

      const totalIncome = Object.values(incomeByCategory).reduce(
        (acc, { amount }) => acc + amount,
        0
      )

      for (const categoryId in incomeByCategory) {
        requireResult(incomeByCategory[categoryId]).percentage =
          totalIncome > 0
            ? (requireResult(incomeByCategory[categoryId]).amount /
                totalIncome) *
              100
            : 0
      }

      const totalExpenses = Object.values(expensesByCategory).reduce(
        (acc, { amount }) => acc + amount,
        0
      )

      for (const categoryId in expensesByCategory) {
        requireResult(expensesByCategory[categoryId]).percentage =
          totalExpenses > 0
            ? (requireResult(expensesByCategory[categoryId]).amount /
                totalExpenses) *
              100
            : 0
      }

      return response.ok({
        income: incomeByCategory,
        expenses: expensesByCategory
      })
    }
  )

export const getSpendingByPlatform = endpoints
  .query({
    description: 'Get expenses breakdown by purchase platform for a month',
    input: {
      query: z.object({
        year: z.string().optional(),
        month: z.string().optional(),
        range: RANGE_MODE.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: SpendingByPlatformOutput
    }
  })
  .callback(
    async ({
      db,
      query: { year, month, range, startDate, endDate },
      response
    }) => {
      const dateRange = range
        ? resolveDateRange(range, startDate, endDate)
        : year && month
          ? {
              startDate: dayjs()
                .year(parseInt(year))
                .month(parseInt(month) - 1)
                .startOf('month')
                .format('YYYY-MM-DD'),
              endDate: dayjs()
                .year(parseInt(year))
                .month(parseInt(month) - 1)
                .endOf('month')
                .format('YYYY-MM-DD')
            }
          : { startDate: null, endDate: null }

      const { incomeExpenses } = await fetchTransactions(db)

      const expenses = incomeExpenses.filter(
        transaction =>
          transaction.type === 'expenses' &&
          isWithinDateRange(transaction.date, dateRange)
      )

      const grouped: Record<
        string,
        { platform: string; amount: number; count: number }
      > = {}

      for (const transaction of expenses) {
        if (!transaction.platform) continue

        const key = transaction.platform

        if (!grouped[key]) {
          grouped[key] = {
            platform: transaction.platform,
            amount: 0,
            count: 0
          }
        }

        grouped[key].amount += transaction.amount
        grouped[key].count += 1
      }

      const total = Object.values(grouped).reduce(
        (acc, { amount }) => acc + amount,
        0
      )

      const result = Object.values(grouped)
        .map(item => ({
          platform: item.platform,
          amount: parseFloat(item.amount.toFixed(2)),
          count: item.count,
          percentage: total > 0 ? (item.amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      return response.ok(result)
    }
  )

export const getEntityBreakdown = endpoints
  .query({
    description:
      'Get accumulated income and expenses per category, platform and ledger for a range',
    input: {
      query: z.object({
        range: RANGE_MODE.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: EntityBreakdownOutput
    }
  })
  .callback(async ({ db, query: { range, startDate, endDate }, response }) => {
    const dateRange = resolveDateRange(range, startDate, endDate)

    const { incomeExpenses } = await fetchTransactions(db)

    const transactions = incomeExpenses.filter(transaction =>
      isWithinDateRange(transaction.date, dateRange)
    )

    type BreakdownMap = Record<
      string,
      { income: number; expenses: number; count: number }
    >

    const categories: BreakdownMap = {}

    const platforms: BreakdownMap = {}

    const ledgers: BreakdownMap = {}

    const accumulate = (
      map: BreakdownMap,
      key: string,
      type: 'income' | 'expenses',
      amount: number
    ) => {
      map[key] ??= { income: 0, expenses: 0, count: 0 }

      map[key][type] += amount
      map[key].count += 1
    }

    for (const transaction of transactions) {
      if (transaction.category) {
        accumulate(
          categories,
          transaction.category,
          transaction.type,
          transaction.amount
        )
      }

      if (transaction.platform) {
        accumulate(
          platforms,
          transaction.platform,
          transaction.type,
          transaction.amount
        )
      }

      for (const ledger of transaction.ledgers) {
        accumulate(ledgers, ledger, transaction.type, transaction.amount)
      }
    }

    return response.ok({ categories, platforms, ledgers })
  })

export const getSpendingByLocation = endpoints
  .query({
    description: 'Get spending aggregated by location for heatmap',
    output: {
      OK: z.array(
        z.object({
          lat: z.number(),
          lng: z.number(),
          locationName: z.string(),
          amount: z.number(),
          count: z.number()
        })
      )
    }
  })
  .callback(async ({ db, response }) => {
    const { incomeExpenses } = await fetchTransactions(db)

    const grouped: Record<
      string,
      {
        lat: number
        lng: number
        locationName: string
        amount: number
        count: number
      }
    > = {}

    for (const transaction of incomeExpenses) {
      if (transaction.type !== 'expenses') continue

      if (
        !transaction.location_name ||
        !transaction.location_coords ||
        transaction.location_coords.lat === 0 ||
        transaction.location_coords.lon === 0
      ) {
        continue
      }

      const key = `${transaction.location_coords.lat}_${transaction.location_coords.lon}_${transaction.location_name}`

      if (!grouped[key]) {
        grouped[key] = {
          lat: transaction.location_coords.lat,
          lng: transaction.location_coords.lon,
          locationName: transaction.location_name,
          amount: 0,
          count: 0
        }
      }

      grouped[key].amount += transaction.amount
      grouped[key].count += 1
    }

    return response.ok(Object.values(grouped))
  })

export const getAvailableYearMonths = endpoints
  .query({
    description: 'Get available years and months from transaction dates',
    output: {
      OK: AvailableYearMonthsOutput
    }
  })
  .callback(async ({ db, response }) => {
    const transactions = await db
      .select({ date: walletTransactions.date })
      .from(walletTransactions)

    const yearMonthMap: Record<number, Set<number>> = {}

    for (const transaction of transactions) {
      const date = dayjs(transaction.date)

      const year = date.year()

      const month = date.month()

      if (!yearMonthMap[year]) {
        yearMonthMap[year] = new Set()
      }

      requireResult(yearMonthMap[year]).add(month)
    }

    const years = Object.keys(yearMonthMap)
      .map(Number)
      .sort((a, b) => b - a)

    const monthsByYear: Record<number, number[]> = {}

    for (const year of years) {
      monthsByYear[year] = Array.from(requireResult(yearMonthMap[year])).sort(
        (a, b) => b - a
      )
    }

    return response.ok({ years, monthsByYear })
  })

export const getTransactionCountByDay = endpoints
  .query({
    description: 'Get transaction counts by day for a specific month',
    input: {
      query: z.object({
        year: z.string(),
        month: z.string(),
        viewFilter: z.string().optional()
      })
    },
    output: {
      OK: TransactionCountByDayOutput
    }
  })
  .callback(async ({ db, query: { year, month, viewFilter }, response }) => {
    const parsedYear = parseInt(year)

    const parsedMonth = parseInt(month) + 1

    const parsedViewFilter = viewFilter
      ? viewFilter
          .split(',')
          .map(value => value.trim())
          .filter(
            (value): value is 'income' | 'expenses' | 'transfer' =>
              value === 'income' || value === 'expenses' || value === 'transfer'
          )
      : ['income', 'expenses', 'transfer']

    const { incomeExpenses, transfers } = await fetchTransactions(db)

    const countMap: Record<
      string,
      {
        income: number
        expenses: number
        transfer: number
        incomeAmount: number
        expensesAmount: number
        transferAmount: number
        total: number
        count: number
      }
    > = {}

    const ensure = (dateKey: string) => {
      if (!countMap[dateKey]) {
        countMap[dateKey] = {
          income: 0,
          expenses: 0,
          transfer: 0,
          incomeAmount: 0,
          expensesAmount: 0,
          transferAmount: 0,
          total: 0,
          count: 0
        }
      }

      return requireResult(countMap[dateKey])
    }

    const isInMonth = (date: Date) =>
      date.getFullYear() === parsedYear && date.getMonth() + 1 === parsedMonth

    for (const transaction of incomeExpenses) {
      if (!isInMonth(transaction.date)) continue

      const date = dayjs(transaction.date)

      const dateKey = `${date.year()}-${date.month() + 1}-${date.date()}`

      const entry = ensure(dateKey)

      if (parsedViewFilter.includes(transaction.type)) {
        if (transaction.type === 'income') {
          entry.income += 1
          entry.incomeAmount += transaction.amount
        } else {
          entry.expenses += 1
          entry.expensesAmount += transaction.amount
        }
      }
    }

    for (const transaction of transfers) {
      if (!isInMonth(transaction.date)) continue

      const date = dayjs(transaction.date)

      const dateKey = `${date.year()}-${date.month() + 1}-${date.date()}`

      const entry = ensure(dateKey)

      if (parsedViewFilter.includes('transfer')) {
        entry.transfer += 1
        entry.transferAmount += transaction.amount
      }
    }

    for (const dateKey in countMap) {
      const entry = requireResult(countMap[dateKey])

      entry.incomeAmount = parseFloat(entry.incomeAmount.toFixed(2))
      entry.expensesAmount = parseFloat(entry.expensesAmount.toFixed(2))
      entry.transferAmount = parseFloat(entry.transferAmount.toFixed(2))

      for (const type of ['income', 'expenses', 'transfer'] as const) {
        if (parsedViewFilter.includes(type)) {
          entry.total += entry[type]
          entry.count += entry[type] > 0 ? entry[type] : 0
        }
      }
    }

    return response.ok(countMap)
  })

export const getChartData = endpoints
  .query({
    description: 'Get chart data for income/expenses by date range',
    input: {
      query: z.object({
        range: z.enum([
          'week',
          'month',
          'mtd',
          'quarter',
          'year',
          'ytd',
          'all',
          'custom'
        ]),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: ChartDataOutput
    }
  })
  .callback(async ({ db, query: { range, startDate, endDate }, response }) => {
    const dateRange = resolveDateRange(range, startDate, endDate)

    const { incomeExpenses } = await fetchTransactions(db)

    const end = dateRange.endDate
      ? dayjs(dateRange.endDate).endOf('day')
      : dayjs().endOf('day')

    const start = dateRange.startDate
      ? dayjs(dateRange.startDate).startOf('day')
      : incomeExpenses.length > 0
        ? dayjs(
            Math.min(...incomeExpenses.map(t => dayjs(t.date).valueOf()))
          ).startOf('day')
        : dayjs().startOf('month')

    const durationDays = end.diff(start, 'day')

    const unit: 'day' | 'week' | 'month' =
      range === 'quarter'
        ? 'week'
        : range === 'year' || range === 'ytd' || range === 'all'
          ? 'month'
          : range === 'custom'
            ? durationDays <= 62
              ? 'day'
              : durationDays <= 180
                ? 'week'
                : 'month'
            : 'day'

    const bucketStart = (date: dayjs.Dayjs) =>
      unit === 'day'
        ? date.startOf('day')
        : unit === 'week'
          ? date.startOf('week')
          : date.startOf('month')

    const formatLabel = (date: dayjs.Dayjs) =>
      unit === 'month' ? date.format('MMM YY') : date.format('MMM DD')

    const buckets: { start: dayjs.Dayjs; label: string }[] = []

    let cursor = bucketStart(start)

    while (cursor.isBefore(end, unit) || cursor.isSame(end, unit)) {
      buckets.push({ start: cursor, label: formatLabel(cursor) })

      cursor = cursor.add(1, unit)
    }

    const resultMap: Record<string, { income: number; expenses: number }> = {}

    for (const bucket of buckets) {
      resultMap[bucket.label] = { income: 0, expenses: 0 }
    }

    const labelByStart = new Map(
      buckets.map(bucket => [bucket.start.valueOf(), bucket.label])
    )

    for (const transaction of incomeExpenses) {
      const date = dayjs(transaction.date)

      if (date.isBefore(start, 'day') || date.isAfter(end, 'day')) continue

      const label = labelByStart.get(bucketStart(date).valueOf())

      if (!label) continue

      if (transaction.type === 'income') {
        requireResult(resultMap[label]).income += transaction.amount
      } else {
        requireResult(resultMap[label]).expenses += transaction.amount
      }
    }

    return response.ok(
      buckets.map(bucket => ({
        date: bucket.label,
        income: requireResult(resultMap[bucket.label]).income,
        expenses:
          requireResult(resultMap[bucket.label]).expenses > 0
            ? -requireResult(resultMap[bucket.label]).expenses
            : 0
      }))
    )
  })

export const getDailyBreakdown = endpoints
  .query({
    description: 'Get daily income and expenses for a date range',
    input: {
      query: z.object({
        range: RANGE_MODE.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      })
    },
    output: {
      OK: DailyBreakdownOutput
    }
  })
  .callback(async ({ db, query: { range, startDate, endDate }, response }) => {
    const dateRange = resolveDateRange(range, startDate, endDate)

    const { incomeExpenses } = await fetchTransactions(db)

    const end = dateRange.endDate
      ? dayjs(dateRange.endDate).endOf('day')
      : dayjs().endOf('day')

    const start = dateRange.startDate
      ? dayjs(dateRange.startDate).startOf('day')
      : incomeExpenses.length > 0
        ? dayjs(
            Math.min(...incomeExpenses.map(t => dayjs(t.date).valueOf()))
          ).startOf('day')
        : dayjs().startOf('month')

    const map: Record<string, { income: number; expenses: number }> = {}

    let cursor = start

    while (!cursor.isAfter(end, 'day')) {
      map[cursor.format('YYYY-MM-DD')] = { income: 0, expenses: 0 }

      cursor = cursor.add(1, 'day')
    }

    for (const transaction of incomeExpenses) {
      const entry = map[dayjs(transaction.date).format('YYYY-MM-DD')]

      if (!entry) continue

      entry[transaction.type] += transaction.amount
    }

    return response.ok(
      Object.entries(map).map(([date, value]) => ({
        date,
        income: parseFloat(value.income.toFixed(2)),
        expenses: parseFloat(value.expenses.toFixed(2))
      }))
    )
  })
