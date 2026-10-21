// SPDX-License-Identifier: 0BSD
import type { Readable } from 'node:stream'

import type { FileReference } from './contract/fileReference'

type FileIdentity = { originalName: string; mimeType: string }
export type BufferUpload = FileIdentity & { buffer: Buffer }
export type StagedFile = Readonly<
  FileIdentity & {
    __staged: true
    size: number
    path: string
  }
> & {
  read(): Promise<Buffer>
  stream(): Readable
}
export type StoredFileReference = FileReference & { moduleId: string }
export type FileMetadataStore = {
  get(key: string): Promise<StoredFileReference | null>
  upsert(reference: StoredFileReference): Promise<void>
  delete(key: string): Promise<void>
}
