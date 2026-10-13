import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import type z from 'zod'

import { createModuleTable } from '@lifeforge/drizzle'

import type {
  ExerciseMode,
  MuscleGroup,
  Prescription,
  Progression,
  Settings,
  Suggestion,
  WorkTimer,
  exerciseInputSchema
} from '../shared'
import { coachTables } from './coachSchema'
import { pushTables } from './pushSchema'

export { coachConfigs, coachJobs, coachSnapshots } from './coachSchema'

export { pushSubscriptions, pushDeliveries } from './pushSchema'

const table = createModuleTable('zillion_gym')
const identity = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull()
})
const instant = (name: string) =>
  timestamp(name, { mode: 'date', withTimezone: true })

export const exercises = table(
  'exercises',
  {
    ...identity(),
    name: varchar('name', { length: 160 }).notNull(),
    mode: varchar('mode', { length: 10 }).$type<ExerciseMode>().notNull(),
    muscle_group: varchar('muscle_group', { length: 20 })
      .$type<MuscleGroup>()
      .notNull(),
    secondary_muscles: jsonb('secondary_muscles')
      .$type<MuscleGroup[]>()
      .notNull()
      .default([]),
    equipment: varchar('equipment', { length: 100 }).notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    custom: boolean('custom').notNull().default(true),
    archived: boolean('archived').notNull().default(false),
    catalog_key: varchar('catalog_key', { length: 100 }),
    revision: integer('revision').notNull().default(1)
  },
  t => [
    uniqueIndex('gym_exercise_identity').on(t.owner_id, t.id),
    uniqueIndex('gym_catalog_unique').on(t.owner_id, t.catalog_key),
    index('gym_exercise_owner_name').on(t.owner_id, t.name),
    check('gym_exercise_mode', sql`${t.mode} in ('reps','time','cardio')`),
    check('gym_exercise_revision', sql`${t.revision} > 0`)
  ]
)

export const routines = table(
  'routines',
  {
    ...identity(),
    name: varchar('name', { length: 160 }).notNull(),
    notes: text('notes').notNull().default(''),
    progression: varchar('progression', { length: 20 })
      .$type<Progression>()
      .notNull()
      .default('linear'),
    revision: integer('revision').notNull().default(1),
    archived: boolean('archived').notNull().default(false),
    source_key: varchar('source_key', { length: 100 })
  },
  t => [
    uniqueIndex('gym_routine_identity').on(t.owner_id, t.id),
    uniqueIndex('gym_routine_source').on(t.owner_id, t.source_key),
    index('gym_routine_owner').on(t.owner_id),
    check('gym_routine_revision', sql`${t.revision} > 0`)
  ]
)

export const routineEntries = table(
  'routine_entries',
  {
    ...identity(),
    routine_id: uuid('routine_id').notNull(),
    exercise_id: uuid('exercise_id').notNull(),
    position: integer('position').notNull(),
    superset_group: varchar('superset_group', { length: 100 }),
    prescription: jsonb('prescription').$type<Prescription>().notNull()
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.routine_id],
      foreignColumns: [routines.owner_id, routines.id]
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.owner_id, t.exercise_id],
      foreignColumns: [exercises.owner_id, exercises.id]
    }).onDelete('restrict'),
    uniqueIndex('gym_routine_position').on(
      t.owner_id,
      t.routine_id,
      t.position
    ),
    index('gym_routine_exercise').on(t.owner_id, t.exercise_id),
    check('gym_routine_position_positive', sql`${t.position} >= 0`)
  ]
)

export const schedule = table(
  'schedule',
  {
    ...identity(),
    weekday: integer('weekday'),
    date: varchar('date', { length: 10 }),
    routine_id: uuid('routine_id')
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.routine_id],
      foreignColumns: [routines.owner_id, routines.id]
    }).onDelete('restrict'),
    uniqueIndex('gym_schedule_weekday').on(t.owner_id, t.weekday),
    uniqueIndex('gym_schedule_date').on(t.owner_id, t.date),
    index('gym_schedule_routine').on(t.owner_id, t.routine_id),
    check(
      'gym_schedule_key',
      sql`(${t.weekday} is not null) <> (${t.date} is not null)`
    ),
    check(
      'gym_schedule_weekday_range',
      sql`${t.weekday} is null or ${t.weekday} between 0 and 6`
    )
  ]
)

export const workouts = table(
  'workouts',
  {
    ...identity(),
    routine_id: uuid('routine_id'),
    name: varchar('name', { length: 160 }).notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    status: varchar('status', { length: 15 })
      .$type<'active' | 'completed' | 'discarded'>()
      .notNull(),
    started_at: instant('started_at').notNull().defaultNow(),
    finished_at: instant('finished_at'),
    notes: text('notes').notNull().default(''),
    bodyweight_kg: doublePrecision('bodyweight_kg'),
    revision: integer('revision').notNull().default(1),
    current_entry_id: uuid('current_entry_id'),
    rest_until: instant('rest_until'),
    work_timer: jsonb('work_timer').$type<WorkTimer | null>(),
    source_key: varchar('source_key', { length: 100 })
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.routine_id],
      foreignColumns: [routines.owner_id, routines.id]
    }).onDelete('restrict'),
    uniqueIndex('gym_workout_identity').on(t.owner_id, t.id),
    uniqueIndex('gym_workout_active')
      .on(t.owner_id)
      .where(sql`${t.status} = 'active'`),
    uniqueIndex('gym_workout_source').on(t.owner_id, t.source_key),
    index('gym_workout_owner_date').on(t.owner_id, t.date),
    index('gym_workout_routine').on(t.owner_id, t.routine_id),
    check(
      'gym_workout_status',
      sql`${t.status} in ('active','completed','discarded')`
    ),
    check('gym_workout_revision', sql`${t.revision} > 0`),
    check(
      'gym_workout_times',
      sql`${t.finished_at} is null or ${t.finished_at} >= ${t.started_at}`
    )
  ]
)

