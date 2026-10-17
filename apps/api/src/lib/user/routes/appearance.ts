import { eq, sql } from 'drizzle-orm'
import sharp from 'sharp'
import z from 'zod'

import {
  APPEARANCE_LAYOUT_KEY,
  appearanceRecordSchema,
  appearanceSchema,
  readAppearanceRecord
} from '@monolith/blocks'
import { fileReferenceSchema } from '@monolith/file-storage'
import { ClientError } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

export const getAppearance = endpoints
  .query({
    description: 'Read the authenticated account appearance',
    input: {},
    output: { OK: appearanceRecordSchema }
  })
  .callback(async ({ db, res, response }) => {
    const [user] = await db
      .select({ layout: users.dashboardLayout })
      .from(users)
      .where(eq(users.id, res.locals.userId as string))

    if (!user) return response.unauthorized()

    return response.ok(readAppearanceRecord(user.layout))
  })

export const saveAppearance = endpoints
  .mutation({
    description: 'Save global appearance with revision protection',
    input: {
      body: z
        .object({
          appearance: appearanceSchema,
          expected_revision: z.number().int().nonnegative()
        })
        .strict()
    },
    output: { OK: appearanceRecordSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const [user] = await db
      .select({ id: users.id, layout: users.dashboardLayout })
      .from(users)
      .where(eq(users.id, res.locals.userId as string))
      .for('update')

    if (!user) return response.unauthorized()

    const current = readAppearanceRecord(user.layout)

    if (current.revision !== body.expected_revision)
      throw new ClientError(
        'Appearance changed elsewhere. Reload settings before saving.',
        409
      )

    const saved = {
      appearance: body.appearance,
      revision: current.revision + 1
    }
    await db
      .update(users)
      .set({
        dashboardLayout: sql`coalesce(${users.dashboardLayout}::jsonb, '{}'::jsonb) || jsonb_build_object(${APPEARANCE_LAYOUT_KEY}::text, ${JSON.stringify(saved)}::jsonb)`,
        updated: new Date()
      })
      .where(eq(users.id, user.id))

    return response.ok(saved)
  })

export const uploadCover = endpoints
  .mutation({
    description: 'Upload a page or workspace cover image',
    input: {},
    media: { file: { optional: false } },
    output: { OK: fileReferenceSchema }
  })
  .callback(async ({ media: { file }, core, response }) => {
    if (
      typeof file === 'string' ||
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.mimeType
      ) ||
      file.size > 5_000_000
    )
      return response.badRequest(
        'Choose a PNG, JPEG, WebP or GIF image smaller than 5 MB'
      )
    let buffer: Buffer

    try {
      buffer = await sharp(file.path, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 2200, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
    } catch {
      return response.badRequest('This image could not be read')
    }

    const saved = await core.storage.save({
      file: {
        buffer,
        mimeType: 'image/webp',
        originalName: 'cover.webp'
      }
    })

    if (!saved) return response.badRequest('The cover could not be uploaded')

    return response.ok(saved)
  })
