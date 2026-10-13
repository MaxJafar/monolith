import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { fileReferenceSchema } from '@lifeforge/file-storage'
import type { CoreContext } from '@lifeforge/server-utils'

import forge from '../forge'
import { pomodoroSettings } from '../schema.drizzle'
import fetchOrUpdateSettings from '../utils/fetchOrUpdateSettings'

type StorageFile = Parameters<CoreContext['storage']['save']>[0]['file']

const settingsDto = createSelectSchema(pomodoroSettings)
  .omit({ notificationSound: true })
  .extend({
    notificationSound: fileReferenceSchema.nullable()
  })

const updateBodyDto = z.object({
  autoStartBreak: z.boolean().optional(),
  autoStartWork: z.boolean().optional(),
  workColor: z.string().optional(),
  shortBreakColor: z.string().optional(),
  longBreakColor: z.string().optional()
})

async function serialize<
  T extends {
    notificationSound: string | null
  }
>(settings: T, core: CoreContext) {
  return {
    ...settings,
    notificationSound: settings.notificationSound
      ? await core.storage.getReference(settings.notificationSound)
      : null
  }
}

export const get = forge
  .query({
    description: 'Get user pomodoro settings',
    output: {
      OK: settingsDto
    }
  })
  .callback(async ({ db, core, response }) =>
    response.ok(
      await serialize(await fetchOrUpdateSettings({ db, core }), core)
    )
  )

export const update = forge
  .mutation({
    description: 'Update pomodoro settings',
    input: {
      body: updateBodyDto
    },
    media: {
      notificationSound: {
        optional: true
      }
    },
    output: {
      OK: settingsDto
    }
  })
  .callback(
    async ({ body, media: { notificationSound }, db, core, response }) => {
      const current = await fetchOrUpdateSettings({ db, core })

      const notificationSoundRef = await core.storage.save({
        file: notificationSound as StorageFile,
        currentKey: current.notificationSound || undefined
      })

      const updated = await fetchOrUpdateSettings({
        db,
        core,
        overwrite: {
          ...body,
          notificationSound: notificationSoundRef?.key ?? null
        }
      })

      return response.ok(await serialize(updated, core))
    }
  )
