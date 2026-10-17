import { and, asc, eq, isNull } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { ideaBoxContainers, ideaBoxFolders } from '../schema.drizzle'
import { validateFolderPath } from '../utils/folders'

const folderDto = createSelectSchema(ideaBoxFolders).extend({
  container: z.string(),
  parent: z.string()
})

function serializeFolder(row: typeof ideaBoxFolders.$inferSelect) {
  return {
    ...row,
    container: row.container ?? '',
    parent: row.parent ?? ''
  }
}

export const list = endpoints
  .query({
    description: 'Get all folders in a path',
    input: {
      query: z.object({
        container: endpoints.existsIn(z.string(), ideaBoxContainers),
        path: z.string()
      })
    },
    output: {
      OK: z.array(folderDto)
    }
  })
  .callback(async ({ db, query: { container, path }, response }) => {
    const pathSegments = path.split('/').filter(p => p !== '')

    const { folderExists, lastFolder } = await validateFolderPath(
      db,
      container,
      pathSegments
    )

    if (!folderExists) {
      return response.badRequest(
        `Folder with path "${path}" does not exist in container "${container}"`
      )
    }

    const rows = await db
      .select()
      .from(ideaBoxFolders)
      .where(
        and(
          eq(ideaBoxFolders.container, container),
          lastFolder
            ? eq(ideaBoxFolders.parent, lastFolder)
            : isNull(ideaBoxFolders.parent)
        )
      )
      .orderBy(asc(ideaBoxFolders.name))

    return response.ok(rows.map(serializeFolder))
  })

export const create = endpoints
  .mutation({
    description: 'Create a new folder',
    input: {
      body: z.object({
        container: endpoints.existsIn(z.string(), ideaBoxContainers),
        name: z.string().trim().min(1),
        color: z.string(),
        icon: z.string(),
        parent: z
          .union([
            endpoints.existsIn(z.string().uuid(), ideaBoxFolders),
            z.literal('')
          ])
          .optional()
      })
    },
    output: {
      CREATED: folderDto
    }
  })
  .callback(async ({ db, body, response }) => {
    if (body.parent) {
      const parent = requireResult(
        await db.query.folders.findFirst({ where: { id: body.parent } })
      )

      if (parent.container !== body.container)
        return response.badRequest('Parent must be in the same container')
    }

    const created = requireResult(
      (
        await db
          .insert(ideaBoxFolders)
          .values({
            container: body.container,
            name: body.name,
            color: body.color,
            icon: body.icon,
            parent: body.parent || null
          })
          .returning()
      )[0],
      'Insert returned no row',
      500
    )

    return response.created(serializeFolder(created))
  })

export const update = endpoints
  .mutation({
    description: 'Update folder details',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxFolders)
      }),
      body: z.object({
        name: z.string().trim().min(1),
        color: z.string(),
        icon: z.string()
      })
    },
    output: {
      OK: folderDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(ideaBoxFolders)
          .set(body)
          .where(eq(ideaBoxFolders.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeFolder(updated))
  })

export const moveTo = endpoints
  .mutation({
    description: 'Move folder to another parent',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxFolders)
      }),
      body: z.object({
        target: endpoints.existsIn(z.string(), ideaBoxFolders)
      })
    },
    output: {
      OK: folderDto
    }
  })
  .callback(async ({ db, query: { id }, body: { target }, response }) => {
    const folder = requireResult(
      await db.query.folders.findFirst({ where: { id } })
    )

    let parent = await db.query.folders.findFirst({ where: { id: target } })

    const visited = new Set<string>()

    while (parent) {
      if (parent.id === id || visited.has(parent.id))
        return response.badRequest(
          'A folder cannot contain itself or its descendants'
        )
      if (parent.container !== folder.container)
        return response.badRequest('Target must be in the same container')
      visited.add(parent.id)
      parent = parent.parent
        ? await db.query.folders.findFirst({ where: { id: parent.parent } })
        : undefined
    }

    const updated = requireResult(
      (
        await db
          .update(ideaBoxFolders)
          .set({ parent: target })
          .where(eq(ideaBoxFolders.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeFolder(updated))
  })

export const removeFromParent = endpoints
  .mutation({
    description: 'Move folder to parent folder',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxFolders)
      })
    },
    output: {
      OK: folderDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const currentFolder = requireResult(
      await db.query.folders.findFirst({
        where: { id }
      })
    )

    if (!currentFolder.parent) {
      return response.badRequest('Folder is already at root level')
    }

    const parentFolder = requireResult(
      await db.query.folders.findFirst({
        where: { id: currentFolder.parent }
      })
    )

    const updated = requireResult(
      (
        await db
          .update(ideaBoxFolders)
          .set({ parent: parentFolder.parent || null })
          .where(eq(ideaBoxFolders.id, id))
          .returning()
      )[0]
    )

    return response.ok(serializeFolder(updated))
  })

export const remove = endpoints
  .mutation({
    description: 'Delete a folder',
    input: {
      query: z.object({
        id: endpoints.existsIn(z.string(), ideaBoxFolders)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(ideaBoxFolders).where(eq(ideaBoxFolders.id, id))

    return response.noContent()
  })
