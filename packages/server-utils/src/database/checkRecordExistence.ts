// SPDX-License-Identifier: 0BSD
import { getTableColumns, inArray } from 'drizzle-orm'
import {
  type PgColumn,
  type PgTable,
  getTableConfig
} from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { z } from 'zod'

import ClientError from '../response/ClientError'
import { type CollectedExistenceCheck, collectExistenceChecks } from './walk'

type Requirement = { column: PgColumn; checks: CollectedExistenceCheck[] }
function plan(checks: CollectedExistenceCheck[]) {
  const tables = new Map<PgTable, Map<PgColumn, Requirement>>()
  for (const check of checks) {
    const table = check.table
    const config = getTableConfig(table)
    const column =
      check.column === undefined
        ? config.columns.find(column => column.primary)
        : getTableColumns(table)[check.column]
    if (!column)
      throw new Error(
        'Cannot validate a reference to ' +
          config.name +
          ': ' +
          (check.column === undefined
            ? 'no primary key'
            : 'unknown column ' + check.column)
      )
    let columns = tables.get(table)
    if (!columns) tables.set(table, (columns = new Map()))
    let requirement = columns.get(column)
    if (!requirement)
      columns.set(column, (requirement = { column, checks: [] }))
    requirement.checks.push(check)
  }
  return tables
}
export async function checkRecordExistence(request: {
  db: PostgresJsDatabase
  querySchema?: z.ZodType
  query?: unknown
  bodySchema?: z.ZodType
  body?: unknown
}): Promise<void> {
  const tables = plan([
    ...collectExistenceChecks(request.querySchema, request.query, 'query'),
    ...collectExistenceChecks(request.bodySchema, request.body, 'body')
  ])
  for (const [table, columns] of tables) {
    for (const { column, checks } of columns.values()) {
      const unresolved = new Set(checks.flatMap(check => check.values))
      const requested = [...unresolved]
      for (let start = 0; start < requested.length; start += 1000) {
        const rows = await request.db
          .select({ reference: column })
          .from(table)
          .where(inArray(column, requested.slice(start, start + 1000)))
        for (const row of rows) unresolved.delete(row.reference)
      }
      if (!unresolved.size) continue
      const paths = [
        ...new Set(
          checks
            .filter(check => check.values.some(value => unresolved.has(value)))
            .map(check => check.path)
        )
      ]
      throw new ClientError(
        'Related "' +
          getTableConfig(table).name +
          '" record not found (' +
          paths.join(', ') +
          ') for ' +
          column.name +
          ': ' +
          [...unresolved].map(String).join(', '),
        404
      )
    }
  }
}
