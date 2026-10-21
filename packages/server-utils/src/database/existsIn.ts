// SPDX-License-Identifier: 0BSD
import type { PgTable } from 'drizzle-orm/pg-core'
import type { z } from 'zod'

// Symbol.for keeps annotations visible across separately loaded add-on bundles.
export const EXISTS_IN = Symbol.for('monolith.existsIn')
export type ExistenceCheck = { table: PgTable; column?: string }
type Annotate<Tables extends PgTable> = <S extends z.ZodType, T extends Tables>(
  value: S,
  table: T,
  column?: keyof T['_']['columns']
) => S
export type ExistsInFor<T extends Record<string, PgTable>> = Annotate<
  T[keyof T]
>
export const existsIn: Annotate<PgTable> = (schema, table, column) => {
  const metadata = Object.freeze({ table, column })
  Object.defineProperties(schema, {
    [EXISTS_IN]: { value: metadata, configurable: true, enumerable: false }
  })
  return schema
}
