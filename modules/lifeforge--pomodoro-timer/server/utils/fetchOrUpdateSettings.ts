import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import fs from 'node:fs'
import path from 'node:path'

import type { BuiltModuleSchema } from '@lifeforge/drizzle'
import { requireResult } from '@lifeforge/server-utils'
import type { CoreContext } from '@lifeforge/server-utils'

import type { PomodoroTimerSchema } from '../forge'
import { pomodoroSettings } from '../schema.drizzle'

const DEFAULT_SOUND_LOCATION = path.resolve(
  import.meta.dirname,
  '../assets/bell.opus'
)

const DEFAULT_SETTINGS = {
  workColor: '#fb2c36',
  shortBreakColor: '#9ae600',
  longBreakColor: '#00d3f2',
  autoStartBreak: false,
  autoStartWork: false
}

type SettingsInput = Partial<{
  autoStartBreak: boolean
  autoStartWork: boolean
  workColor: string
  shortBreakColor: string
  longBreakColor: string
  notificationSound: string | null
}>

export default async function fetchOrUpdateSettings({
  db,
  core,
  overwrite
}: {
  db: PostgresJsDatabase<BuiltModuleSchema<PomodoroTimerSchema>>
  core: CoreContext
  overwrite?: SettingsInput
}) {
  const settings = await db.query.settings.findFirst()

  if (!settings) {
    const notificationSound = await core.storage.save({
      file: {
        buffer: fs.readFileSync(DEFAULT_SOUND_LOCATION),
        originalName: 'bell.opus',
        mimeType: 'audio/opus'
      }
    })

    const created = requireResult(
      (
        await db
          .insert(pomodoroSettings)
          .values({
            ...DEFAULT_SETTINGS,
            ...(overwrite ?? {}),
            notificationSound: notificationSound?.key ?? null
          })
          .returning()
      )[0],
      'Insert returned no row',
      500
    )

    return created
  }

  if (!overwrite || Object.keys(overwrite).length === 0) {
    return settings
  }

  const updated = requireResult(
    (
      await db
        .update(pomodoroSettings)
        .set(overwrite)
        .where(eq(pomodoroSettings.id, settings.id))
        .returning()
    )[0]
  )

  return updated
}
