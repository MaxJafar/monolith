import { and, desc, eq, isNull } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import {
  ideaBoxContainers,
  ideaBoxEntries,
  ideaBoxEntriesImage,
  ideaBoxEntriesLink,
  ideaBoxEntriesText,
  ideaBoxFolders
} from '../schema.drizzle'
import { validateFolderPath } from '../utils/folders'

const entryDto = createSelectSchema(ideaBoxEntries).extend({
  container: z.string(),
  folder: z.string(),
  tags: z.array(z.string())
})

const listIdeaOutput = z.discriminatedUnion('type', [
  entryDto.extend({
    type: z.literal('text'),
    content: z.string()
  }),
  entryDto.extend({
    type: z.literal('image'),
    image: z.string()
  }),
  entryDto.extend({
    type: z.literal('link'),
    link: z.string()
  })
])

function serializeEntry(row: typeof ideaBoxEntries.$inferSelect) {
  return {
    ...row,
    container: row.container,
    folder: row.folder ?? ''
  }
}

function baseEntryInput() {
  return {
    container: endpoints.existsIn(z.string(), ideaBoxContainers),
    folder: z
      .union([endpoints.existsIn(z.string().uuid(), ideaBoxFolders), z.literal('')])
      .optional(),
    tags: z.array(z.string())
  }
}

const createInputDto = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    ...baseEntryInput(),
    content: z.string()
  }),
  z.object({ type: z.literal('image'), ...baseEntryInput() }),
  z.object({
    type: z.literal('link'),
    ...baseEntryInput(),
    link: z
      .url()
      .refine(value => /^https?:/.test(value), 'Link must use HTTP or HTTPS')
  })
])

const updateInputDto = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    tags: z.array(z.string()),
    content: z.string()
  }),
  z.object({ type: z.literal('image'), tags: z.array(z.string()) }),
  z.object({
    type: z.literal('link'),
    tags: z.array(z.string()),
    link: z
      .url()
      .refine(value => /^https?:/.test(value), 'Link must use HTTP or HTTPS')
  })
])

export const list = endpoints
  .query({
    description: 'Get all ideas from a folder or idea container',
    input: {
      query: z.object({
        container: endpoints.existsIn(z.string(), ideaBoxContainers),
        path: z.string(),
        archived: z.string().optional()
      })
    },
    output: {
      OK: z.array(listIdeaOutput)
    }
  })
  .callback(
    async ({
      db,
      query: { container, path: pathParam, archived },
      response
    }) => {
      const path = pathParam.split('/').filter(e => e)

      const parsedArchived = archived === 'true'

      const { folderExists, lastFolder } = await validateFolderPath(
        db,
        container,
        path
      )

      if (!folderExists) {
        return response.badRequest(
          `Folder with path "${pathParam}" does not exist in container "${container}"`
        )
      }

      const rows = await db
        .select({
          entry: ideaBoxEntries,
          text: ideaBoxEntriesText,
          link: ideaBoxEntriesLink,
          image: ideaBoxEntriesImage
        })
        .from(ideaBoxEntries)
        .leftJoin(
          ideaBoxEntriesText,
          eq(ideaBoxEntriesText.base_entry, ideaBoxEntries.id)
        )
        .leftJoin(
          ideaBoxEntriesLink,
          eq(ideaBoxEntriesLink.base_entry, ideaBoxEntries.id)
        )
        .leftJoin(
          ideaBoxEntriesImage,
          eq(ideaBoxEntriesImage.base_entry, ideaBoxEntries.id)
        )
        .where(
          and(
            eq(ideaBoxEntries.container, container),
            eq(ideaBoxEntries.archived, parsedArchived),
            lastFolder
              ? eq(ideaBoxEntries.folder, lastFolder)
              : isNull(ideaBoxEntries.folder)
          )
        )
        .orderBy(desc(ideaBoxEntries.pinned), desc(ideaBoxEntries.created))

      const results = rows.map(row => {
        const base = serializeEntry(row.entry)

        if (row.entry.type === 'text') {
          return {
            ...base,
            type: 'text' as const,
            content: row.text?.content ?? ''
          }
        }

        if (row.entry.type === 'link') {
          return {
            ...base,
            type: 'link' as const,
            link: row.link?.link ?? ''
          }
        }

        return {
          ...base,
          type: 'image' as const,
          image: row.image?.image ?? ''
        }
      })

      return response.ok(results)
    }
  )

