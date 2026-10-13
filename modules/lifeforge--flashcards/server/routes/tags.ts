import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { tagsInput } from '../models'
import { tags } from '../schema.drizzle'

const output = tagsInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List flashcards tags belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(tags)
          .where(eq(tags.owner_id, owner))
          .orderBy(desc(tags.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create flashcards tags',
    input: { body: tagsInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [created] = await db
      .insert(tags)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update flashcards tags',
    input: { query: z.object({ id: z.uuid() }), body: tagsInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, query.id), eq(tags.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(tags)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(tags.id, query.id), eq(tags.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete flashcards tags',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(tags)
      .where(and(eq(tags.id, query.id), eq(tags.owner_id, owner)))
      .returning({ id: tags.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
