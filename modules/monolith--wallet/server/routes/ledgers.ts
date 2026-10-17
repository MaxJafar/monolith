import { asc, count, eq, sql } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import {
  walletLedgers,
  walletTransactionsIncomeExpenses
} from '../schema.drizzle'

const ledgerDto = createSelectSchema(walletLedgers)

const ledgerAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  amount: z.number()
})

const ledgerInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const list = endpoints
  .query({
    description: 'Get all ledgers',
    output: {
      OK: z.array(ledgerAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: walletLedgers.id,
        name: walletLedgers.name,
        color: walletLedgers.color,
        icon: walletLedgers.icon,
        amount: count(walletTransactionsIncomeExpenses.id)
      })
      .from(walletLedgers)
      .leftJoin(
        walletTransactionsIncomeExpenses,
        sql`jsonb_exists(${walletTransactionsIncomeExpenses.ledgers}, ${walletLedgers.id}::text)`
      )
      .groupBy(walletLedgers.id)
      .orderBy(asc(walletLedgers.name))

    return response.ok(rows)
  })

export const create = endpoints
  .mutation({
    description: 'Create a new ledger',
    input: {
      body: ledgerInputDto
    },
    output: {
      CREATED: ledgerDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(walletLedgers).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = endpoints
  .mutation({
    description: 'Update ledger details',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletLedgers)
      }),
      body: ledgerInputDto
    },
    output: {
      OK: ledgerDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(walletLedgers)
          .set(body)
          .where(eq(walletLedgers.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = endpoints
  .mutation({
    description: 'Delete a ledger',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletLedgers)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(walletLedgers).where(eq(walletLedgers.id, id))

    return response.noContent()
  })
