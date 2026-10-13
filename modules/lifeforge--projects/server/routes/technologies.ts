import dayjs from 'dayjs'
import { and, desc, eq, sql } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { technologiesInput } from '../models'
import { entries, technologies } from '../schema.drizzle'

const output = technologiesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List projects technologies belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(technologies)
          .where(eq(technologies.owner_id, owner))
          .orderBy(desc(technologies.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create projects technologies',
    input: { body: technologiesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(technologies)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update projects technologies',
    input: { query: z.object({ id: z.uuid() }), body: technologiesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(technologies)
      .where(
        and(eq(technologies.id, query.id), eq(technologies.owner_id, owner))
      )
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(technologies)
      .set({ ...body, updated: dayjs().toDate() })
      .where(
        and(eq(technologies.id, query.id), eq(technologies.owner_id, owner))
      )

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete projects technologies',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(technologies)
      .where(
        and(eq(technologies.id, query.id), eq(technologies.owner_id, owner))
      )
      .returning({ id: technologies.id })

    if (!deleted.length) return response.notFound()
    await db
      .update(entries)
      .set({
        technology_ids: sql`${entries.technology_ids} - ${query.id}`,
        updated: dayjs().toDate()
      })
      .where(
        and(
          eq(entries.owner_id, owner),
          sql`${entries.technology_ids} ? ${query.id}`
        )
      )

    return response.noContent()
  })
