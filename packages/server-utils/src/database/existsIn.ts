import type { PgTable } from 'drizzle-orm/pg-core'
import type { z } from 'zod'

export const EXISTS_IN = Symbol.for('monolith.existsIn')
export interface ExistenceCheck {
  table: PgTable
  column?: string
}
export type ExistsInFor<Tables extends Record<string, PgTable>> = <
  S extends z.ZodTypeAny,
  T extends Tables[keyof Tables]
>(
  schema: S,
  table: T,
  column?: keyof T['_']['columns']
) => S

/** Reference annotations stay out of JSON schema and survive shared module imports. */
export function existsIn<S extends z.ZodTypeAny, T extends PgTable>(
  schema: S,
  table: T,
  column?: keyof T['_']['columns']
): S {
  Object.defineProperty(schema, EXISTS_IN, {
    value: Object.freeze({ table, column }),
    enumerable: false,
    configurable: true
  })
  return schema
}
