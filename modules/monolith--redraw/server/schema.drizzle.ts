import { createModuleTable } from '@monolith/drizzle'
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { workspaces } from '../../monolith--databases/server/workspaceSchema'
import type { Document, Presence } from '../shared'

const table = createModuleTable('redraw')

export const projects = table(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    document: jsonb('document').$type<Document>().notNull(),
    revision: integer('revision').notNull().default(1),
    starred: boolean('starred').notNull().default(false),
    archived: boolean('archived').notNull().default(false),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp('updated', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('redraw_projects_workspace').on(table.workspace_id, table.updated),
    foreignKey({
      name: 'redraw_projects_workspace_owner',
      columns: [table.owner_id, table.workspace_id],
      foreignColumns: [workspaces.owner_id, workspaces.id]
    }).onDelete('cascade')
  ]
)

export const sessions = table(
  'sessions',
  {
    owner_id: uuid('owner_id').notNull(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    actor_id: uuid('actor_id').notNull(),
    session_id: uuid('session_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    role: varchar('role', { length: 16 })
      .$type<'owner' | 'editor' | 'viewer'>()
      .notNull(),
    presence: jsonb('presence').$type<Presence>().notNull(),
    sequence: integer('sequence').notNull().default(0),
    seen: timestamp('seen', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    primaryKey({
      columns: [table.project_id, table.actor_id, table.session_id]
    }),
    index('redraw_sessions_presence').on(table.project_id, table.seen)
  ]
)

export const comments = table(
  'comments',
  {
    id: uuid('id').primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    page_id: uuid('page_id').notNull(),
    element_id: uuid('element_id'),
    parent_id: uuid('parent_id'),
    actor_id: uuid('actor_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    x: doublePrecision('x').notNull(),
    y: doublePrecision('y').notNull(),
    body: text('body').notNull(),
    resolved: boolean('resolved').notNull().default(false),
    created: timestamp('created', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('redraw_comments_project').on(table.project_id, table.created),
    foreignKey({
      columns: [table.parent_id],
      foreignColumns: [table.id],
      name: 'redraw_comment_thread'
    }).onDelete('cascade')
  ]
)
