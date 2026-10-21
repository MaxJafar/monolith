// SPDX-License-Identifier: 0BSD
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { APPEARANCE_LAYOUT_KEY } from '@monolith/blocks'
import { fileReferenceSchema } from '@monolith/file-storage'

import { accountFor, changeAccountImage, updateAccount } from '../account'
import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

export { getAppearance, saveAppearance, uploadCover } from './appearance'

export const updateBgImage = endpoints
  .mutation({
    description: 'Replace the current account background',
    input: {},
    media: { file: { optional: false } },
    output: { OK: fileReferenceSchema }
  })
  .callback(async ({ db, res, core, media, response }) => {
    if (!media.file || typeof media.file === 'string')
      return response.badRequest('Choose a background image')
    const saved = await changeAccountImage({
      db,
      userId: res.locals.userId as string,
      storage: core.storage,
      field: 'bgImage',
      file: media.file
    })
    return saved
      ? response.ok(saved)
      : response.badRequest('Image could not be saved')
  })
export const deleteBgImage = endpoints
  .mutation({
    description: 'Clear the current account background',
    input: {},
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, core, response }) => {
    await changeAccountImage({
      db,
      userId: res.locals.userId as string,
      storage: core.storage,
      field: 'bgImage',
      remove: true
    })
    return response.noContent()
  })

export const updatePersonalization = endpoints
  .mutation({
    description: 'Save account display preferences',
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
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    const account = await accountFor(db, res.locals.userId as string)
    const values = Object.fromEntries(
      Object.entries(body.data).filter(([, value]) => value !== undefined)
    )
    if (!Object.keys(values).length)
      return response.badRequest('No data to update')
    if (body.data.dashboardLayout !== undefined) {
      const layout = { ...body.data.dashboardLayout }
      delete layout[APPEARANCE_LAYOUT_KEY]
      // The appearance builder owns this field; preserve its latest value in the database.
      values.dashboardLayout = sql`${JSON.stringify(layout)}::jsonb || jsonb_build_object(${APPEARANCE_LAYOUT_KEY}::text, ${users.dashboardLayout}::jsonb -> ${APPEARANCE_LAYOUT_KEY}::text)`
    }
    await updateAccount(db, account.id, values)
    return response.noContent()
  })
