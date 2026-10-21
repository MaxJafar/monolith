// SPDX-License-Identifier: 0BSD
import type { z } from 'zod'

import type { ErrorOutputKey, OutputType, SuccessOutputKey } from './status'

export interface BaseResponse<T = ''> {
  state: 'success' | 'error' | 'accepted'
  data?: T
  message?: string
}
type PayloadName = {
  [K in keyof OutputType]: OutputType[K] extends { hasPayload: true }
    ? K
    : never
}[keyof OutputType]
type Status<K extends keyof OutputType> = { $status: OutputType[K]['$status'] }
type Parsed<T> = T extends z.ZodType ? z.infer<T> : never

export type OutputDefinition = {
  [K in SuccessOutputKey]?: K extends PayloadName ? z.ZodType : true
}
type SuccessResponse<K extends SuccessOutputKey, Schema> = Status<K> &
  (K extends PayloadName ? { payload: Parsed<Schema> } : { payload?: never })
type FailureResponse<K extends ErrorOutputKey> = Status<K> &
  (K extends PayloadName ? { payload?: string } : {})
type SuccessHelpers<T> = {
  [
    K in keyof T & SuccessOutputKey as OutputType[K]['key']
  ]-?: K extends PayloadName
    ? (payload: Parsed<T[K]>) => SuccessResponse<K, T[K]>
    : () => Status<K>
}
export type ErrorHelpers = {
  [K in ErrorOutputKey as OutputType[K]['key']]: K extends PayloadName
    ? (payload?: string) => FailureResponse<K>
    : () => Status<K>
}
export type ErrorResult = {
  [K in ErrorOutputKey]: FailureResponse<K>
}[ErrorOutputKey]
export type OutputHelpers<T extends OutputDefinition | 'custom'> =
  T extends 'custom' ? Record<never, never> : SuccessHelpers<T> & ErrorHelpers
export type ResponseObject<T extends OutputDefinition | 'custom'> =
  T extends 'custom'
    ? unknown
    : | ErrorResult
      | {
          [K in keyof T & SuccessOutputKey]: SuccessResponse<K, T[K]>
        }[keyof T & SuccessOutputKey]
