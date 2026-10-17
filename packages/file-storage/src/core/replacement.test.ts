import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'

import { FileStorage } from './fileStorage'
import type { StorageProvider } from './providers/types'
import type { FileMetadataStore, StoredFileReference } from './types'

describe('file replacement failure recovery', () => {
  it('preserves the previous file when metadata cannot be committed', async () => {
    const old: StoredFileReference = {
      key: 'notes/old.txt',
      moduleId: 'notes',
      originalName: 'old.txt',
      size: 3,
      mimeType: 'text/plain',
      thumbs: []
    }
    const objects = new Map([[old.key, Buffer.from('old')]])
    const provider: StorageProvider = {
      save: async (key, stream) => {
        const chunks: Buffer[] = []
        for await (const chunk of stream) chunks.push(Buffer.from(chunk))
        objects.set(key, Buffer.concat(chunks))
      },
      delete: vi.fn(async key => {
        objects.delete(key)
      }),
      get: async key =>
        objects.has(key)
          ? {
              stream: Readable.from(objects.get(key)!),
              size: objects.get(key)!.length,
              mimeType: 'text/plain'
            }
          : null
    }
    const store: FileMetadataStore = {
      upsert: async () => {
        throw new Error('Database unavailable')
      },
      get: async key => (key === old.key ? old : null),
      delete: vi.fn()
    }
    const storage = new FileStorage(provider, store, 'notes')
    await expect(
      storage.save({
        currentKey: old.key,
        file: {
          originalName: 'new.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('new')
        }
      })
    ).rejects.toThrow('Database unavailable')
    expect([...objects.keys()]).toEqual([old.key])
    expect(await storage.getReference(old.key)).toEqual(
      expect.objectContaining({ key: old.key })
    )
    expect(store.delete).not.toHaveBeenCalled()
  })
})
