import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { entriesInput } from '../models'
import {
  categories,
  entries,
  statuses,
  technologies,
  visibilities
} from '../schema.drizzle'

const output = entriesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List projects entries belonging to the current user',
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

export const create = endpoints
  .mutation({
    description: 'create projects entries',
    input: { body: entriesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.category_id) {
      const [target] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, body.category_id),
            eq(categories.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.status_id) {
      const [target] = await db
        .select()
        .from(statuses)
        .where(
          and(eq(statuses.id, body.status_id), eq(statuses.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.visibility_id) {
      const [target] = await db
        .select()
        .from(visibilities)
        .where(
          and(
            eq(visibilities.id, body.visibility_id),
            eq(visibilities.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    for (const targetId of body.technology_ids) {
      const [target] = await db
        .select({ id: technologies.id })
        .from(technologies)
        .where(
          and(eq(technologies.id, targetId), eq(technologies.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(entries)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update projects entries',
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

    if (body.category_id) {
      const [target] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, body.category_id),
            eq(categories.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.status_id) {
      const [target] = await db
        .select()
        .from(statuses)
        .where(
          and(eq(statuses.id, body.status_id), eq(statuses.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.visibility_id) {
      const [target] = await db
        .select()
        .from(visibilities)
        .where(
          and(
            eq(visibilities.id, body.visibility_id),
            eq(visibilities.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    for (const targetId of body.technology_ids) {
      const [target] = await db
        .select({ id: technologies.id })
        .from(technologies)
        .where(
          and(eq(technologies.id, targetId), eq(technologies.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(entries)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete projects entries',
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
