import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import postgres from 'postgres'

export interface PushResult {
  applied: number
  failures: string[]
}

type Sql = ReturnType<typeof postgres>

interface NodePgAdapter {
  execute(query: unknown): Promise<{ rows: unknown[] }>
}

/**
 * Adapts a postgres-js client to the node-postgres shape that drizzle-kit's
 * programmatic `pushSchema` expects (`execute(sql)` -> `{ rows }`).
 */
async function createAdapter(sql: Sql): Promise<NodePgAdapter> {
  const { PgDialect } = await import('drizzle-orm/pg-core')

  const dialect = new PgDialect()

  return {
    execute: async (query: unknown) => {
      const { sql: text } = dialect.sqlToQuery(query as never)

      return { rows: (await sql.unsafe(text)) as unknown[] }
    }
  }
}

/** Extracts the SQL table names exported by a schema module. */
async function getTableNames(
  imports: Record<string, unknown>
): Promise<string[]> {
  const { getTableName } = await import('drizzle-orm')

  const names = new Set<string>()

  for (const value of Object.values(imports)) {
    if (value === null || typeof value !== 'object') continue

    try {
      const name = getTableName(value as never) as string | undefined

      if (typeof name === 'string' && name.length > 0) {
        names.add(name)
      }
    } catch {
      // Not a drizzle table (e.g. the `relations` helper).
    }
  }

  return [...names]
}

/**
 * Applies the given schema files to the database using drizzle-kit's diff
 * engine, scoped to each file's own tables.
 *
 * Destructive statements are never applied, so objects that aren't part of the
 * provided schemas (e.g. tables/enums from modules that are no longer
 * installed) are left untouched — the database is only ever extended.
 */
