import { asc, count, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import {
  walletCategories,
  walletTransactionsIncomeExpenses
} from '../schema.drizzle'

const categoryDto = createSelectSchema(walletCategories).extend({
  type: z.enum(['income', 'expenses'])
})

const categoryAggregateDto = z.object({
  id: z.string(),
  type: z.enum(['income', 'expenses']),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  amount: z.number()
})

const categoryInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  type: z.enum(['income', 'expenses'])
})

export const list = endpoints
  .query({
    description: 'Get all transaction categories',
    output: {
      OK: z.array(categoryAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: walletCategories.id,
        type: walletCategories.type,
        name: walletCategories.name,
        icon: walletCategories.icon,
        color: walletCategories.color,
        amount: count(walletTransactionsIncomeExpenses.id)
      })
      .from(walletCategories)
      .leftJoin(
        walletTransactionsIncomeExpenses,
        eq(walletTransactionsIncomeExpenses.category, walletCategories.id)
      )
      .groupBy(walletCategories.id)
      .orderBy(asc(walletCategories.name))

    return response.ok(rows)
  })

export const create = endpoints
  .mutation({
    description: 'Create a new transaction category',
    input: {
      body: categoryInputDto
    },
    output: {
      CREATED: categoryDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(walletCategories).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = endpoints
  .mutation({
    description: 'Update category details',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletCategories)
      }),
      body: categoryInputDto
    },
    output: {
      OK: categoryDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(walletCategories)
          .set(body)
          .where(eq(walletCategories.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = endpoints
  .mutation({
    description: 'Delete a transaction category',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), walletCategories)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(walletCategories).where(eq(walletCategories.id, id))

    return response.noContent()
  })
