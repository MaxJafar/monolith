import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
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

import { entries as notes } from '../../monolith--notes/server/schema.drizzle'
import {
  tasks as projectTasks,
  entries as projects
} from '../../monolith--projects/server/schema.drizzle'
import {
  documents,
  records
} from '../../monolith--databases/server/schema.drizzle'
import type {
  PlaybookSnapshot,
  Principal,
  QualityEvidence,
  Run,
  WorkItem
} from '../shared'

const table = createModuleTable('zillion_agents')
const date = (name: string) =>
  timestamp(name, { mode: 'date', withTimezone: true })

export const principals = table(
  'principals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    kind: varchar('kind', { length: 10 }).$type<Principal['kind']>().notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    role: varchar('role', { length: 20 })
      .$type<Principal['role']>()
      .notNull()
      .default('contributor'),
    status: varchar('status', { length: 20 })
      .$type<Principal['status']>()
      .notNull()
      .default('active'),
    reports_to: uuid('reports_to').references(
      (): AnyPgColumn => principals.id,
      { onDelete: 'restrict' }
    ),
    adapter: varchar('adapter', { length: 20 })
      .$type<Principal['adapter']>()
      .notNull()
      .default('external'),
    instructions: text('instructions').notNull().default(''),
    budget_cents: integer('budget_cents').notNull().default(0),
    revision: integer('revision').notNull().default(1),
    created: date('created').defaultNow().notNull()
  },
  t => [
    index('zillion_principals_owner').on(t.owner_id),
    uniqueIndex('zillion_principals_human')
      .on(t.owner_id)
      .where(sql`${t.kind} = 'human'`),
    check('zillion_principals_budget', sql`${t.budget_cents} >= 0`),
    check('zillion_principals_kind', sql`${t.kind} in ('human', 'agent')`),
    check(
      'zillion_principals_role',
      sql`${t.role} in ('lead', 'contributor', 'observer')`
    ),
    check(
      'zillion_principals_status',
      sql`${t.status} in ('active', 'paused')`
    ),
    check(
      'zillion_principals_adapter',
      sql`${t.adapter} in ('planner', 'external', 'cli', 'codex', 'openclaw')`
    ),
    check(
      'zillion_principals_manager',
      sql`${t.reports_to} is null or ${t.reports_to} <> ${t.id}`
    ),
    check(
      'zillion_principals_human_owner',
      sql`${t.kind} <> 'human' or (${t.id} = ${t.owner_id} and ${t.role} = 'lead' and ${t.status} = 'active')`
    )
  ]
)

export const playbooks = table(
  'playbooks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    checks: jsonb('checks').$type<string[]>().notNull().default([]),
    require_review: boolean('require_review').notNull().default(true),
    archived: boolean('archived').notNull().default(false),
    revision: integer('revision').notNull().default(1),
    created: date('created').defaultNow().notNull()
  },
  t => [index('zillion_playbooks_owner').on(t.owner_id)]
)

export const playbookBindings = table(
  'playbook_bindings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    principal_id: uuid('principal_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'cascade' }),
    playbook_id: uuid('playbook_id')
      .notNull()
      .references(() => playbooks.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0)
  },
  t => [
    uniqueIndex('zillion_playbook_bindings_unique').on(
      t.principal_id,
      t.playbook_id
    ),
    index('zillion_playbook_bindings_owner').on(t.owner_id),
    check('zillion_playbook_bindings_position', sql`${t.position} >= 0`)
  ]
)

export const members = table(
  'members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    principal_id: uuid('principal_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'cascade' }),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 })
      .$type<Principal['role']>()
      .notNull()
      .default('contributor')
  },
  t => [
    uniqueIndex('zillion_members_unique').on(t.project_id, t.principal_id),
    index('zillion_members_owner').on(t.owner_id),
    check(
      'zillion_members_role',
      sql`${t.role} in ('lead','contributor','observer')`
    )
  ]
)

