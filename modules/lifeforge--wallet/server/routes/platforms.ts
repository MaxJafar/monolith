import { asc, count, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  walletPlatforms,
  walletTransactionsIncomeExpenses
} from '../schema.drizzle'

const platformDto = createSelectSchema(walletPlatforms)

const platformAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  amount: z.number()
})

const platformInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const list = forge
  .query({
    description: 'Get all purchase platforms',
    output: {
      OK: z.array(platformAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: walletPlatforms.id,
        name: walletPlatforms.name,
        icon: walletPlatforms.icon,
        color: walletPlatforms.color,
        amount: count(walletTransactionsIncomeExpenses.id)
      })
      .from(walletPlatforms)
      .leftJoin(
        walletTransactionsIncomeExpenses,
        eq(walletTransactionsIncomeExpenses.platform, walletPlatforms.id)
      )
      .groupBy(walletPlatforms.id)
      .orderBy(asc(walletPlatforms.name))

    return response.ok(rows)
  })

export const create = forge
  .mutation({
    description: 'Create a new purchase platform',
    input: {
      body: platformInputDto
    },
    output: {
      CREATED: platformDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(walletPlatforms).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update platform details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), walletPlatforms)
      }),
      body: platformInputDto
    },
    output: {
      OK: platformDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(walletPlatforms)
          .set(body)
          .where(eq(walletPlatforms.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete a purchase platform',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), walletPlatforms)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(walletPlatforms).where(eq(walletPlatforms.id, id))

    return response.noContent()
  })
