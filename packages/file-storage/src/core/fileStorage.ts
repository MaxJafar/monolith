import mime from 'mime-types'
import { unlink } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

import type { Logger } from '@monolith/log'

import type { FileReference } from './contract/fileReference'
import type {
  FileStream,
  StorageGetOptions,
  StorageProvider
} from './providers/types'
import type { BufferUpload, FileMetadataStore, StagedFile } from './types'
import { generateKey, generateThumbKey, resizeImage } from './utils'

type Upload = StagedFile | BufferUpload
type SaveRequest = {
  file: Upload | 'keep' | 'removed' | null | undefined
  currentKey?: string | null
  thumbs?: string[]
}

function staged(file: Upload): file is StagedFile {
  return '__staged' in file && file.__staged === true
}

export class FileStorage {
  constructor(
    private readonly provider: StorageProvider,
    private readonly store: FileMetadataStore,
    private readonly moduleId: string,
    private readonly logger?: Logger
  ) {}

  private owns(key: string): boolean {
    return (
      key.startsWith(this.moduleId + '/') &&
      !key.includes('\\') &&
      !key.includes('\0') &&
      key.split('/').every(part => part !== '..' && part !== '.')
    )
  }

  async getReference(key: string): Promise<FileReference | null> {
    if (!this.owns(key)) return null
    const record = await this.store.get(key)
    if (!record || record.moduleId !== this.moduleId) return null
    return {
      key: record.key,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      thumbs: record.thumbs
    }
  }

  async get(
    key: string,
    options?: StorageGetOptions
  ): Promise<FileStream | null> {
    if (!this.owns(key)) return null
    return this.provider.get(
      options?.thumb ? generateThumbKey(key, options.thumb) : key
    )
  }

  async delete(key: string): Promise<void> {
    if (!this.owns(key)) return
    await this.provider.delete(key)
    await this.store.delete(key)
  }

  async save({
    file,
    currentKey,
    thumbs = []
  }: SaveRequest): Promise<FileReference | null> {
    if (file === 'removed') {
      if (currentKey) await this.delete(currentKey)
      return null
    }
    if (!file || file === 'keep')
      return currentKey ? this.getReference(currentKey) : null

    const suffix =
      extname(file.originalName) || mime.extension(file.mimeType) || 'bin'
    const key = generateKey(this.moduleId, suffix)
    const record: FileReference = {
      key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: staged(file) ? file.size : file.buffer.length,
      thumbs: []
    }
    try {
      await this.provider.save(
        key,
        staged(file) ? file.stream() : Readable.from(file.buffer),
        { mimeType: file.mimeType }
      )
      if (/^image\//.test(file.mimeType) && !file.mimeType.includes('svg')) {
        for (const size of new Set(thumbs)) {
          try {
            const resized = await resizeImage(
              staged(file) ? file.path : file.buffer,
              size
            )
            const thumbKey = generateThumbKey(key, size)
            await this.provider.save(thumbKey, Readable.from(resized.buffer), {
              mimeType: file.mimeType
            })
            record.thumbs.push({
              key: thumbKey,
              size,
              width: resized.width,
              height: resized.height
            })
          } catch (error) {
            this.logger?.warn('Thumbnail could not be generated', {
              key,
              size,
              error: String(error)
            })
          }
        }
      }
      await this.store.upsert({ ...record, moduleId: this.moduleId })
    } catch (error) {
      await this.provider
        .delete(key)
        .catch(cleanup =>
          this.logger?.warn('Upload cleanup failed', {
            key,
            error: String(cleanup)
          })
        )
      throw error
    }

    // Keep the previous object until this save has written bytes and metadata.
    // An outer database transaction can still roll back independently of object storage.
    if (currentKey && currentKey !== key)
      await this.delete(currentKey).catch(error =>
        this.logger?.warn('Previous file retained after replacement', {
          key: currentKey,
          error: String(error)
        })
      )
    if (staged(file)) await unlink(file.path).catch(() => {})
    return record
  }
}
