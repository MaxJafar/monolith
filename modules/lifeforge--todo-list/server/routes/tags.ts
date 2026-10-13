import { asc, count, eq, sql } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import { todoEntries, todoTags } from '../schema.drizzle'

const tagDto = createSelectSchema(todoTags)

const tagAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number()
})

const tagInputDto = z.object({
  name: z.string()
})

export const list = forge
  .query({
    description: 'Get all todo tags',
    output: {
      OK: z.array(tagAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: todoTags.id,
        name: todoTags.name,
        amount: count(todoEntries.id)
      })
      .from(todoTags)
      .leftJoin(
        todoEntries,
        sql`jsonb_exists(${todoEntries.tags}, ${todoTags.id}::text)`
      )
      .groupBy(todoTags.id)
      .orderBy(asc(todoTags.name))

    return response.ok(rows)
  })

export const create = forge
  .mutation({
    description: 'Create a new todo tag',
    input: {
      body: tagInputDto
    },
    output: {
      CREATED: tagDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(todoTags).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update todo tag details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoTags)
      }),
      body: tagInputDto
    },
    output: {
      OK: tagDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(todoTags)
          .set(body)
          .where(eq(todoTags.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete a todo tag',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoTags)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(todoTags).where(eq(todoTags.id, id))

    return response.noContent()
  })
