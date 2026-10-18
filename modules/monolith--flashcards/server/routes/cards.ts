import dayjs from 'dayjs'
import { and, desc, eq, sql } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { cardsInput } from '../models'
import { cards, decks } from '../schema.drizzle'

const output = cardsInput
  .extend({
    id: z.uuid(),
    created: z.date(),
    updated: z.date(),
    reviews: z.number(),
    correct: z.number(),
    next_review: z.date().nullable()
  })
  .strip()

export const list = endpoints
  .query({
    description: 'List flashcards cards belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(cards)
          .where(eq(cards.owner_id, owner))
          .orderBy(desc(cards.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create flashcards cards',
    input: { body: cardsInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.deck_id) {
      const [target] = await db
        .select()
        .from(decks)
        .where(and(eq(decks.id, body.deck_id), eq(decks.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(cards)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update flashcards cards',
    input: { query: z.object({ id: z.uuid() }), body: cardsInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, query.id), eq(cards.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.deck_id) {
      const [target] = await db
        .select()
        .from(decks)
        .where(and(eq(decks.id, body.deck_id), eq(decks.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(cards)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(cards.id, query.id), eq(cards.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete flashcards cards',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(cards)
      .where(and(eq(cards.id, query.id), eq(cards.owner_id, owner)))
      .returning({ id: cards.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })

export const review = endpoints
  .mutation({
    description: 'Record a flashcard review',
    input: {
      query: z.object({ id: z.uuid() }),
      body: z.object({ remembered: z.boolean() })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const reviewed = await db
      .update(cards)
      .set({
        reviews: sql`${cards.reviews} + 1`,
        correct: sql`${cards.correct} + ${body.remembered ? 1 : 0}`,
        next_review: dayjs()
          .add(body.remembered ? 1 : 0, 'day')
          .toDate(),
        updated: dayjs().toDate()
      })
      .where(and(eq(cards.id, query.id), eq(cards.owner_id, owner)))
      .returning({ id: cards.id })

    if (!reviewed.length) return response.notFound()

    return response.noContent()
  })
