import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { ideaBoxContainers, ideaBoxEntries } from '../schema.drizzle'

const containerDto = createSelectSchema(ideaBoxContainers)

const containerAggregateDto = containerDto.extend({
  text_count: z.number(),
  link_count: z.number(),
  image_count: z.number()
})

const containerInputDto = z.object({
  name: z.string(),
  icon: z.string(),
  color: z.string()
})

export const validate = endpoints
  .query({
    description: 'Validate if a container exists',
    input: {
      query: z.object({
        id: z.string()
      })
    },
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const container = await db.query.containers.findFirst({ where: { id } })

    return response.ok(!!container)
  })

export const list = endpoints
  .query({
    description: 'Get all containers with stats',
    input: {
      query: z.object({
        hidden: z.string().optional()
      })
    },
    output: {
      OK: z.array(containerAggregateDto)
    }
  })
  .callback(async ({ db, query: { hidden }, response }) => {
    const parsedHidden = hidden === 'true'

    const rows = await db
      .select({
        id: ideaBoxContainers.id,
        name: ideaBoxContainers.name,
        icon: ideaBoxContainers.icon,
        color: ideaBoxContainers.color,
        cover: ideaBoxContainers.cover,
        pinned: ideaBoxContainers.pinned,
        hidden: ideaBoxContainers.hidden,
        text_count: sql<number>`CAST(count(CASE WHEN ${ideaBoxEntries.type} = 'text' THEN 1 END) AS INTEGER)`,
        link_count: sql<number>`CAST(count(CASE WHEN ${ideaBoxEntries.type} = 'link' THEN 1 END) AS INTEGER)`,
        image_count: sql<number>`CAST(count(CASE WHEN ${ideaBoxEntries.type} = 'image' THEN 1 END) AS INTEGER)`
      })
      .from(ideaBoxContainers)
      .leftJoin(
        ideaBoxEntries,
        and(
          eq(ideaBoxEntries.container, ideaBoxContainers.id),
          eq(ideaBoxEntries.archived, false)
        )
      )
      .where(parsedHidden ? undefined : eq(ideaBoxContainers.hidden, false))
      .groupBy(ideaBoxContainers.id)
      .orderBy(
        asc(ideaBoxContainers.hidden),
        desc(ideaBoxContainers.pinned),
        asc(ideaBoxContainers.name)
      )

    return response.ok(rows)
  })

export const create = endpoints
  .mutation({
    description: 'Create a new container',
    input: {
      body: containerInputDto
    },
    media: {
      cover: {
        optional: true
      }
    },
    output: {
      CREATED: containerDto
    }
  })
  .callback(
    async ({ db, body, media: { cover }, core: { storage }, response }) => {
      let coverKey = ''

      if (cover && typeof cover !== 'string') {
        const ref = await storage.save({ file: cover, thumbs: ['0x300'] })

        coverKey = ref?.key ?? ''
      }

      const created = requireResult(
        (
          await db
            .insert(ideaBoxContainers)
            .values({
              name: body.name,
              icon: body.icon,
              color: body.color,
              cover: coverKey
            })
            .returning()
        )[0],
        'Insert returned no row',
        500
      )

      return response.created(created)
    }
  )

export const update = endpoints
  .mutation({
    description: 'Update an existing container',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxContainers)
      }),
      body: containerInputDto
    },
    media: {
      cover: {
        optional: true
      }
    },
    output: {
      OK: containerDto
    }
  })
  .callback(
    async ({
      db,
      query: { id },
      body,
      media: { cover },
      core: { storage },
      response
    }) => {
      const coverUpdate: { cover?: string } = {}

      if (cover === 'removed') {
        coverUpdate.cover = ''
      } else if (cover && typeof cover !== 'string') {
        const ref = await storage.save({ file: cover, thumbs: ['0x300'] })

        coverUpdate.cover = ref?.key ?? ''
      }

      const updated = requireResult(
        (
          await db
            .update(ideaBoxContainers)
            .set({
              name: body.name,
              icon: body.icon,
              color: body.color,
              ...coverUpdate
            })
            .where(eq(ideaBoxContainers.id, id))
            .returning()
        )[0]
      )

      return response.ok(updated)
    }
  )

export const remove = endpoints
  .mutation({
    description: 'Delete a container',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxContainers)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(ideaBoxContainers).where(eq(ideaBoxContainers.id, id))

    return response.noContent()
  })

export const togglePin = endpoints
  .mutation({
    description: 'Toggle pin status of a container',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxContainers)
      })
    },
    output: {
      OK: containerDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const container = requireResult(
      await db.query.containers.findFirst({
        where: { id }
      })
    )

    const updated = requireResult(
      (
        await db
          .update(ideaBoxContainers)
          .set({ pinned: !container.pinned })
          .where(eq(ideaBoxContainers.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const toggleHide = endpoints
  .mutation({
    description: 'Toggle visibility of a container',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxContainers)
      })
    },
    output: {
      OK: containerDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const container = requireResult(
      await db.query.containers.findFirst({
        where: { id }
      })
    )

    const updated = requireResult(
      (
        await db
          .update(ideaBoxContainers)
          .set({ hidden: !container.hidden, pinned: false })
          .where(eq(ideaBoxContainers.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })
