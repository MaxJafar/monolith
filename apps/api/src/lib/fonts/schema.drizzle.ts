// SPDX-License-Identifier: 0BSD
import type { RelationsBuilder } from 'drizzle-orm'
import { pgTable, real } from 'drizzle-orm/pg-core'

import {
  recordIdentity,
  recordedAt,
  storedText
} from '../../core/schema/columns'

export const fontsPinnedFonts = pgTable('fonts__pinned_fonts', {
  family: storedText('family').primaryKey(),
  created: recordedAt('created')
})
export const fontsFontFamilyUpload = pgTable('fonts__font_family_upload', {
  ...recordIdentity(),
  family: storedText('family').notNull(),
  displayName: storedText('display_name').notNull(),
  weight: real('weight').default(400).notNull(),
  file: storedText('file').notNull()
})
export const tables = { fontsFontFamilyUpload, fontsPinnedFonts }
export const relations = (_builder: RelationsBuilder<typeof tables>) => ({})
