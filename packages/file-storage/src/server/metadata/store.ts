// SPDX-License-Identifier: 0BSD
import { type TablesRelationalConfig, eq, getTableColumns } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { fileReferenceSchema } from '../../core/contract/fileReference'
import type { FileMetadataStore } from '../../core/types'
import { files } from './schema.drizzle'

export function createFileMetadataStore<T extends TablesRelationalConfig>(
  database: PostgresJsDatabase<T>
): FileMetadataStore {
  const { created: _created, ...columns } = getTableColumns(files)
  return {
    async get(key) {
      const rows = await database
        .select(columns)
        .from(files)
        .where(eq(files.key, key))
        .limit(1)
      return rows[0] ?? null
    },
    async delete(key) {
      await database.delete(files).where(eq(files.key, key))
    },
    async upsert(value) {
      const reference = {
        ...fileReferenceSchema.parse(value),
        moduleId: value.moduleId
      }
      await database
        .insert(files)
        .values(reference)
        .onConflictDoUpdate({ target: files.key, set: reference })
    }
  }
}
