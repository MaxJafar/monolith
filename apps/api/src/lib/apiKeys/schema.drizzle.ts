// SPDX-License-Identifier: 0BSD
import type { RelationsBuilder } from 'drizzle-orm'
import { pgTable } from 'drizzle-orm/pg-core'

import { flag, recordIdentity, storedText } from '../../core/schema/columns'

// Column names and sizes retain compatibility with installed credential stores.
export const apiKeysEntries = pgTable('api_keys__entries', {
  ...recordIdentity(),
  keyId: storedText('key_id').notNull(),
  key: storedText('key', 500).notNull(),
  exposable: flag('exposable'),
  name: storedText('name').notNull(),
  icon: storedText('icon').notNull()
})
export const tables = { apiKeysEntries }
export const relations = (_builder: RelationsBuilder<typeof tables>) => ({})
