import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { entriesInput } from '../models'
import { entries, lists } from '../schema.drizzle'

const output = entriesInput
  .extend({
    id: z.uuid(),
    created: z.date(),
    updated: z.date(),
    bought_at: z.date().nullable()
  })
  .strip()

export const list = forge
  .query({
    description: 'List wishlist entries belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(entries)
          .where(eq(entries.owner_id, owner))
          .orderBy(desc(entries.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create wishlist entries',
    input: { body: entriesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.list_id) {
      const [target] = await db
        .select()
        .from(lists)
        .where(and(eq(lists.id, body.list_id), eq(lists.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(entries)
      .values({
        ...body,
        owner_id: owner,
        bought_at: body.bought ? dayjs().toDate() : null
      })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update wishlist entries',
    input: { query: z.object({ id: z.uuid() }), body: entriesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.list_id) {
      const [target] = await db
        .select()
        .from(lists)
        .where(and(eq(lists.id, body.list_id), eq(lists.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(entries)
      .set({
        ...body,
        updated: dayjs().toDate(),
        bought_at: body.bought ? existing.bought_at || dayjs().toDate() : null
      })
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete wishlist entries',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .returning({ id: entries.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
