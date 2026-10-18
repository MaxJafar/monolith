import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { categoriesInput } from '../models'
import { categories } from '../schema.drizzle'

const output = categoriesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List blog categories belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(categories)
          .where(eq(categories.owner_id, owner))
          .orderBy(desc(categories.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create blog categories',
    input: { body: categoriesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(categories)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update blog categories',
    input: { query: z.object({ id: z.uuid() }), body: categoriesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, query.id), eq(categories.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(categories)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(categories.id, query.id), eq(categories.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete blog categories',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, query.id), eq(categories.owner_id, owner)))
      .returning({ id: categories.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
