import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import type { AnyPgColumn, PgTableExtraConfigValue } from 'drizzle-orm/pg-core'

import type { CanvasPage } from '@monolith/blocks'
import { createModuleTable } from '@monolith/drizzle'

import type { WorkspaceNavigation } from '../navigationShared'
import type {
  WorkspaceMemberRole,
  WorkspaceModule,
  WorkspaceProfile
} from '../workspaceShared'

const table = createModuleTable('zillion_databases')

export const workspaces = table(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    icon: varchar('icon', { length: 80 }).notNull().default('lucide:layers'),
    profile: varchar('profile', { length: 20 })
      .$type<WorkspaceProfile>()
      .notNull()
      .default('personal'),
    enabled_modules: jsonb('enabled_modules')
      .$type<WorkspaceModule[]>()
      .notNull()
      .default([]),
    description: text('description').notNull().default(''),
    is_default: boolean('is_default').notNull().default(false),
    native_imported: boolean('native_imported').notNull().default(false),
    navigation: jsonb('navigation')
      .$type<WorkspaceNavigation>()
      .notNull()
      .default({ revision: 0, groups: [], items: [] }),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updated: timestamp('updated', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    uniqueIndex('monolith_workspaces_owner_identity').on(t.owner_id, t.id),
    uniqueIndex('monolith_workspaces_default')
      .on(t.owner_id)
      .where(sql`${t.is_default}`),
    check(
      'monolith_workspace_profile',
      sql`${t.profile} in ('personal','collaborative','agents')`
    )
  ]
)

export const workspaceMembers = table(
  'workspace_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    user_id: uuid('user_id').notNull(),
    role: varchar('role', { length: 20 })
      .$type<WorkspaceMemberRole>()
      .notNull()
      .default('viewer'),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    foreignKey({
      name: 'monolith_workspace_member_owner',
      columns: [t.owner_id, t.workspace_id],
      foreignColumns: [workspaces.owner_id, workspaces.id]
    }).onDelete('cascade'),
    uniqueIndex('monolith_workspace_member_unique').on(
      t.workspace_id,
      t.user_id
    ),
    index('monolith_workspace_member_user').on(t.user_id, t.workspace_id),
    check(
      'monolith_workspace_member_role',
      sql`${t.role} in ('editor','viewer')`
    )
  ]
)

export const workspacePages = table(
  'workspace_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    parent_id: uuid('parent_id').references(
      (): AnyPgColumn => workspacePages.id,
      { onDelete: 'set null' }
    ),
    route_key: varchar('route_key', { length: 200 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 80 }).notNull().default('lucide:file-text'),
    body: jsonb('body').$type<CanvasPage>().notNull(),
    position: integer('position').notNull().default(0),
    revision: integer('revision').notNull().default(1),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updated: timestamp('updated', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('monolith_workspace_page_identity').on(t.workspace_id, t.id),
    foreignKey({
      name: 'monolith_workspace_page_parent_scope',
      columns: [t.workspace_id, t.parent_id],
      foreignColumns: [workspacePages.workspace_id, workspacePages.id]
    }),
    uniqueIndex('monolith_workspace_page_route').on(
      t.workspace_id,
      t.route_key
    ),
    index('monolith_workspace_page_tree').on(
      t.workspace_id,
      t.parent_id,
      t.position
    ),
    check(
      'monolith_workspace_page_parent',
      sql`${t.parent_id} is null or ${t.parent_id} <> ${t.id}`
    ),
    check('monolith_workspace_page_revision', sql`${t.revision} > 0`)
  ]
)
