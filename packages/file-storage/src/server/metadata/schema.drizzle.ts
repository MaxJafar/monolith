// SPDX-License-Identifier: 0BSD
import type { RelationsBuilder } from 'drizzle-orm'
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core'

import type { ThumbnailInfo } from '../../core/contract/fileReference'

const requiredText = <N extends string>(name: N, length: number) =>
  varchar(name, { length }).notNull()
// Retain the installed table/column names and constraints; no data migration.
export const files = pgTable('files', {
  key: varchar('key', { length: 512 }).primaryKey(),
  moduleId: requiredText('module_id', 255),
  originalName: requiredText('original_name', 512),
  mimeType: requiredText('mime_type', 255),
  size: integer('size').notNull(),
  thumbs: jsonb('thumbs').$type<ThumbnailInfo[]>().notNull().default([]),
  created: timestamp('created', { mode: 'date' }).notNull().defaultNow()
})
export const tables = { files }
export function relations(_builder: RelationsBuilder<typeof tables>) {
  return {}
}
export const filesSchema = { tables, relations }
