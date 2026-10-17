import { type TablesRelationalConfig, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { FileMetadataStore } from '../../core/types'
import { files } from './schema.drizzle'

const referenceColumns = {
  key: files.key,
  moduleId: files.moduleId,
  originalName: files.originalName,
  mimeType: files.mimeType,
  size: files.size,
  thumbs: files.thumbs
}

export function createFileMetadataStore<S extends TablesRelationalConfig>(
  database: PostgresJsDatabase<S>
): FileMetadataStore {
  return {
    async get(key) {
      const result = await database
        .select(referenceColumns)
        .from(files)
        .where(eq(files.key, key))
        .limit(1)

      return result.at(0) ?? null
    },
    async upsert(reference) {
      const { key, moduleId, originalName, mimeType, size, thumbs } = reference
      const data = {
        key,
        moduleId,
        originalName,
        mimeType,
        size,
        thumbs: structuredClone(thumbs)
      }
      await database.insert(files).values(data).onConflictDoUpdate({
        target: files.key,
        set: data
      })
    },
    async delete(key) {
      await database.delete(files).where(eq(files.key, key))
    }
  }
}