export const create = endpoints
  .mutation({
    description: 'Create a new idea entry',
    input: {
      body: createInputDto
    },
    media: {
      image: {
        optional: true
      }
    },
    output: {
      CREATED: entryDto
    }
  })
  .callback(
    async ({ db, body, media: { image }, core: { storage }, response }) => {
      if (body.folder) {
        const folder = requireResult(
          await db.query.folders.findFirst({ where: { id: body.folder } })
        )

        if (folder.container !== body.container)
          return response.badRequest('Folder must be in the same container')
      }

      if (body.type === 'image' && (!image || typeof image === 'string')) {
        return response.badRequest('Image is required for image entries')
      }

      const baseEntry = requireResult(
        (
          await db
            .insert(ideaBoxEntries)
            .values({
              type: body.type,
              container: body.container,
              folder: body.folder || null,
              tags: body.tags
            })
            .returning()
        )[0],
        'Insert returned no row',
        500
      )

      if (body.type === 'text') {
        await db.insert(ideaBoxEntriesText).values({
          base_entry: baseEntry.id,
          content: body.content
        })
      } else if (body.type === 'image') {
        if (!image || typeof image === 'string') {
          return response.badRequest('Image is required for image entries')
        }

        const ref = await storage.save({ file: image })

        await db.insert(ideaBoxEntriesImage).values({
          base_entry: baseEntry.id,
          image: ref?.key ?? ''
        })
      } else {
        await db.insert(ideaBoxEntriesLink).values({
          base_entry: baseEntry.id,
          link: body.link
        })
      }

      return response.created(serializeEntry(baseEntry))
    }
  )

export const update = endpoints
  .mutation({
    description: 'Update an existing idea',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      }),
      body: updateInputDto
    },
    media: {
      image: {
        optional: true
      }
    },
    output: {
      OK: entryDto
    }
  })
  .callback(
    async ({
      db,
      query: { id },
      body,
      media: { image },
      core: { storage },
      response
    }) => {
      const existing = requireResult(
        await db.query.entries.findFirst({ where: { id } })
      )
      const imageEntry =
        body.type === 'image'
          ? await db.query.entries_image.findFirst({
              where: { base_entry: id }
            })
          : undefined

      let imageKey = imageEntry?.image ?? ''

      if (body.type === 'image') {
        if (image && typeof image !== 'string') {
          const ref = await storage.save({ file: image })
          imageKey = ref?.key ?? ''
        } else if (!imageKey || image === 'removed') {
          return response.badRequest('Image is required for image entries')
        }
      }

      const baseEntry = requireResult(
        (
          await db
            .update(ideaBoxEntries)
            .set({ type: body.type, tags: body.tags, updated: new Date() })
            .where(eq(ideaBoxEntries.id, id))
            .returning()
        )[0]
      )

      // Recreate the selected subtype so changing type never leaves stale rows.
      await db
        .delete(ideaBoxEntriesText)
        .where(eq(ideaBoxEntriesText.base_entry, existing.id))
      await db
        .delete(ideaBoxEntriesLink)
        .where(eq(ideaBoxEntriesLink.base_entry, existing.id))
      await db
        .delete(ideaBoxEntriesImage)
        .where(eq(ideaBoxEntriesImage.base_entry, existing.id))

      if (body.type === 'text') {
        await db
          .insert(ideaBoxEntriesText)
          .values({ base_entry: id, content: body.content })
      } else if (body.type === 'image') {
        await db
          .insert(ideaBoxEntriesImage)
          .values({ base_entry: id, image: imageKey })
      } else {
        await db
          .insert(ideaBoxEntriesLink)
          .values({ base_entry: id, link: body.link })
      }

      return response.ok(serializeEntry(baseEntry))
    }
  )

export const remove = endpoints
  .mutation({
    description: 'Delete an idea',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(ideaBoxEntries).where(eq(ideaBoxEntries.id, id))

    return response.noContent()
  })

export const pin = endpoints
  .mutation({
    description: 'Toggle pin status of an idea',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      })
    },
    output: {
      OK: entryDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const idea = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )

    const updated = requireResult(
      (
        await db
          .update(ideaBoxEntries)
          .set({ pinned: !idea.pinned })
          .where(eq(ideaBoxEntries.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeEntry(updated))
  })

export const archive = endpoints
  .mutation({
    description: 'Toggle archive status of an idea',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      })
    },
    output: {
      OK: entryDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const idea = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )

    const updated = requireResult(
      (
        await db
          .update(ideaBoxEntries)
          .set({ archived: !idea.archived, pinned: false })
          .where(eq(ideaBoxEntries.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeEntry(updated))
  })

export const moveTo = endpoints
  .mutation({
    description: 'Move an idea to another folder',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      }),
      body: z.object({
        target: endpoints.existsIn(z.string(), ideaBoxFolders)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, body: { target }, response }) => {
    const entry = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )
    const folder = requireResult(
      await db.query.folders.findFirst({ where: { id: target } })
    )

    if (folder.container !== entry.container) {
      return response.badRequest('Target must be in the same container')
    }

    await db
      .update(ideaBoxEntries)
      .set({ folder: target })
      .where(eq(ideaBoxEntries.id, id))

    return response.noContent()
  })

export const removeFromParent = endpoints
  .mutation({
    description: 'Move idea to parent folder',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxEntries)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const currentIdea = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )

    if (!currentIdea.folder) {
      return response.badRequest('Idea is not in any folder')
    }

    const currentFolder = await db.query.folders.findFirst({
      where: { id: currentIdea.folder }
    })

    if (!currentFolder) {
      return response.badRequest('Current folder does not exist')
    }

    await db
      .update(ideaBoxEntries)
      .set({ folder: currentFolder.parent || null })
      .where(eq(ideaBoxEntries.id, id))

    return response.noContent()
  })
