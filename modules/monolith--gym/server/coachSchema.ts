import { type RelationsBuilder } from 'drizzle-orm'
import {
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

import { principals, runs } from '../../monolith--agents/server/schema.drizzle'
import { tasks } from '../../monolith--agents/server/workSchema'
import type { CoachConfig } from '../coachShared'
import type { Routine, ScheduleItem } from '../shared'

const table = createModuleTable('zillion_gym')

export const coachConfigs = table(
  'coach_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    agent_id: uuid('agent_id').references(() => principals.id, {
      onDelete: 'set null'
    }),
    config: jsonb('config').$type<Omit<CoachConfig, 'revision'>>().notNull(),
    revision: integer('revision').notNull().default(1),
    last_review: timestamp('last_review', { withTimezone: true }),
    last_workout_id: uuid('last_workout_id')
  },
  t => [uniqueIndex('zillion_gym_coach_owner').on(t.owner_id)]
)

export const coachJobs = table(
  'coach_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    request_id: uuid('request_id').notNull(),
    task_id: uuid('task_id').references(() => tasks.id, {
      onDelete: 'set null'
    }),
    run_id: uuid('run_id').references(() => runs.id, { onDelete: 'set null' }),
    kind: varchar('kind', { length: 20 })
      .$type<'create' | 'review' | 'refine'>()
      .notNull(),
    plan_hash: varchar('plan_hash', { length: 64 }).notNull(),
    feedback: text('feedback').notNull().default(''),
    previous_job_id: uuid('previous_job_id'),
    applied_ids: jsonb('applied_ids').$type<string[]>().notNull().default([]),
    created: timestamp('created', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    uniqueIndex('zillion_gym_coach_request').on(t.owner_id, t.request_id),
    index('zillion_gym_coach_jobs_owner').on(t.owner_id, t.created)
  ]
)

export const coachSnapshots = table(
  'coach_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    job_id: uuid('job_id').references(() => coachJobs.id, {
      onDelete: 'set null'
    }),
    plan: jsonb('plan')
      .$type<{ routines: Routine[]; schedule: ScheduleItem[] }>()
      .notNull(),
    after_hash: varchar('after_hash', { length: 64 }).notNull(),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    reverted_at: timestamp('reverted_at', { withTimezone: true })
  },
  t => [index('zillion_gym_coach_snapshots_owner').on(t.owner_id, t.created)]
)

export const coachTables = { coachConfigs, coachJobs, coachSnapshots }

export const coachRelations = (_r: RelationsBuilder<typeof coachTables>) => ({})
