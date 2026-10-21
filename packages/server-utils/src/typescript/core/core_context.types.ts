// SPDX-License-Identifier: 0BSD
import type OpenAI from 'openai'
import type { Server } from 'socket.io'
import type { z } from 'zod'

import type { FileStorage } from '@monolith/file-storage'
import type { Logger } from '@monolith/log'

import type { Location } from '../standalone/location.types'
import type { ITempFileManagerConstructor } from './tempfile_manager.types'

type Transform<T> = (value: T, key: string) => T
export type EncryptFunc = Transform<Buffer>
export type DecryptFunc = Transform<Buffer>
export type Encrypt2Func = Transform<string>
export type Decrypt2Func = Transform<string>
export type FetchAIFunc = <
  S extends z.ZodType | undefined = undefined
>(request: {
  provider: string
  model: string
  messages: OpenAI.ChatCompletionMessageParam[]
  structure?: S
}) => Promise<(S extends z.ZodType ? z.infer<S> : string) | null>
export type SearchLocationsFunc = (
  key: string,
  query: string
) => Promise<Location[]>
export type ConvertPDFToImageFunc = (path: string) => Promise<File | undefined>
export type ParseOCRFunc = (path: string) => Promise<string>
export type TaskPoolTask = {
  module: string
  description: string
  createdAt: Date
  updatedAt: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number | string | Record<string, number | string>
  data?: unknown
  error?: string
}
export type GlobalTaskPool = Record<string, TaskPoolTask>
export type AddToTaskPoolFunc = (
  io: Server,
  task: Pick<
    TaskPoolTask,
    'module' | 'description' | 'status' | 'data' | 'progress'
  >
) => string
export type UpdateTaskInPoolFunc = (
  io: Server,
  id: string,
  changes: Partial<TaskPoolTask>
) => void

/** Services supplied by the host to a module request. */
export interface CoreContext {
  logging: Logger
  storage: FileStorage
  tempFile: ITempFileManagerConstructor
  api: {
    getAPIKey(id: string): Promise<string>
    fetchAI: FetchAIFunc
    searchLocations: SearchLocationsFunc
  }
  validation: { checkModulesAvailability(moduleIds: string): Promise<boolean> }
  media: { convertPDFToImage: ConvertPDFToImageFunc; parseOCR: ParseOCRFunc }
  crypto: {
    encrypt: EncryptFunc
    decrypt: DecryptFunc
    encrypt2: Encrypt2Func
    decrypt2: Decrypt2Func
  }
  tasks: {
    global: GlobalTaskPool
    add: AddToTaskPoolFunc
    update: UpdateTaskInPoolFunc
  }
}
