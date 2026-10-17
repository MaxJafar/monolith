import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { columnsInput } from '../models'
import { columns, entries } from '../schema.drizzle'

const output = columnsInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List projects columns belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(columns)
          .where(eq(columns.owner_id, owner))
          .orderBy(desc(columns.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create projects columns',
    input: { body: columnsInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.project_id) {
      const [target] = await db
        .select()
        .from(entries)
        .where(
          and(eq(entries.id, body.project_id), eq(entries.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(columns)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update projects columns',
    input: { query: z.object({ id: z.uuid() }), body: columnsInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(columns)
      .where(and(eq(columns.id, query.id), eq(columns.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.project_id) {
      const [target] = await db
        .select()
        .from(entries)
        .where(
          and(eq(entries.id, body.project_id), eq(entries.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(columns)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(columns.id, query.id), eq(columns.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete projects columns',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(columns)
      .where(and(eq(columns.id, query.id), eq(columns.owner_id, owner)))
      .returning({ id: columns.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
