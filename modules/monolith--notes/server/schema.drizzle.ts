import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  check,
  index,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable('notes')

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('notes__workspaces_owner_idx').on(table.owner_id)]
)

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    workspace_id: uuid('workspace_id')
      .references(() => workspaces.id, { onDelete: 'cascade' })
      .notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('notes__subjects_owner_idx').on(table.owner_id)]
)

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    content: text('content').notNull(),
    file: varchar('file', { length: 2048 }),
    subject_id: uuid('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    parent_id: uuid('parent_id').references((): AnyPgColumn => entries.id, {
      onDelete: 'cascade'
    }),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [
    index('notes__entries_owner_idx').on(table.owner_id),
    check(
      'notes__entries_type_check',
      sql`${table.type} in ('note', 'folder', 'file')`
    ),
    check('notes__entries_parent_check', sql`${table.id} <> ${table.parent_id}`)
  ]
)

export const tables = { workspaces, subjects, entries }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
