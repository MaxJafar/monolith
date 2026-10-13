import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { listsInput } from '../models'
import { lists } from '../schema.drizzle'

const output = listsInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List wishlist lists belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(lists)
          .where(eq(lists.owner_id, owner))
          .orderBy(desc(lists.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create wishlist lists',
    input: { body: listsInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(lists)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update wishlist lists',
    input: { query: z.object({ id: z.uuid() }), body: listsInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.id, query.id), eq(lists.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(lists)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(lists.id, query.id), eq(lists.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete wishlist lists',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(lists)
      .where(and(eq(lists.id, query.id), eq(lists.owner_id, owner)))
      .returning({ id: lists.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
