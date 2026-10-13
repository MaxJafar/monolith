import { createSelectSchema } from 'drizzle-orm/zod'
import ogs from 'open-graph-scraper'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  ideaBoxContainers,
  ideaBoxEntries,
  ideaBoxFolders
} from '../schema.drizzle'
import { recursivelySearchFolder } from '../utils/folders'

const containerDto = createSelectSchema(ideaBoxContainers)

const folderDto = createSelectSchema(ideaBoxFolders).extend({
  container: z.string(),
  parent: z.string()
})

const entryDto = createSelectSchema(ideaBoxEntries).extend({
  container: z.string(),
  folder: z.string(),
  tags: z.array(z.string())
})

const ogDataDto = z.object({
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogSiteName: z.string().optional(),
  ogImage: z
    .array(
      z.object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        type: z.string().optional()
      })
    )
    .optional()
})

type OgData = z.infer<typeof ogDataDto> & { requestUrl?: string }

const OGCache = new Map<string, OgData>()

function serializeFolder(row: typeof ideaBoxFolders.$inferSelect) {
  return {
    ...row,
    container: row.container ?? '',
    parent: row.parent ?? ''
  }
}

export const getPath = forge
  .query({
    description: 'Get path information for a container or folder',
    input: {
      query: z.object({
        container: forge.existsIn(z.string(), ideaBoxContainers),
        folder: forge.existsIn(z.string(), ideaBoxFolders).optional()
      })
    },
    output: {
      OK: z.object({
        container: containerDto,
        route: z.array(folderDto)
      })
    }
  })
  .callback(async ({ db, query: { container, folder }, response }) => {
    const containerEntry = requireResult(
      await db.query.containers.findFirst({
        where: { id: container }
      })
    )

    if (!folder) {
      return response.ok({
        container: containerEntry,
        route: []
      })
    }

    let lastFolder = folder

    const fullPath: Array<typeof ideaBoxFolders.$inferSelect> = []
    const visited = new Set<string>()

    while (lastFolder) {
      if (visited.has(lastFolder))
        return response.badRequest('Folder path contains a cycle')
      visited.add(lastFolder)

      const folderEntry = await db.query.folders.findFirst({
        where: { id: lastFolder }
      })

      if (!folderEntry) {
        return response.badRequest(
          `Folder with ID "${lastFolder}" does not exist`
        )
      }

      if (folderEntry.container !== container) {
        return response.badRequest('Invalid path')
      }

      lastFolder = folderEntry.parent ?? ''
      fullPath.unshift(folderEntry)
    }

    return response.ok({
      container: containerEntry,
      route: fullPath.map(serializeFolder)
    })
  })

export const checkValid = forge
  .query({
    description: 'Validate if a folder path exists',
    input: {
      query: z.object({
        container: z.string(),
        path: z.string()
      })
    },
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ db, query: { container, path }, response }) => {
    const containerExists = !!(await db.query.containers.findFirst({
      where: { id: container }
    }))

    if (!containerExists) {
      return response.ok(false)
    }

    let folderExists = true
    let lastFolder = ''

    for (const folder of path.split('/').filter(e => e)) {
      const folderEntry = await db.query.folders.findFirst({
        where: { id: folder }
      })

      if (
        !folderEntry ||
        (folderEntry.parent ?? '') !== lastFolder ||
        folderEntry.container !== container
      ) {
        folderExists = false
        break
      }

      lastFolder = folder
    }

    return response.ok(folderExists)
  })

export const getOgData = forge
  .query({
    description: 'Get Open Graph metadata for a link entry',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), ideaBoxEntries)
      })
    },
    output: {
      OK: ogDataDto
    }
  })
  .callback(async ({ db, query: { id }, core: { logging }, response }) => {
    const data = await db.query.entries_link.findFirst({
      where: { base_entry: id }
    })

    if (!data) {
      return response.badRequest('Link entry not found')
    }

    const cached = OGCache.get(id)

    if (cached?.requestUrl === data.link) {
      return response.ok(cached)
    }

    const { result } = await ogs({
      url: data.link,
      fetchOptions: {
        headers: {
          'User-Agent':
            'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        }
      }
    }).catch(() => {
      logging.error(`Error fetching Open Graph data: ${data.link}`)

      return { result: null }
    })

    const payload: OgData = {
      ogTitle: result?.ogTitle,
      ogDescription: result?.ogDescription,
      ogSiteName: result?.ogSiteName,
      ogImage: result?.ogImage?.map(image => ({
        url: image.url,
        width: image.width,
        height: image.height,
        type: image.type
      })),
      requestUrl: data.link
    }

    OGCache.set(id, payload)

    return response.ok(payload)
  })

export const search = forge
  .query({
    description: 'Search entries in a container',
    input: {
      query: z.object({
        q: z.string(),
        container: forge.existsIn(z.string(), ideaBoxContainers),
        tags: z.string().optional(),
        folder: z.string().optional()
      })
    },
    output: {
      OK: z.array(
        entryDto.extend({
          content: z.string(),
          type: z.literal('text'),
          fullPath: z.string(),
          expand: z.object({
            folder: folderDto.optional()
          })
        })
      )
    }
  })
  .callback(async ({ db, query: { q, container, tags, folder }, response }) => {
    const results = await recursivelySearchFolder(
      db,
      folder || '',
      q,
      container,
      tags,
      ''
    )

    return response.ok(
      results.map(result => ({
        ...result,
        container: result.container,
        folder: result.folder ?? '',
        expand: {
          folder: result.expand.folder
            ? serializeFolder(result.expand.folder)
            : undefined
        }
      }))
    )
  })
