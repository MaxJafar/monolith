import { asc, count, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import { todoEntries, todoLists } from '../schema.drizzle'

const listDto = createSelectSchema(todoLists)

const listAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  amount: z.number()
})

const listInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const list = forge
  .query({
    description: 'Get all todo lists',
    output: {
      OK: z.array(listAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: todoLists.id,
        name: todoLists.name,
        color: todoLists.color,
        icon: todoLists.icon,
        amount: count(todoEntries.id)
      })
      .from(todoLists)
      .leftJoin(todoEntries, eq(todoEntries.list, todoLists.id))
      .groupBy(todoLists.id)
      .orderBy(asc(todoLists.name))

    return response.ok(rows)
  })

export const create = forge
  .mutation({
    description: 'Create a new todo list',
    input: {
      body: listInputDto
    },
    output: {
      CREATED: listDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(todoLists).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update todo list details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoLists)
      }),
      body: listInputDto
    },
    output: {
      OK: listDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(todoLists)
          .set(body)
          .where(eq(todoLists.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete a todo list',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoLists)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(todoLists).where(eq(todoLists.id, id))

    return response.noContent()
  })
