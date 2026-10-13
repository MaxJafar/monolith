import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { statusesInput } from '../models'
import { statuses } from '../schema.drizzle'

const output = statusesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List projects statuses belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(statuses)
          .where(eq(statuses.owner_id, owner))
          .orderBy(desc(statuses.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create projects statuses',
    input: { body: statusesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(statuses)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update projects statuses',
    input: { query: z.object({ id: z.uuid() }), body: statusesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.id, query.id), eq(statuses.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(statuses)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(statuses.id, query.id), eq(statuses.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete projects statuses',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(statuses)
      .where(and(eq(statuses.id, query.id), eq(statuses.owner_id, owner)))
      .returning({ id: statuses.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