export const workoutEntries = table(
  'workout_entries',
  {
    ...identity(),
    workout_id: uuid('workout_id').notNull(),
    exercise_id: uuid('exercise_id').notNull(),
    position: integer('position').notNull(),
    superset_group: varchar('superset_group', { length: 100 }),
    exercise: jsonb('exercise')
      .$type<z.infer<typeof exerciseInputSchema>>()
      .notNull(),
    target: jsonb('target').$type<Prescription>().notNull(),
    suggestion: jsonb('suggestion').$type<Suggestion>().notNull()
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.workout_id],
      foreignColumns: [workouts.owner_id, workouts.id]
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.owner_id, t.exercise_id],
      foreignColumns: [exercises.owner_id, exercises.id]
    }).onDelete('restrict'),
    uniqueIndex('gym_workout_entry_identity').on(t.owner_id, t.id),
    uniqueIndex('gym_workout_entry_position').on(
      t.owner_id,
      t.workout_id,
      t.position
    ),
    index('gym_workout_entry_exercise').on(t.owner_id, t.exercise_id),
    check('gym_workout_entry_position_positive', sql`${t.position} >= 0`)
  ]
)

export const workoutSets = table(
  'workout_sets',
  {
    ...identity(),
    entry_id: uuid('entry_id').notNull(),
    position: integer('position').notNull(),
    weight_kg: doublePrecision('weight_kg').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    seconds: doublePrecision('seconds').notNull().default(0),
    minutes: doublePrecision('minutes').notNull().default(0),
    speed_kmh: doublePrecision('speed_kmh').notNull().default(0),
    done: boolean('done').notNull().default(false),
    rir: doublePrecision('rir'),
    rpe: doublePrecision('rpe')
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.entry_id],
      foreignColumns: [workoutEntries.owner_id, workoutEntries.id]
    }).onDelete('cascade'),
    uniqueIndex('gym_set_position').on(t.owner_id, t.entry_id, t.position),
    check(
      'gym_set_metrics',
      sql`${t.weight_kg} >= 0 and ${t.reps} >= 0 and ${t.seconds} >= 0 and ${t.minutes} >= 0 and ${t.speed_kmh} >= 0`
    ),
    check(
      'gym_set_effort',
      sql`(${t.rir} is null or ${t.rir} between 0 and 10) and (${t.rpe} is null or ${t.rpe} between 0 and 10) and (${t.rir} is null or ${t.rpe} is null)`
    ),
    check('gym_set_position_positive', sql`${t.position} >= 0`)
  ]
)

export const bodyweight = table(
  'bodyweight',
  {
    ...identity(),
    date: varchar('date', { length: 10 }).notNull(),
    weight_kg: doublePrecision('weight_kg').notNull(),
    notes: text('notes').notNull().default(''),
    source_key: varchar('source_key', { length: 100 }),
    created: instant('created').notNull().defaultNow()
  },
  t => [
    uniqueIndex('gym_bodyweight_owner_date').on(t.owner_id, t.date),
    uniqueIndex('gym_bodyweight_source').on(t.owner_id, t.source_key),
    check('gym_bodyweight_positive', sql`${t.weight_kg} > 0`)
  ]
)

export const settings = table(
  'settings',
  {
    owner_id: uuid('owner_id').primaryKey(),
    revision: integer('revision').notNull().default(1),
    values: jsonb('values').$type<Omit<Settings, 'revision'>>().notNull()
  },
  t => [check('gym_settings_revision', sql`${t.revision} > 0`)]
)

export const commands = table(
  'commands',
  {
    id: uuid('id').notNull(),
    owner_id: uuid('owner_id').notNull(),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    result: jsonb('result').$type<unknown>().notNull(),
    created: instant('created').notNull().defaultNow()
  },
  t => [primaryKey({ columns: [t.owner_id, t.id] })]
)

export const tables = {
  exercises,
  routines,
  routineEntries,
  schedule,
  workouts,
  workoutEntries,
  workoutSets,
  bodyweight,
  settings,
  commands,
  ...coachTables,
  ...pushTables
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({
  exercises: {},
  routines: {},
  routineEntries: {},
  schedule: {},
  workouts: {},
  workoutEntries: {},
  workoutSets: {},
  bodyweight: {},
  settings: {},
  commands: {},
  coachConfigs: {},
  coachJobs: {},
  coachSnapshots: {},
  pushSubscriptions: {},
  pushDeliveries: {}
})
