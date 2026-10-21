// SPDX-License-Identifier: 0BSD
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import type { Readable } from 'node:stream'

import type { FileMetadataStore, StoredFileReference } from './core/types'

export async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), 'monolith-storage-test-'))
  return {
    root,
    async dispose() {
      if (
        dirname(resolve(root)) !== resolve(tmpdir()) ||
        !basename(root).startsWith('monolith-storage-test-')
      )
        throw Error('Unexpected test sandbox')
      await rm(root, { recursive: true, force: true })
    }
  }
}
export async function readStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
export function memoryIndex(): FileMetadataStore {
  const records = new Map<string, StoredFileReference>()
  return {
    get: async key => structuredClone(records.get(key) ?? null),
    upsert: async reference => {
      records.set(reference.key, structuredClone(reference))
    },
    delete: async key => {
      records.delete(key)
    }
  }
}
