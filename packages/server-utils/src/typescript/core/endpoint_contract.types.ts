// SPDX-License-Identifier: 0BSD
import type { AnyRelations } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Request, RequestHandler, Response } from 'express'
import type { Server } from 'socket.io'
import type { z } from 'zod'

import type { OutputDefinition, OutputHelpers } from '../../response'
import type { ConvertMedia, MediaConfig } from '../standalone/media.types'
import type { CoreContext } from './core_context.types'

type Schema = z.ZodType | undefined
type Parsed<S> = S extends z.ZodType ? z.infer<S> : undefined
export interface RequestContext<R extends AnyRelations = any> {
  req: Request
  res: Response
  io: Server
  db: PostgresJsDatabase<R>
  core: CoreContext
  body: unknown
  query: unknown
  media: unknown
}
export type EndpointContext<
  Q extends Schema,
  B extends Schema,
  O extends OutputDefinition | 'custom',
  M extends MediaConfig | null,
  R extends AnyRelations = any
> = Omit<RequestContext<R>, 'query' | 'body' | 'media'> & {
  query: Parsed<Q>
  body: Parsed<B>
  media: ConvertMedia<M>
  response: OutputHelpers<O>
}
type EndpointMetadata = {
  method: 'get' | 'post'
  description: string
  schema: { query: Schema; body: Schema }
  output: OutputDefinition | 'custom'
  middlewares: RequestHandler[]
  media: MediaConfig | null
  callerModule?: { source: string; id: string }
  noDefaultResponse: boolean
  noAuth: boolean
  encrypted: boolean
  rateLimit: boolean
  isDownloadable: boolean
  callback(
    context: RequestContext
  ): Promise<{ $status: number; payload?: unknown }>
}
export interface EndpointContract {
  readonly __isEndpointContract: true
  readonly modulePathAlias?: string
  getValue(): EndpointMetadata
}
