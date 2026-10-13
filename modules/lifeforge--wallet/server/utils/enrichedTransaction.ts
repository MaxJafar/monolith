import { eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import type { BuiltModuleSchema } from '@lifeforge/drizzle'

import type { WalletSchema } from '../forge'
import {
  walletAssets,
  walletCategories,
  walletLedgers,
  walletPlatforms,
  walletTransactions,
  walletTransactionsIncomeExpenses,
  walletTransactionsTransfer
} from '../schema.drizzle'

export const transactionDto = createSelectSchema(walletTransactions)
  .omit({ created: true, updated: true })
  .extend({
    type: z.enum(['transfer', 'income_expenses'])
  })

const locationCoordsDto = z.object({
  lon: z.number(),
  lat: z.number()
})

export const assetInfoDto = z.object({
  name: z.string(),
  icon: z.string()
})

export const categoryInfoDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const platformInfoDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const ledgerInfoDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

const incomeExpensesFields = {
  particulars: z.string(),
  asset: z.string(),
  category: z.string(),
  platform: z.string().nullable(),
  ledgers: z.array(z.string()),
  location_name: z.string(),
  location_coords: locationCoordsDto.nullable(),
  asset_info: assetInfoDto,
  category_info: categoryInfoDto,
  platform_info: platformInfoDto.nullable(),
  ledger_info: ledgerInfoDto.nullable()
}

export const EnrichedTransactionOutput = z.discriminatedUnion('type', [
  transactionDto.extend({
    type: z.literal('transfer'),
    from: z.string(),
    to: z.string()
  }),
  transactionDto.extend(incomeExpensesFields).extend({
    type: z.literal('income')
  }),
  transactionDto.extend(incomeExpensesFields).extend({
    type: z.literal('expenses')
  })
])

export type EnrichedTransactionEntities = {
  asset: typeof walletAssets.$inferSelect | null
  category: typeof walletCategories.$inferSelect | null
  platform: typeof walletPlatforms.$inferSelect | null
  ledger: typeof walletLedgers.$inferSelect | null
}

export function enrichedTransactionQuery(
  db: PostgresJsDatabase<BuiltModuleSchema<WalletSchema>>
) {
  return db
    .select({
      base: walletTransactions,
      sub: walletTransactionsIncomeExpenses,
      transfer: walletTransactionsTransfer,
      asset: walletAssets,
      category: walletCategories,
      platform: walletPlatforms,
      ledger: walletLedgers
    })
    .from(walletTransactions)
    .leftJoin(
      walletTransactionsIncomeExpenses,
      eq(
        walletTransactionsIncomeExpenses.base_transaction,
        walletTransactions.id
      )
    )
    .leftJoin(
      walletTransactionsTransfer,
      eq(walletTransactionsTransfer.base_transaction, walletTransactions.id)
    )
    .leftJoin(
      walletAssets,
      eq(walletAssets.id, walletTransactionsIncomeExpenses.asset)
    )
    .leftJoin(
      walletCategories,
      eq(walletCategories.id, walletTransactionsIncomeExpenses.category)
    )
    .leftJoin(
      walletPlatforms,
      eq(walletPlatforms.id, walletTransactionsIncomeExpenses.platform)
    )
    .leftJoin(
      walletLedgers,
      sql`${walletLedgers.id} = (${walletTransactionsIncomeExpenses.ledgers}->>0)::uuid`
    )
}

export function mapToEnrichedTransaction(
  baseTransaction: typeof walletTransactions.$inferSelect,
  sub: typeof walletTransactionsIncomeExpenses.$inferSelect | null,
  transfer: typeof walletTransactionsTransfer.$inferSelect | null,
  entities: EnrichedTransactionEntities
): z.infer<typeof EnrichedTransactionOutput> {
  const { created: _created, updated: _updated, ...base } = baseTransaction

  if (base.type === 'transfer') {
    if (!transfer?.from || !transfer.to) {
      throw new Error(
        `Transfer transaction ${base.id} is missing its from/to assets`
      )
    }

    return {
      ...base,
      type: 'transfer',
      from: transfer.from,
      to: transfer.to
    }
  }

  if (!sub) {
    throw new Error(
      `Income/expenses details for transaction ${base.id} not found`
    )
  }

  const { asset, category, platform, ledger } = entities

  if (!sub.asset || !asset) {
    throw new Error(`Asset for transaction ${base.id} could not be resolved`)
  }

  if (!sub.category || !category) {
    throw new Error(`Category for transaction ${base.id} could not be resolved`)
  }

  return {
    ...base,
    type: sub.type,
    particulars: sub.particulars,
    asset: sub.asset,
    category: sub.category,
    platform: sub.platform,
    ledgers: sub.ledgers,
    location_name: sub.location_name,
    location_coords: sub.location_coords,
    asset_info: { name: asset.name, icon: asset.icon },
    category_info: {
      name: category.name,
      icon: category.icon,
      color: category.color
    },
    platform_info: platform
      ? { name: platform.name, icon: platform.icon, color: platform.color }
      : null,
    ledger_info: ledger
      ? { name: ledger.name, icon: ledger.icon, color: ledger.color }
      : null
  }
}