export const assignments = table(
  'assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    task_id: uuid('task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    assignee_id: uuid('assignee_id').references(() => principals.id, {
      onDelete: 'restrict'
    }),
    status: varchar('status', { length: 20 })
      .$type<WorkItem['status']>()
      .notNull()
      .default('ready'),
    priority: varchar('priority', { length: 10 })
      .$type<WorkItem['priority']>()
      .notNull()
      .default('medium'),
    revision: integer('revision').notNull().default(1),
    auto_dispatch: boolean('auto_dispatch').notNull().default(false),
    run_budget_cents: integer('run_budget_cents').notNull().default(0),
    auto_approve: boolean('auto_approve').notNull().default(false)
  },
  t => [
    uniqueIndex('zillion_assignments_task').on(t.task_id),
    index('zillion_assignments_owner').on(t.owner_id),
    check(
      'zillion_assignments_status',
      sql`${t.status} in ('ready','running','review','blocked','done')`
    ),
    check(
      'zillion_assignments_priority',
      sql`${t.priority} in ('low','medium','high')`
    ),
    check('zillion_assignment_budget', sql`${t.run_budget_cents} >= 0`)
  ]
)

export const dependencies = table(
  'dependencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    task_id: uuid('task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    blocker_id: uuid('blocker_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' })
  },
  t => [
    uniqueIndex('zillion_dependencies_unique').on(t.task_id, t.blocker_id),
    index('zillion_dependencies_owner').on(t.owner_id),
    check('zillion_dependencies_no_self', sql`${t.task_id} <> ${t.blocker_id}`)
  ]
)

export const contextLinks = table(
  'context_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    task_id: uuid('task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    page_key: varchar('page_key', { length: 50 }).notNull(),
    document_id: uuid('document_id').references(() => documents.id, {
      onDelete: 'cascade'
    }),
    record_id: uuid('record_id').references(() => records.id, {
      onDelete: 'cascade'
    }),
    note_id: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' })
  },
  t => [
    uniqueIndex('zillion_context_unique').on(t.task_id, t.page_key),
    index('zillion_context_owner').on(t.owner_id),
    check(
      'zillion_context_page',
      sql`num_nonnulls(${t.document_id},${t.record_id},${t.note_id}) = 1 and ${t.page_key} = coalesce('document:' || ${t.document_id}::text, 'record:' || ${t.record_id}::text, 'note:' || ${t.note_id}::text)`
    )
  ]
)

export const credentials = table(
  'credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    principal_id: uuid('principal_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    expires: date('expires').notNull(),
    revoked: boolean('revoked').notNull().default(false),
    last_used: date('last_used')
  },
  t => [index('zillion_credentials_owner').on(t.owner_id)]
)

export const runs = table(
  'runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    principal_id: uuid('principal_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'restrict' }),
    task_id: uuid('task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    request_key: uuid('request_key').notNull(),
    status: varchar('status', { length: 20 })
      .$type<Run['status']>()
      .notNull()
      .default('queued'),
    estimated_cents: integer('estimated_cents').notNull().default(0),
    cost_cents: integer('cost_cents').notNull().default(0),
    task_snapshot: jsonb('task_snapshot')
      .$type<{
        title: string
        content: string
        column_id: string
        updated: string
      }>()
      .notNull(),
    context_snapshot: jsonb('context_snapshot')
      .$type<{ key: string; title: string; content: string }[]>()
      .notNull()
      .default([]),
    instructions_snapshot: text('instructions_snapshot').notNull().default(''),
    playbook_snapshot: jsonb('playbook_snapshot')
      .$type<PlaybookSnapshot[]>()
      .notNull()
      .default([]),
    quality_report: jsonb('quality_report')
      .$type<QualityEvidence[]>()
      .notNull()
      .default([]),
    credential_id: uuid('credential_id').references(() => credentials.id, {
      onDelete: 'set null'
    }),
    lease_hash: varchar('lease_hash', { length: 64 }),
    lease_expires: date('lease_expires'),
    heartbeat_at: date('heartbeat_at'),
    result: text('result').notNull().default(''),
    error: text('error').notNull().default(''),
    decision_note: text('decision_note').notNull().default(''),
    created: date('created').defaultNow().notNull(),
    settled_at: date('settled_at'),
    adapter: varchar('adapter', { length: 20 })
      .$type<Principal['adapter']>()
      .notNull()
      .default('external'),
    auto_approve: boolean('auto_approve').notNull().default(false)
  },
  t => [
    uniqueIndex('zillion_runs_request').on(t.owner_id, t.request_key),
    uniqueIndex('zillion_runs_active_task')
      .on(t.task_id)
      .where(sql`${t.status} in ('queued','running','review')`),
    index('zillion_runs_owner_agent').on(t.owner_id, t.principal_id),
    check(
      'zillion_runs_money',
      sql`${t.estimated_cents} >= 0 and ${t.cost_cents} >= 0 and ${t.cost_cents} <= ${t.estimated_cents}`
    ),
    check(
      'zillion_runs_status',
      sql`${t.status} in ('queued','running','review','approved','rejected','failed','cancelled')`
    )
  ]
)

