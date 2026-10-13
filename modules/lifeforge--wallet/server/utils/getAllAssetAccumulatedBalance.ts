import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { BuiltModuleSchema } from '@lifeforge/drizzle'

import type { WalletSchema } from '../forge'
import {
  walletAssets,
  walletTransactions,
  walletTransactionsIncomeExpenses,
  walletTransactionsTransfer
} from '../schema.drizzle'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

type WalletDb = PostgresJsDatabase<BuiltModuleSchema<WalletSchema>>

export async function getAllAssetAccumulatedBalance(
  db: WalletDb,
  year: string,
  month: string
): Promise<
  Record<string, { last: number; current: number; is_liability: boolean }>
> {
  const parsedYear = parseInt(year)

  const parsedMonth = parseInt(month)

  const currentMonthEnd = dayjs()
    .year(parsedYear)
    .month(parsedMonth - 1)
    .endOf('month')

  const prevMonthEnd = dayjs()
    .year(parsedYear)
    .month(parsedMonth - 1)
    .startOf('month')
    .subtract(1, 'day')

  const [assets, incomeExpensesRaw, transfersRaw] = await Promise.all([
    db
      .select({
        id: walletAssets.id,
        starting_balance: walletAssets.starting_balance,
        is_liability: walletAssets.is_liability
      })
      .from(walletAssets),
    db
      .select({
        type: walletTransactionsIncomeExpenses.type,
        asset: walletTransactionsIncomeExpenses.asset,
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
      ),
    db
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
  ])

  const result: Record<
    string,
    { last: number; current: number; is_liability: boolean }
  > = {}

  for (const asset of assets) {
    const incomeExpenses = incomeExpensesRaw
      .filter(t => t.asset === asset.id)
      .map(t => ({
        type: t.type,
        amount: t.amount,
        date: t.date
      }))

    const transfers = transfersRaw
      .filter(t => t.from === asset.id || t.to === asset.id)
      .map(t => ({
        type: t.from === asset.id ? 'expenses' : 'income',
        amount: t.amount,
        date: t.date
      }))

    const allTransactions = [...incomeExpenses, ...transfers].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )

    let balance = asset.starting_balance
    let lastMonthBalance = asset.starting_balance
    let currentMonthBalance = asset.starting_balance

    for (const transaction of allTransactions) {
      const txDate = dayjs(transaction.date)

      if (transaction.type === 'income') {
        balance += transaction.amount
      } else {
        balance -= transaction.amount
      }

      if (txDate.isSameOrBefore(prevMonthEnd, 'day')) {
        lastMonthBalance = balance
      }

      if (txDate.isSameOrBefore(currentMonthEnd, 'day')) {
        currentMonthBalance = balance
      }
    }

    result[asset.id] = {
      last: parseFloat(lastMonthBalance.toFixed(2)),
      current: parseFloat(currentMonthBalance.toFixed(2)),
      is_liability: asset.is_liability
    }
  }

  return result
}
