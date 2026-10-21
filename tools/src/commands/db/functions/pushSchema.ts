// SPDX-License-Identifier: 0BSD
import { is } from 'drizzle-orm'
import { PgDialect, PgTable, getTableConfig } from 'drizzle-orm/pg-core'
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import postgres from 'postgres'

export interface PushResult {
  applied: number
  failures: string[]
}
type Connection = ReturnType<typeof postgres>
type Transaction = postgres.TransactionSql
const identifier = (value: string) => '"' + value.replaceAll('"', '""') + '"'

export function schemaStatements(statements: string[]): string[] {
  return statements.filter(statement => {
    // Constraint expressions are reconciled separately against PostgreSQL's canonical form.
    if (
      /^\s*ALTER\s+TABLE[\s\S]*\bADD\s+CONSTRAINT[\s\S]*\bCHECK\s*\(/i.test(
        statement
      )
    )
      return false
    if (/\b(?:DROP|TRUNCATE|DELETE)\b/i.test(statement)) return false
    return true
  })
}

async function readDefinitions(paths: string[]) {
  const definitions: Record<string, unknown> = {}
  const migrations: string[] = []
  let index = 0
  for (const file of new Set(paths.map(value => realpathSync(value)))) {
    const exports = await import(pathToFileURL(file).href)
    for (const [name, value] of Object.entries(exports)) {
      if (name === 'databaseMigrations') {
        if (!Array.isArray(value) || value.some(sql => typeof sql !== 'string'))
          throw Error('Invalid databaseMigrations in ' + file)
        migrations.push(...value)
      } else definitions['definition_' + index++] = value
    }
  }
  const tables = [
    ...new Set(
      Object.values(definitions).filter((value): value is PgTable =>
        is(value, PgTable)
      )
    )
  ]
  return { definitions, migrations, tables }
}

async function reconcileChecks(
  transaction: Transaction,
  table: PgTable
): Promise<number> {
  const config = getTableConfig(table)
  const tableName =
    identifier(config.schema ?? 'public') + '.' + identifier(config.name)
  let count = 0
  for (const check of config.checks) {
    const provisional =
      'monolith_check_' +
      createHash('sha256')
        .update(tableName + check.name)
        .digest('hex')
        .slice(0, 24)
    const expression = new PgDialect().sqlToQuery(
      check.value.inlineParams()
    ).sql
    await transaction.unsafe(
      'alter table ' +
        tableName +
        ' add constraint ' +
        identifier(provisional) +
        ' check (' +
        expression +
        ')'
    )
    const constraints = await transaction.unsafe(
      'select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = $1::regclass and contype = $2 and conname = any($3::text[])',
      [tableName, 'c', [provisional, check.name]]
    )
    const current = constraints.find(row => row.conname === check.name)
    const expected = constraints.find(row => row.conname === provisional)
    if (!expected) throw Error('Could not verify constraint ' + check.name)
    if (current?.definition === expected.definition) {
      await transaction.unsafe(
        'alter table ' +
          tableName +
          ' drop constraint ' +
          identifier(provisional)
      )
      continue
    }
    if (current)
      await transaction.unsafe(
        'alter table ' +
          tableName +
          ' drop constraint ' +
          identifier(check.name)
      )
    await transaction.unsafe(
      'alter table ' +
        tableName +
        ' rename constraint ' +
        identifier(provisional) +
        ' to ' +
        identifier(check.name)
    )
    count++
  }
  return count
}

async function enforceOwnership(transaction: Transaction, table: PgTable) {
  const config = getTableConfig(table)
  if (!(
    config.name === 'files' ||
    (config.name.includes('__') && !config.name.startsWith('auth__'))
  ))
    return
  const schema = config.schema ?? 'public'
  const name = identifier(schema) + '.' + identifier(config.name)
  await transaction.unsafe(
    'alter table ' + name + ' add column if not exists owner_id uuid'
  )
  const missing = await transaction.unsafe(
    'select 1 from ' + name + ' where owner_id is null limit 1'
  )
  if (missing.length)
    throw Error(
      'Owner mapping required for ' +
        config.name +
        '; schema changes have been rolled back.'
    )
  // The setting and policy names form part of the existing connection protocol.
  const owner = "nullif(current_setting('zillion.user_id', true), '')::uuid"
  for (const action of [
    'alter column owner_id set not null',
    'alter column owner_id set default ' + owner,
    'enable row level security',
    'force row level security'
  ]) {
    await transaction.unsafe('alter table ' + name + ' ' + action)
  }
  const policies = await transaction.unsafe(
    'select 1 from pg_policies where schemaname = $1 and tablename = $2 and policyname = $3',
    [schema, config.name, 'zillion_owner']
  )
  if (!policies.length)
    await transaction.unsafe(
      'create policy zillion_owner on ' +
        name +
        ' using (owner_id = ' +
        owner +
        ') with check (owner_id = ' +
        owner +
        ')'
    )
}

export async function pushSchemaFiles(files: string[]): Promise<PushResult> {
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL
  if (!url)
    throw Error('Set DATABASE_ADMIN_URL or DATABASE_URL before migrating')
  const { definitions, migrations, tables } = await readDefinitions(files)
  if (!tables.length) return { applied: 0, failures: [] }
  const connection = postgres(url, { max: 1, onnotice: () => {} })
  try {
    const { pushSchema } = await import('drizzle-kit/api-postgres')
    const dialect = new PgDialect()
    const adapter = {
      execute: async (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
        const prepared = dialect.sqlToQuery(query)
        return {
          rows: await connection.unsafe(
            prepared.sql,
            prepared.params as postgres.ParameterOrJSON<never>[]
          )
        }
      }
    }
    const names = tables.map(table => getTableConfig(table).name)
    const plan = await pushSchema(
      definitions,
      adapter as never,
      { tables: names } as never
    )
    if (plan.hints.some(hint => hint.statement))
      throw Error(
        'This change requires an explicit data migration; no schema changes were applied.'
      )
    const applied = await connection.begin(async transaction => {
      let changes = 0
      for (const statement of schemaStatements(plan.sqlStatements)) {
        await transaction.unsafe(statement)
        changes++
      }
      for (const table of tables) {
        changes += await reconcileChecks(transaction, table)
        await enforceOwnership(transaction, table)
      }
      if (
        names.includes('zillion_agents__runs') &&
        names.includes('zillion_agents__usage_records')
      ) {
        await transaction.unsafe(`insert into zillion_agents__usage_records
          (id, owner_id, original_run_id, run_id, principal_id, task_title, adapter, status, cost_cents, charged_at, created, updated)
          select id, owner_id, id, id, principal_id, task_snapshot->>'title', adapter, status, cost_cents,
            coalesce(settled_at, created), created, coalesce(settled_at, created)
          from zillion_agents__runs on conflict (owner_id, original_run_id) do nothing`)
      }
      for (const migration of migrations) {
        await transaction.unsafe(migration)
        changes++
      }
      return changes
    })
    return { applied, failures: [] }
  } finally {
    await connection.end()
  }
}
