// SPDX-License-Identifier: 0BSD
import type { Readable } from 'node:stream'

export type FileStream = { stream: Readable; size: number; mimeType: string }
export type StorageGetOptions = { thumb?: string }
export type ProviderSaveOptions = { mimeType?: string }
export type StorageProvider = {
  get(key: string, options?: StorageGetOptions): Promise<FileStream | null>
  save(
    key: string,
    source: Readable,
    options?: ProviderSaveOptions
  ): Promise<void>
  delete(key: string): Promise<void>
}
