import type { RelationsBuilder } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'

export const searchDocuments = pgTable(
  'search__documents',
  {
    owner_id: uuid('owner_id').notNull(),
    source_id: text('source_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    model: text('model').notNull(),
    content: text('content').notNull(),
    inferred: boolean('inferred').notNull().default(false),
    warning: text('warning').notNull().default(''),
    chunk_count: integer('chunk_count').notNull(),
    updated: timestamp('updated', { withTimezone: true }).defaultNow().notNull()
  },
  t => [primaryKey({ columns: [t.owner_id, t.source_id] })]
)

export const searchChunks = pgTable(
  'search__chunks',
  {
    owner_id: uuid('owner_id').notNull(),
    source_id: text('source_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    fingerprint: text('fingerprint').notNull(),
    model: text('model').notNull(),
    vector: jsonb('vector').$type<number[]>().notNull()
  },
  t => [primaryKey({ columns: [t.owner_id, t.source_id, t.ordinal] })]
)

export const tables = { searchDocuments, searchChunks }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})

export const databaseMigrations = ['search__documents', 'search__chunks'].map(
  table => `
  alter table ${table} enable row level security;
  alter table ${table} force row level security;
  do $$ begin
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='${table}' and policyname='zillion_owner') then
      create policy zillion_owner on ${table} using(owner_id=nullif(current_setting('zillion.user_id',true),'')::uuid) with check(owner_id=nullif(current_setting('zillion.user_id',true),'')::uuid);
    end if;
  end $$;
`
)