export async function pushSchemaFiles(files: string[]): Promise<PushResult> {
  const databaseUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const { pushSchema } = await import('drizzle-kit/api-postgres')

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} })

  let applied = 0

  const failures: string[] = []

  try {
    await sql`select 1`

    const adapter = await createAdapter(sql)

    const allImports: Record<string, unknown> = {}

    for (const [index, file] of files.entries()) {
      if (!fs.existsSync(file)) throw new Error(`Schema file missing: ${file}`)

      const imports = (await import(pathToFileURL(file).href)) as Record<
        string,
        unknown
      >

      for (const [key, value] of Object.entries(imports)) {
        allImports[`${index}_${key}`] = value
      }
    }

    const tables = await getTableNames(allImports)
    const { sqlStatements, hints } = await pushSchema(
      allImports,
      adapter as never,
      { tables } as never
    )

    if (hints.some(hint => hint.statement)) {
      throw new Error(
        'Schema change requires a reviewed data migration; destructive hints were not applied.'
      )
    }

    const additive = sqlStatements.filter(
      statement =>
        !/\b(DROP|TRUNCATE)\b/i.test(statement) &&
        !/^\s*ALTER\s+TABLE\b[\s\S]*\bADD\s+CONSTRAINT\b[\s\S]*\bCHECK\s*\(/i.test(
          statement
        )
    )
    await sql.begin(async transaction => {
      for (const statement of additive) {
        await transaction.unsafe(statement)
        applied++
      }

      // drizzle-kit's additive diff can miss changed expressions under an existing CHECK name.
      // Ask PostgreSQL to canonicalize the new expression, then replace only changed checks.
      // Validation and replacement share this transaction; invalid existing rows roll everything back.
      const { is } = await import('drizzle-orm')
      const { PgTable, PgDialect, getTableConfig } =
        await import('drizzle-orm/pg-core')
      const dialect = new PgDialect()
      const checked = new Set<string>()
      const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'

      for (const value of Object.values(allImports)) {
        if (!is(value, PgTable)) continue

        const config = getTableConfig(value)

        for (const check of config.checks) {
          const key = config.name + ':' + check.name

          if (checked.has(key)) continue
          checked.add(key)
          const [existing] =
            await transaction`select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = ${config.name}::regclass and conname = ${check.name} and contype = 'c'`
          const temporary =
            'zillion_check_' +
            createHash('sha256').update(key).digest('hex').slice(0, 24)
          const expression = dialect.sqlToQuery(check.value.inlineParams()).sql
          await transaction.unsafe(
            `alter table ${quote(config.name)} add constraint ${quote(temporary)} check (${expression})`
          )
          const [expected] =
            await transaction`select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = ${config.name}::regclass and conname = ${temporary}`

          if (existing?.definition === expected?.definition)
            await transaction.unsafe(
              `alter table ${quote(config.name)} drop constraint ${quote(temporary)}`
            )
          else {
            if (existing)
              await transaction.unsafe(
                `alter table ${quote(config.name)} drop constraint ${quote(check.name)}`
              )
            await transaction.unsafe(
              `alter table ${quote(config.name)} rename constraint ${quote(temporary)} to ${quote(check.name)}`
            )
            applied++
          }
        }
      }

      // Shared row isolation also protects legacy modules' raw SQL/aggregates.
      // Existing rows require an explicitly reviewed owner mapping before migration.
      for (const name of tables.filter(
        name =>
          (name.includes('__') && !name.startsWith('auth__')) ||
          name === 'files'
      )) {
        const identifier = '"' + name.replaceAll('"', '""') + '"'
        await transaction.unsafe(
          `alter table ${identifier} add column if not exists owner_id uuid`
        )
        const [{ count } = { count: 0 }] = await transaction.unsafe(
          `select count(*)::int as count from ${identifier} where owner_id is null`
        )

        if (Number(count) > 0)
          throw new Error(
            `Owner mapping required for ${name}. No owner was inferred and the schema transaction was rolled back.`
          )
        await transaction.unsafe(
          `alter table ${identifier} alter column owner_id set not null`
        )
        await transaction.unsafe(
          `alter table ${identifier} alter column owner_id set default nullif(current_setting('zillion.user_id', true), '')::uuid`
        )
        await transaction.unsafe(
          `alter table ${identifier} enable row level security`
        )
        await transaction.unsafe(
          `alter table ${identifier} force row level security`
        )
        const policies =
          await transaction`select 1 from pg_policies where schemaname = 'public' and tablename = ${name} and policyname = 'zillion_owner'`

        if (!policies.length)
          await transaction.unsafe(
            `create policy zillion_owner on ${identifier} using (owner_id = nullif(current_setting('zillion.user_id', true), '')::uuid) with check (owner_id = nullif(current_setting('zillion.user_id', true), '')::uuid)`
          )
      }

      if (tables.includes('achievements__categories')) {
        // Replace the old global category-name constraint with an owner constraint.
        await transaction.unsafe(
          'alter table achievements__categories drop constraint if exists achievements__categories_name_unique'
        )
        await transaction.unsafe(
          'alter table achievements__categories drop constraint if exists achievements__categories_name_key'
        )
        await transaction.unsafe(
          'create unique index if not exists achievements_categories_owner_name on achievements__categories (owner_id, name)'
        )
      }

      if (
        tables.includes('zillion_agents__usage_records') &&
        tables.includes('zillion_agents__runs')
      ) {
        // Capture pre-ledger costs before native task deletion can cascade old runs.
        // Missing counters remain NULL. Existing records are never overwritten.
        await transaction.unsafe(`insert into zillion_agents__usage_records
          (id, owner_id, original_run_id, run_id, principal_id, task_title, adapter, status, cost_cents, charged_at, created, updated)
          select id, owner_id, id, id, principal_id, task_snapshot->>'title', adapter, status, cost_cents,
            coalesce(settled_at, created), created, coalesce(settled_at, created)
          from zillion_agents__runs
          on conflict (owner_id, original_run_id) do nothing`)
      }

      for (const [key, statements] of Object.entries(allImports)) {
        if (!key.endsWith('_databaseMigrations') || !Array.isArray(statements)) continue
        for (const statement of statements) {
          if (typeof statement !== 'string') throw new Error('Invalid module migration')
          await transaction.unsafe(statement)
          applied++
        }
      }
    })
  } finally {
    await sql.end()
  }

  return { applied, failures }
}
