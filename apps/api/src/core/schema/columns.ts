// SPDX-License-Identifier: 0BSD
import { boolean, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// Constructors return fresh column builders; a builder must never be shared by tables.
export const storedText = (name: string, length = 255) =>
  varchar(name, { length })
export const flag = (name: string) => boolean(name).default(false).notNull()
export const recordedAt = (name: string) =>
  timestamp(name, { mode: 'date' }).defaultNow().notNull()
export const recordIdentity = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  created: recordedAt('created'),
  updated: recordedAt('updated')
})
