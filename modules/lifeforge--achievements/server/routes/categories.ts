import { count, eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import forge from '../forge'
import { achievementsCategories, achievementsEntries } from '../schema.drizzle'

const categoryInputDto = createInsertSchema(achievementsCategories).pick({
  name: true,
  icon: true,
  color: true
})

export const list = forge
  .query({
    description: 'Get the list of achievement categories',
    output: {
      OK: z.array(
        createSelectSchema(achievementsCategories).extend({
          amount: z.number()
        })
      )
    }
  })
  .callback(async ({ response, db }) => {
    const result = await db
      .select({
        id: achievementsCategories.id,
        name: achievementsCategories.name,
        icon: achievementsCategories.icon,
        color: achievementsCategories.color,
        amount: count(achievementsEntries.id)
      })
      .from(achievementsCategories)
      .leftJoin(
        achievementsEntries,
        eq(achievementsCategories.id, achievementsEntries.category_id)
      )
      .groupBy(achievementsCategories.id)

    return response.ok(result)
  })

export const create = forge
  .mutation({
    description: 'Create a new achievement category',
    input: {
      body: categoryInputDto
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, body, response }) => {
    const duplicate = await db.query.categories.findFirst({
      where: { name: body.name }
    })

    if (duplicate)
      return response.badRequest('A category with this name already exists')

    await db.insert(achievementsCategories).values(body)

    return response.noContent()
  })

export const update = forge
  .mutation({
    description: 'Update an existing achievement category',
    input: {
      query: z.object({
        id: forge.existsIn(z.uuid(), achievementsCategories)
      }),
      body: categoryInputDto
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const duplicate = await db.query.categories.findFirst({
      where: { name: body.name }
    })

    if (duplicate && duplicate.id !== id)
      return response.badRequest('A category with this name already exists')

    await db
      .update(achievementsCategories)
      .set(body)
      .where(eq(achievementsCategories.id, id))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete an achievement category',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), achievementsCategories)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db
      .delete(achievementsCategories)
      .where(eq(achievementsCategories.id, id))

    return response.noContent()
  })
