import { eq } from 'drizzle-orm'
import { extname } from 'node:path'
import { z } from 'zod'

import { type FileStorage, fileReferenceSchema } from '@monolith/file-storage'

import endpoints from '../endpoints'
import { fontsFontFamilyUpload as uploads } from '../schema.drizzle'

const identity = z.object({ id: z.string().min(1) })
const editable = z.object({
  displayName: z.string().trim().min(1).max(255),
  family: z.string().trim().min(1).max(255),
  weight: z.number().min(100).max(900).default(400)
})
const uploadedFont = editable.extend({
  id: z.string(),
  created: z.date(),
  updated: z.date(),
  file: fileReferenceSchema.nullable()
})
const extensions = new Set(['.ttf', '.otf', '.woff', '.woff2'])

async function describeFont(
  row: typeof uploads.$inferSelect,
  storage: FileStorage
) {
  return {
    ...row,
    file: row.file ? await storage.getReference(row.file) : null
  }
}

export const list = endpoints
  .query({
    description: 'Browse uploaded font families',
    output: { OK: z.array(uploadedFont) }
  })
  .callback(async ({ db, core, response }) => {
    const rows = await db.query.fontsFontFamilyUpload.findMany({
      orderBy: { created: 'asc' }
    })
    return response.ok(
      await Promise.all(rows.map(row => describeFont(row, core.storage)))
    )
  })

export const get = endpoints
  .query({
    description: 'Read an uploaded font',
    input: { query: identity },
    output: { OK: uploadedFont }
  })
  .callback(async ({ db, core, query, response }) => {
    const row = await db.query.fontsFontFamilyUpload.findFirst({
      where: { id: query.id }
    })
    return row
      ? response.ok(await describeFont(row, core.storage))
      : response.notFound()
  })

export const upload = endpoints
  .mutation({
    description: 'Save an uploaded font and its display settings',
    input: { query: identity.partial(), body: editable },
    media: { file: { optional: false } },
    output: { OK: uploadedFont }
  })
  .callback(async ({ db, core, query, body, media, response }) => {
    const file = media.file
    if (
      !file ||
      typeof file === 'string' ||
      !extensions.has(extname(file.originalName).toLowerCase())
    )
      return response.badRequest('Upload a TTF, OTF, WOFF or WOFF2 font file')
    const previous = query.id
      ? await db.query.fontsFontFamilyUpload.findFirst({
          where: { id: query.id }
        })
      : undefined
    if (query.id && !previous) return response.notFound()

    // Keep the previous object until the new row is successfully written.
    const saved = await core.storage.save({ file })
    if (!saved) return response.badRequest('Unable to store this font')
    let row: typeof uploads.$inferSelect | undefined
    try {
      const values = { ...body, file: saved.key }
      const rows = previous
        ? await db
            .update(uploads)
            .set({ ...values, updated: new Date() })
            .where(eq(uploads.id, previous.id))
            .returning()
        : await db.insert(uploads).values(values).returning()
      row = rows[0]
      if (!row) throw new Error('Font write returned no record')
    } catch (error) {
      await core.storage.delete(saved.key).catch(() => {})
      throw error
    }
    if (previous?.file && previous.file !== saved.key)
      await core.storage.delete(previous.file)
    return response.ok({ ...row, file: saved })
  })

export const remove = endpoints
  .mutation({
    description: 'Remove an uploaded font',
    input: { query: identity },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, core, query, response }) => {
    const [row] = await db
      .delete(uploads)
      .where(eq(uploads.id, query.id))
      .returning()
    if (!row) return response.notFound()
    if (row.file) await core.storage.delete(row.file)
    return response.noContent()
  })
