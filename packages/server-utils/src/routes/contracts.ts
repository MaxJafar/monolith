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

export interface EndpointOptions<T extends ModuleSchema = ModuleSchema> {
  schema?: T
  moduleId?: string
  modulePathAlias?: string
}

type Schema = z.ZodTypeAny | undefined
type Definition<
  O extends OutputDefinition | 'custom',
  Q extends Schema,
  B extends Schema,
  M extends MediaConfig | null
> = {
  description: string
  output: O
  input?: { query?: Q; body?: B }
  media?: M
  noAuth?: boolean
  encrypted?: boolean
  isDownloadable?: boolean
  rateLimit?: boolean
  middlewares?: RequestHandler[]
}

class ContractFactory<
  R extends AnyRelations,
  T extends Record<string, PgTable>
> {
  readonly existsIn = existsIn as ExistsInFor<T>

  constructor(private readonly options: EndpointOptions) {}

  query<
    const O extends OutputDefinition | 'custom',
    Q extends Schema = undefined,
    M extends MediaConfig | null = null
  >(definition: Definition<O, Q, never, M>) {
    return this.prepare('get', definition)
  }

  mutation<
    const O extends OutputDefinition | 'custom',
    Q extends Schema = undefined,
    B extends Schema = undefined,
    M extends MediaConfig | null = null
  >(definition: Definition<O, Q, B, M>) {
    return this.prepare('post', definition)
  }

  private prepare<
    O extends OutputDefinition | 'custom',
    Q extends Schema,
    B extends Schema,
    M extends MediaConfig | null
  >(method: 'get' | 'post', definition: Definition<O, Q, B, M>) {
    const metadata = {
      method,
      description: definition.description,
      schema: { query: definition.input?.query, body: definition.input?.body },
      output: definition.output,
      noAuth: definition.noAuth === true,
      encrypted: definition.encrypted !== false,
      rateLimit: definition.rateLimit !== false,
      media: definition.media ?? null,
      isDownloadable: definition.isDownloadable === true,
      noDefaultResponse: false,
      middlewares: [...(definition.middlewares ?? [])]
    }
    const options = this.options
    return {
      callback(
        handler: (
          context: EndpointContext<Q, B, O, M, R>
        ) => Promise<ResponseObject<O>>
      ): EndpointContract {
        const loading = getLoadingModuleId()
        const callerModule = loading
          ? { source: 'app', id: loading }
          : options.moduleId
            ? { source: 'core', id: options.moduleId }
            : undefined
        const response = createOutputHelpers(definition.output)
        const callback = async (context: RequestContext<R>) =>
          handler({ ...context, response } as EndpointContext<
            Q,
            B,
            O,
            M,
            R
          >) as Promise<{ $status: number; payload?: unknown }>
        return {
          __isEndpointContract: true,
          modulePathAlias: options.modulePathAlias,
          getValue: () => ({
            ...metadata,
            middlewares: [...metadata.middlewares],
            schema: { ...metadata.schema },
            callerModule,
            callback
          })
        }
      }
    }
  }
}

export function defineEndpoints<
  R extends AnyRelations = any,
  O extends EndpointOptions = EndpointOptions
>(options?: O) {
  const selected: EndpointOptions = options ?? {}
  if (selected.schema) {
    const owner = getLoadingModuleId()
    const schema = defineModuleSchema(
      selected.schema.tables,
      selected.schema.relations as any,
      owner
    )
    if (owner) ModuleRegistry.registerSchemaPart(owner, schema)
  }
  return new ContractFactory<
    O['schema'] extends ModuleSchema ? BuiltModuleSchema<O['schema']> : R,
    O['schema'] extends { tables: infer T extends Record<string, PgTable> }
      ? T
      : Record<string, PgTable>
  >(selected)
}

export default defineEndpoints
