import { eq, sql } from 'drizzle-orm'
import z from 'zod'

import { APPEARANCE_LAYOUT_KEY } from '@monolith/blocks'
import { fileReferenceSchema } from '@monolith/file-storage'

import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

export { getAppearance, saveAppearance, uploadCover } from './appearance'

export const updateBgImage = endpoints
  .mutation({
    description: 'Upload new background image',
    input: {},
    media: {
      file: {
        optional: false
      }
    },
    output: {
      OK: fileReferenceSchema
    }
  })
  .callback(async ({ res, db, media: { file }, core, response }) => {
    if (typeof file === 'string') {
      return response.badRequest('A valid background image must be uploaded')
    }

    const user = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })

    if (!user) {
      return response.unauthorized()
    }

    const bgImageRef = await core.storage.save({
      file,
      currentKey: user.bgImage || undefined
    })

    if (!bgImageRef) {
      return response.badRequest('Failed to save background image')
    }

    await db
      .update(users)
      .set({
        bgImage: bgImageRef.key,
        backdropFilters: {
          brightness: 100,
          blur: 'none',
          contrast: 100,
          saturation: 100,
          overlayOpacity: 50
        },
        updated: new Date()
      })
      .where(eq(users.id, user.id))

    return response.ok(bgImageRef)
  })

export const deleteBgImage = endpoints
  .mutation({
    description: 'Remove background image',
    input: {},
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ res, db, core, response }) => {
    const user = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })

    if (!user) {
      return response.unauthorized()
    }

    if (user.bgImage) {
      await core.storage.delete(user.bgImage)
    }

    await db
      .update(users)
      .set({
        bgImage: null,
        updated: new Date()
      })
      .where(eq(users.id, user.id))

    return response.noContent()
  })

export const updatePersonalization = endpoints
  .mutation({
    description: 'Update user personalization preferences',
    input: {
      body: z.object({
        data: z.object({
          fontFamily: z.string().optional(),
          theme: z.string().optional(),
          color: z.string().optional(),
          bgTemp: z.string().optional(),
          language: z.string().optional(),
          fontScale: z.number().optional(),
          borderRadiusMultiplier: z.number().optional(),
          bordered: z.boolean().optional(),
          dashboardLayout: z.record(z.string(), z.any()).optional(),
          backdropFilters: z.record(z.string(), z.any()).optional()
        })
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ res, db, body: { data }, response }) => {
    const user = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })

    if (!user) {
      return response.unauthorized()
    }

    const toBeUpdated: Record<string, unknown> = {}

    for (const item of [
      'fontFamily',
      'theme',
      'color',
      'bgTemp',
      'language',
      'fontScale',
      'borderRadiusMultiplier',
      'bordered',
      'dashboardLayout',
      'backdropFilters'
    ]) {
      if (data[item as keyof typeof data] !== undefined) {
        toBeUpdated[item] = data[item as keyof typeof data]
      }
    }

    if (!Object.keys(toBeUpdated).length) {
      return response.badRequest('No data to update')
    }

    toBeUpdated.updated = new Date()

    // The builder owns this reserved setting; dashboard layout saves preserve it atomically.
    if (data.dashboardLayout !== undefined) {
      const { [APPEARANCE_LAYOUT_KEY]: _appearance, ...layout } =
        data.dashboardLayout
      toBeUpdated.dashboardLayout = sql`${JSON.stringify(layout)}::jsonb || jsonb_build_object(${APPEARANCE_LAYOUT_KEY}::text, ${users.dashboardLayout}::jsonb -> ${APPEARANCE_LAYOUT_KEY}::text)`
    }

    await db.update(users).set(toBeUpdated).where(eq(users.id, user.id))

    return response.noContent()
  })
