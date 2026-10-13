import { and, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  ideaBoxContainers,
  ideaBoxEntries,
  ideaBoxTags
} from '../schema.drizzle'

const tagDto = createSelectSchema(ideaBoxTags).extend({
  container: z.string()
})

const tagAggregateDto = tagDto.extend({
  amount: z.number()
})

function serializeTag(row: typeof ideaBoxTags.$inferSelect) {
  return {
    ...row,
    container: row.container ?? ''
  }
}

export const list = forge
  .query({
    description: 'Get all tags in a container',
    input: {
      query: z.object({
        container: forge.existsIn(z.string(), ideaBoxContainers)
      })
    },
    output: {
      OK: z.array(tagAggregateDto)
    }
  })
  .callback(async ({ db, query: { container }, response }) => {
    const [tags, entries] = await Promise.all([
      db.select().from(ideaBoxTags).where(eq(ideaBoxTags.container, container)),
      db
        .select({ tags: ideaBoxEntries.tags })
        .from(ideaBoxEntries)
        .where(
          and(
            eq(ideaBoxEntries.container, container),
            eq(ideaBoxEntries.archived, false)
          )
        )
    ])

    const counts = new Map<string, number>()

    for (const entry of entries) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }

    const rows = tags
      .map(tag => ({
        ...serializeTag(tag),
        amount: counts.get(tag.name) ?? 0
      }))
      .sort((a, b) => b.amount - a.amount)

    return response.ok(rows)
  })

export const create = forge
  .mutation({
    description: 'Create a new tag',
    input: {
      body: z.object({
        name: z.string(),
        icon: z.string(),
        color: z.string(),
        container: forge.existsIn(z.string(), ideaBoxContainers)
      })
    },
    output: {
      CREATED: tagDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(ideaBoxTags).values(body).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(serializeTag(created))
  })

export const update = forge
  .mutation({
    description: 'Update an existing tag',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), ideaBoxTags)
      }),
      body: z.object({
        name: z.string(),
        icon: z.string(),
        color: z.string()
      })
    },
    output: {
      OK: tagDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(ideaBoxTags)
          .set(body)
          .where(eq(ideaBoxTags.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeTag(updated))
  })

export const remove = forge
  .mutation({
    description: 'Delete a tag',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), ideaBoxTags)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(ideaBoxTags).where(eq(ideaBoxTags.id, id))

    return response.noContent()
  })
