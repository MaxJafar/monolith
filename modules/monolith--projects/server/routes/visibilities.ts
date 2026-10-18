import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { visibilitiesInput } from '../models'
import { visibilities } from '../schema.drizzle'

const output = visibilitiesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List projects visibilities belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(visibilities)
          .where(eq(visibilities.owner_id, owner))
          .orderBy(desc(visibilities.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create projects visibilities',
    input: { body: visibilitiesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(visibilities)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update projects visibilities',
    input: { query: z.object({ id: z.uuid() }), body: visibilitiesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(visibilities)
      .where(
        and(eq(visibilities.id, query.id), eq(visibilities.owner_id, owner))
      )
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(visibilities)
      .set({ ...body, updated: dayjs().toDate() })
      .where(
        and(eq(visibilities.id, query.id), eq(visibilities.owner_id, owner))
      )

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete projects visibilities',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(visibilities)
      .where(
        and(eq(visibilities.id, query.id), eq(visibilities.owner_id, owner))
      )
      .returning({ id: visibilities.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
