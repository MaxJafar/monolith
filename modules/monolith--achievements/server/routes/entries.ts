import { type TableFilter, count, eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import endpoints from '../endpoints'
import { achievementsCategories, achievementsEntries } from '../schema.drizzle'

const entryDifficultyDto =
  createSelectSchema(achievementsEntries).shape.difficulty

const entryDto = createSelectSchema(achievementsEntries)
  .omit({ category_id: true })
  .extend({
    difficulty: entryDifficultyDto,
    category: z.string().optional().nullable()
  })

const entryInputDto = createInsertSchema(achievementsEntries)
  .pick({
    title: true,
    thoughts: true,
    difficulty: true
  })
  .extend({
    category: z
      .union([
        endpoints.existsIn(z.string().uuid(), achievementsCategories),
        z.literal('')
      ])
      .optional()
      .nullable()
  })

export const list = endpoints
  .query({
    description:
      'Get the list of achievement entries with optional filtering by difficulty, category, or search query',
    input: {
      query: z.object({
        difficulty: entryDifficultyDto.optional().nullable(),
        category: endpoints.existsIn(z.string().optional(), achievementsCategories),
        query: z.string().optional()
      })
    },
    output: {
      OK: z.array(entryDto)
    }
  })
  .callback(
    async ({ query: { difficulty, category, query }, response, db }) => {
      const filters: TableFilter<typeof achievementsEntries>[] = [
        ...(difficulty ? [{ difficulty }] : []),
        ...(category ? [{ category_id: category }] : []),
        ...(query
          ? [
              {
                OR: [
                  { title: { ilike: `%${query}%` } },
                  { thoughts: { ilike: `%${query}%` } }
                ]
              }
            ]
          : [])
      ]

      const result = await db.query.entries.findMany({
        where: filters.length > 0 ? { AND: filters } : undefined,
        orderBy: { created: 'desc' }
      })

      return response.ok(
        result.map(entry => ({
          id: entry.id,
          title: entry.title,
          thoughts: entry.thoughts,
          difficulty: entry.difficulty,
          category: entry.category_id,
          created: entry.created,
          updated: entry.updated
        }))
      )
    }
  )

export const difficultiesCount = endpoints
  .query({
    description: 'Get the count of achievement entries grouped by difficulty',
    output: {
      OK: z.record(z.string(), z.number())
    }
  })
  .callback(async ({ response, db }) => {
    const listItems = await db
      .select({
        difficulty: achievementsEntries.difficulty,
        amount: count()
      })
      .from(achievementsEntries)
      .groupBy(achievementsEntries.difficulty)

    const counts: Record<string, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      impossible: 0
    }

    for (const item of listItems) {
      if (item.difficulty in counts) {
        counts[item.difficulty] = item.amount
      }
    }

    return response.ok(counts)
  })

export const create = endpoints
  .mutation({
    description: 'Create a new achievements entry',
    input: {
      body: entryInputDto
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, body, response }) => {
    await db.insert(achievementsEntries).values({
      title: body.title,
      thoughts: body.thoughts,
      difficulty: body.difficulty,
      category_id: body.category || null
    })

    return response.noContent()
  })

export const update = endpoints
  .mutation({
    description: 'Update an existing achievements entry',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), achievementsEntries)
      }),
      body: entryInputDto
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    await db
      .update(achievementsEntries)
      .set({
        title: body.title,
        thoughts: body.thoughts,
        difficulty: body.difficulty,
        category_id: body.category || null,
        updated: new Date()
      })
      .where(eq(achievementsEntries.id, id))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete an achievements entry',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), achievementsEntries)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(achievementsEntries).where(eq(achievementsEntries.id, id))

    return response.noContent()
  })
