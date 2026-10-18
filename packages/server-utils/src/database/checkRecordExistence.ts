import { getTableColumns, inArray } from 'drizzle-orm'
import {
  type PgColumn,
  type PgTable,
  getTableConfig
} from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { z } from 'zod'

import ClientError from '../response/ClientError'
import { collectExistenceChecks } from './walk'

type Batch = {
  table: PgTable
  column: PgColumn
  references: Map<unknown, Set<string>>
}

export async function checkRecordExistence(input: {
  db: PostgresJsDatabase
  querySchema?: z.ZodTypeAny
  query?: unknown
  bodySchema?: z.ZodTypeAny
  body?: unknown
}): Promise<void> {
  const batches = new Map<PgColumn, Batch>()
  for (const reference of [
    ...collectExistenceChecks(input.querySchema, input.query, 'query'),
    ...collectExistenceChecks(input.bodySchema, input.body, 'body')
  ]) {
    const table = reference.table
    const config = getTableConfig(table)
    const column =
      reference.column === undefined
        ? config.columns.find(item => item.primary)
        : getTableColumns(table)[reference.column]
    if (!column)
      throw new Error(
        reference.column === undefined
          ? 'Table "' +
              config.name +
              '" has no primary key to check existence against.'
          : 'Unknown column "' +
              reference.column +
              '" on table "' +
              config.name +
              '" referenced by existsIn.'
      )
    let batch = batches.get(column)
    if (!batch) {
      batch = { table, column, references: new Map() }
      batches.set(column, batch)
    }
    for (const value of reference.values) {
      if (!batch.references.has(value)) batch.references.set(value, new Set())
      batch.references.get(value)!.add(reference.path)
    }
  }

  for (const { table, column, references } of batches.values()) {
    const values = [...references.keys()]
    if (!values.length) continue
    const found = new Set<unknown>()
    // Bounded batches avoid PostgreSQL's parameter limit for large list inputs.
    for (let offset = 0; offset < values.length; offset += 1000) {
      const rows = await input.db
        .select({ value: column })
        .from(table)
        .where(inArray(column, values.slice(offset, offset + 1000)))
      for (const row of rows) found.add(row.value)
    }
    const missing = values.filter(value => !found.has(value))
    if (missing.length) {
      const fields = new Set(
        missing.flatMap(value => [...references.get(value)!])
      )
      throw new ClientError(
        'Related "' +
          getTableConfig(table).name +
          '" record not found (' +
          [...fields].join(', ') +
          ') for ' +
          column.name +
          ': ' +
          missing.map(String).join(', '),
        404
      )
    }
  }
}
