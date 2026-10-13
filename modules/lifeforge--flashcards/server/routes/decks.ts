import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import forge from '../forge'
import { decksInput } from '../models'
import { decks, tags } from '../schema.drizzle'

const output = decksInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List flashcards decks belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(decks)
          .where(eq(decks.owner_id, owner))
          .orderBy(desc(decks.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create flashcards decks',
    input: { body: decksInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.tag_id) {
      const [target] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, body.tag_id), eq(tags.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(decks)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update flashcards decks',
    input: { query: z.object({ id: z.uuid() }), body: decksInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, query.id), eq(decks.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.tag_id) {
      const [target] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, body.tag_id), eq(tags.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(decks)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(decks.id, query.id), eq(decks.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete flashcards decks',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(decks)
      .where(and(eq(decks.id, query.id), eq(decks.owner_id, owner)))
      .returning({ id: decks.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
