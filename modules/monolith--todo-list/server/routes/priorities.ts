import { asc, count, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { todoEntries, todoPriorities } from '../schema.drizzle'

const priorityDto = createSelectSchema(todoPriorities)

const priorityAggregateDto = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  amount: z.number()
})

const priorityInputDto = z.object({
  name: z.string(),
  color: z.string()
})

export const list = endpoints
  .query({
    description: 'Get all todo priorities',
    output: {
      OK: z.array(priorityAggregateDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({
        id: todoPriorities.id,
        name: todoPriorities.name,
        color: todoPriorities.color,
        amount: count(todoEntries.id)
      })
      .from(todoPriorities)
      .leftJoin(todoEntries, eq(todoEntries.priority, todoPriorities.id))
      .groupBy(todoPriorities.id)
      .orderBy(asc(todoPriorities.name))

    return response.ok(rows)
  })

export const create = endpoints
  .mutation({
    description: 'Create a new priority level',
    input: {
      body: priorityInputDto
    },
    output: {
      CREATED: priorityDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(todoPriorities).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = endpoints
  .mutation({
    description: 'Update priority details',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), todoPriorities)
      }),
      body: priorityInputDto
    },
    output: {
      OK: priorityDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(todoPriorities)
          .set(body)
          .where(eq(todoPriorities.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = endpoints
  .mutation({
    description: 'Delete a priority level',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), todoPriorities)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(todoPriorities).where(eq(todoPriorities.id, id))

    return response.noContent()
  })
