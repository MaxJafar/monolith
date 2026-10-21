// SPDX-License-Identifier: 0BSD
import mime from 'mime-types'
import { unlink } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

import type { Logger } from '@monolith/log'

import type { FileReference } from './contract/fileReference'
import type { StorageGetOptions, StorageProvider } from './providers/types'
import type { BufferUpload, FileMetadataStore, StagedFile } from './types'
import { generateKey, generateThumbKey, resizeImage } from './utils'

type Upload = BufferUpload | StagedFile
type SaveOptions = {
  file: Upload | 'keep' | 'removed' | null | undefined
  currentKey?: string | null
  thumbs?: string[]
}
const isStaged = (value: Upload): value is StagedFile =>
  '__staged' in value && value.__staged
function source(upload: Upload) {
  const staged = isStaged(upload)
  return {
    bytes: () => (staged ? upload.path : upload.buffer),
    stream: () => (staged ? upload.stream() : Readable.from(upload.buffer)),
    length: staged ? upload.size : upload.buffer.length,
    release: () =>
      staged ? unlink(upload.path).catch(() => {}) : Promise.resolve()
  }
}
export class FileStorage {
  constructor(
    private readonly provider: StorageProvider,
    private readonly store: FileMetadataStore,
    private readonly moduleId: string,
    private readonly logger?: Logger
  ) {}
  private accepts(key: string): boolean {
    const [owner, ...parts] = key.split('/')
    return (
      owner === this.moduleId &&
      parts.length > 0 &&
      !/[\\:\0]/.test(key) &&
      parts.every(part => !!part && part !== '.' && part !== '..')
    )
  }
  private warn(message: string, key: string, error: unknown) {
    this.logger?.warn(message, { key, error: String(error) })
  }
  async getReference(key: string): Promise<FileReference | null> {
    if (!this.accepts(key)) return null
    const record = await this.store.get(key)
    if (!record || record.moduleId !== this.moduleId || record.key !== key)
      return null
    const { moduleId: _owner, ...reference } = record
    return reference
  }
  async get(key: string, options?: StorageGetOptions) {
    return this.accepts(key)
      ? this.provider.get(
          options?.thumb ? generateThumbKey(key, options.thumb) : key
        )
      : null
  }
  async delete(key: string): Promise<void> {
    if (this.accepts(key)) {
      await this.provider.delete(key)
      await this.store.delete(key)
    }
  }
  private async put(upload: Upload, sizes: string[]): Promise<FileReference> {
    const input = source(upload)
    const key = generateKey(
      this.moduleId,
      extname(upload.originalName) || mime.extension(upload.mimeType) || 'bin'
    )
    const reference: FileReference = {
      key,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: input.length,
      thumbs: []
    }
    const pending = new Set([key])
    try {
      await this.provider.save(key, input.stream(), {
        mimeType: upload.mimeType
      })
      if (
        upload.mimeType.startsWith('image/') &&
        !upload.mimeType.includes('svg')
      ) {
        for (const size of new Set(sizes)) {
          let previewKey: string | undefined
          try {
            previewKey = generateThumbKey(key, size)
            const preview = await resizeImage(input.bytes(), size)
            pending.add(previewKey)
            await this.provider.save(
              previewKey,
              Readable.from(preview.buffer),
              { mimeType: upload.mimeType }
            )
            reference.thumbs.push({
              key: previewKey,
              size,
              width: preview.width,
              height: preview.height
            })
          } catch (error) {
            this.warn('Thumbnail generation failed', key, error)
            if (previewKey && pending.has(previewKey)) {
              await this.provider
                .delete(previewKey)
                .catch(error =>
                  this.warn('Thumbnail cleanup failed', previewKey!, error)
                )
              pending.delete(previewKey)
            }
          }
        }
      }
      await this.store.upsert({ ...reference, moduleId: this.moduleId })
    } catch (error) {
      for (const object of [...pending].reverse())
        await this.provider
          .delete(object)
          .catch(cleanup => this.warn('Upload cleanup failed', object, cleanup))
      throw error
    }
    await input.release()
    return reference
  }
  async save(options: SaveOptions): Promise<FileReference | null> {
    const { file, currentKey } = options
    if (file === 'removed') {
      if (currentKey) await this.delete(currentKey)
      return null
    }
    if (!file || file === 'keep')
      return currentKey ? this.getReference(currentKey) : null
    const next = await this.put(file, options.thumbs ?? [])
    // Publish the new object before retiring the previous one.
    if (currentKey && currentKey !== next.key)
      await this.delete(currentKey).catch(error =>
        this.warn('Previous file retained after replacement', currentKey, error)
      )
    return next
  }
}
