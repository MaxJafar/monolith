// SPDX-License-Identifier: 0BSD
import type { AnyRelations } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { RequestHandler } from 'express'
import type { z } from 'zod'

import { defineModuleSchema } from '@monolith/drizzle'
import {
  type BuiltModuleSchema,
  ModuleRegistry,
  type ModuleSchema,
  getLoadingModuleId
} from '@monolith/module-runtime/registry'

import { type ExistsInFor, existsIn } from '../database'
import {
  type OutputDefinition,
  type ResponseObject,
  createOutputHelpers
} from '../response'
import type {
  EndpointContext,
  EndpointContract,
  RequestContext
} from '../typescript/core/endpoint_contract.types'
import type { MediaConfig } from '../typescript/standalone/media.types'

export interface EndpointOptions<S extends ModuleSchema = ModuleSchema> {
  schema?: S
  /** Only this addon publishes these tables; consumers retain query aliases. */
  schemaOwnerId?: string
  moduleId?: string
  modulePathAlias?: string
}
type Schema = z.ZodType | undefined
type Options<
  O extends OutputDefinition | 'custom',
  Q extends Schema,
  B extends Schema,
  M extends MediaConfig | null
> = {
  output: O
  description: string
  input?: { query?: Q; body?: B }
  media?: M
  middlewares?: RequestHandler[]
  noAuth?: boolean
  encrypted?: boolean
  isDownloadable?: boolean
  rateLimit?: boolean
}
function factory<
  R extends AnyRelations,
  Tables extends Record<string, PgTable>
>(settings: EndpointOptions) {
  function endpoint<
    O extends OutputDefinition | 'custom',
    Q extends Schema,
    B extends Schema,
    M extends MediaConfig | null
  >(method: 'get' | 'post', options: Options<O, Q, B, M>) {
    const response = createOutputHelpers(options.output)
    const schema = { query: options.input?.query, body: options.input?.body }
    const middlewares = [...(options.middlewares ?? [])]
    return {
      callback(
        handler: (
          context: EndpointContext<Q, B, O, M, R>
        ) => Promise<ResponseObject<O>>
      ): EndpointContract {
        const module = getLoadingModuleId()
        const callerModule = module
          ? { source: 'app', id: module }
          : settings.moduleId
            ? { source: 'core', id: settings.moduleId }
            : undefined
        const metadata = {
          method,
          description: options.description,
          output: options.output,
          media: options.media ?? null,
          encrypted: options.encrypted ?? true,
          rateLimit: options.rateLimit ?? true,
          isDownloadable: options.isDownloadable ?? false,
          noAuth: options.noAuth ?? false,
          noDefaultResponse: false,
          callerModule,
          callback: async (context: RequestContext<R>) =>
            handler({ ...context, response } as EndpointContext<
              Q,
              B,
              O,
              M,
              R
            >) as Promise<{ $status: number; payload?: unknown }>
        }
        return {
          __isEndpointContract: true,
          modulePathAlias: settings.modulePathAlias,
          getValue: () => ({
            ...metadata,
            schema: { ...schema },
            middlewares: [...middlewares]
          })
        }
      }
    }
  }
  return {
    existsIn: existsIn as ExistsInFor<Tables>,
    query<
      const O extends OutputDefinition | 'custom',
      Q extends Schema = undefined,
      M extends MediaConfig | null = null
    >(options: Options<O, Q, never, M>) {
      return endpoint('get', options)
    },
    mutation<
      const O extends OutputDefinition | 'custom',
      Q extends Schema = undefined,
      B extends Schema = undefined,
      M extends MediaConfig | null = null
    >(options: Options<O, Q, B, M>) {
      return endpoint('post', options)
    }
  }
}
export function defineEndpoints<
  R extends AnyRelations = any,
  O extends EndpointOptions = EndpointOptions
>(options?: O) {
  const settings: EndpointOptions = options ?? {}
  if (settings.schema) {
    const owner = getLoadingModuleId()
    const schema = defineModuleSchema(
      settings.schema.tables,
      settings.schema.relations as any,
      owner
    )
    if (owner) {
      ModuleRegistry.registerSchemaPart(
        owner,
        settings.schemaOwnerId && settings.schemaOwnerId !== owner
          ? { ...schema, tables: {}, relations: () => ({}) }
          : schema
      )
    }
  }
  return factory<
    O['schema'] extends ModuleSchema ? BuiltModuleSchema<O['schema']> : R,
    O['schema'] extends { tables: infer T extends Record<string, PgTable> }
      ? T
      : Record<string, PgTable>
  >(settings)
}
export default defineEndpoints
