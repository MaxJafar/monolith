import {
  boolean,
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

import { createModuleTable } from '@monolith/drizzle'

import { workspaces } from '../../monolith--databases/server/workspaceSchema'
import type { Graph, RunResult } from '../shared'

const table = createModuleTable('automations')
export const workflows = table(
  'workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    graph: jsonb('graph').$type<Graph>().notNull(),
    enabled: boolean('enabled').notNull().default(false),
    revision: integer('revision').notNull().default(1),
    interval_minutes: integer('interval_minutes').notNull().default(0),
    next_run: timestamp('next_run', { withTimezone: true }),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp('updated', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    uniqueIndex('automations_flow_identity').on(
      t.owner_id,
      t.workspace_id,
      t.id
    ),
    index('automations_workspace').on(t.workspace_id, t.updated),
    foreignKey({
      columns: [t.owner_id, t.workspace_id],
      foreignColumns: [workspaces.owner_id, workspaces.id],
      name: 'automations_workspace_owner'
    }).onDelete('cascade')
  ]
)
export const runs = table(
  'runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    workflow_id: uuid('workflow_id')
      .notNull()
      .references(() => workflows.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    trigger: varchar('trigger', { length: 16 })
      .$type<'manual' | 'schedule' | 'event'>()
      .notNull(),
    result: jsonb('result').$type<RunResult>().notNull(),
    started: timestamp('started', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    index('automations_run_history').on(
      t.workspace_id,
      t.workflow_id,
      t.started
    ),
    foreignKey({
      columns: [t.owner_id, t.workspace_id, t.workflow_id],
      foreignColumns: [
        workflows.owner_id,
        workflows.workspace_id,
        workflows.id
      ],
      name: 'automations_run_scope'
    }).onDelete('cascade')
  ]
)

const actor = "nullif(current_setting('zillion.user_id',true),'')::uuid"
export const databaseMigrations = [
  'automations__workflows',
  'automations__runs'
].map(name => {
  const read = `exists(select 1 from zillion_databases__workspaces w where w.id=${name}.workspace_id and w.owner_id=${name}.owner_id)`
  const write = `exists(select 1 from zillion_databases__workspaces w where w.id=${name}.workspace_id and w.owner_id=${name}.owner_id and (w.owner_id=${actor} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=w.id and m.user_id=${actor} and m.role='editor')))`
  return `alter table ${name} enable row level security; alter table ${name} force row level security;
    drop policy if exists zillion_owner on ${name};
    drop policy if exists automation_read on ${name}; drop policy if exists automation_write on ${name};
    create policy automation_read on ${name} for select using(${read});
    create policy automation_write on ${name} for all using(${write}) with check(${write});`
})