// Independent history survives deletion of the original Projects task/run.
export const usageRecords = table(
  'usage_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    original_run_id: uuid('original_run_id').notNull(),
    run_id: uuid('run_id').references(() => runs.id, { onDelete: 'set null' }),
    principal_id: uuid('principal_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'restrict' }),
    task_title: text('task_title').notNull(),
    adapter: varchar('adapter', { length: 20 })
      .$type<Principal['adapter']>()
      .notNull(),
    status: varchar('status', { length: 20 }).$type<Run['status']>().notNull(),
    provider: varchar('provider', { length: 120 }).notNull().default(''),
    model: varchar('model', { length: 200 }).notNull().default(''),
    session_id: varchar('session_id', { length: 200 }).notNull().default(''),
    input_tokens: bigint('input_tokens', { mode: 'number' }),
    cached_input_tokens: bigint('cached_input_tokens', { mode: 'number' }),
    output_tokens: bigint('output_tokens', { mode: 'number' }),
    total_tokens: bigint('total_tokens', { mode: 'number' }),
    cost_cents: integer('cost_cents').notNull().default(0),
    reported_cost_cents: integer('reported_cost_cents'),
    charged_at: date('charged_at').notNull().defaultNow(),
    created: date('created').notNull().defaultNow(),
    updated: date('updated').notNull().defaultNow()
  },
  t => [
    uniqueIndex('zillion_usage_run').on(t.owner_id, t.original_run_id),
    index('zillion_usage_owner_date').on(t.owner_id, t.created, t.id),
    index('zillion_usage_agent').on(t.owner_id, t.principal_id),
    check(
      'zillion_usage_cost',
      sql`${t.cost_cents} >= 0 and (${t.reported_cost_cents} is null or ${t.reported_cost_cents} >= ${t.cost_cents})`
    ),
    check(
      'zillion_usage_tokens',
      sql`num_nonnulls(${t.total_tokens},${t.input_tokens},${t.cached_input_tokens},${t.output_tokens}) = 0 or (num_nonnulls(${t.total_tokens},${t.input_tokens},${t.cached_input_tokens},${t.output_tokens}) = 4 and ${t.input_tokens} >= 0 and ${t.cached_input_tokens} >= 0 and ${t.cached_input_tokens} <= ${t.input_tokens} and ${t.output_tokens} >= 0 and ${t.total_tokens} = ${t.input_tokens} + ${t.output_tokens})`
    )
  ]
)

export const activity = table(
  'activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    actor_id: uuid('actor_id')
      .notNull()
      .references(() => principals.id, { onDelete: 'restrict' }),
    task_id: uuid('task_id').references(() => projectTasks.id, {
      onDelete: 'set null'
    }),
    run_id: uuid('run_id').references(() => runs.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 80 }).notNull(),
    message: text('message').notNull().default(''),
    created: date('created').defaultNow().notNull()
  },
  t => [index('zillion_activity_owner_created').on(t.owner_id, t.created)]
)

export const tables = {
  principals,
  playbooks,
  playbookBindings,
  members,
  assignments,
  dependencies,
  contextLinks,
  credentials,
  runs,
  activity,
  usageRecords
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
