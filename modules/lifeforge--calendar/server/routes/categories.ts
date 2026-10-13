import { asc, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import { categories } from '../schema.drizzle'

const categoryDto = createSelectSchema(categories)

export const list = forge
  .query({
    description: 'Get all event categories',
    output: {
      OK: z.array(categoryDto)
    }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name))

    return response.ok(rows)
  })

export const getById = forge
  .query({
    description: 'Get a specific event category by ID',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), categories)
      })
    },
    output: {
      OK: categoryDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const row = requireResult(
      await db.query.categories.findFirst({ where: { id } })
    )

    return response.ok(row)
  })

export const create = forge
  .mutation({
    description: 'Create a new event category',
    input: {
      body: categoryDto.omit({ id: true })
    },
    output: {
      CREATED: categoryDto
    }
  })
  .callback(async ({ db, body, response }) => {
    if (body.name.startsWith('_')) {
      return response.badRequest('Category name cannot start with _')
    }

    const created = requireResult(
      (await db.insert(categories).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update event category details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), categories)
      }),
      body: categoryDto.omit({ id: true })
    },
    output: {
      OK: categoryDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    if (body.name.startsWith('_')) {
      return response.badRequest('Category name cannot start with _')
    }

    const updated = requireResult(
      (
        await db
          .update(categories)
          .set(body)
          .where(eq(categories.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete an event category',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), categories)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(categories).where(eq(categories.id, id))

    return response.noContent()
  })
