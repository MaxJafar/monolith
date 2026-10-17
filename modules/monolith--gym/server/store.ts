import dayjs from 'dayjs'
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createHash, randomUUID } from 'node:crypto'
import z from 'zod'

import type { BuiltModuleSchema } from '@monolith/drizzle'
import { ClientError } from '@monolith/server-utils'

import rawCatalog from '../catalog.json'
import {
  type GymBackup,
  type GymSnapshot,
  type ImportSummary,
  type Routine,
  type RoutineInput,
  type Workout,
  type WorkoutEntry,
  type WorkoutUpdate,
  backupSchema,
  exerciseInputSchema,
  exerciseSchema,
  routineInputSchema,
  routineSchema,
  scheduleInputSchema,
  scheduleSchema,
  setInputSchema,
  settingsInputSchema,
  settingsSchema,
  suggestionSchema,
  workoutSchema
} from '../shared'
import {
  checkRevision,
  nextPrescription,
  trainingStats,
  validatePrescription,
  validateSupersets,
  validateWorkoutDraft
} from './model'
import * as schema from './schema.drizzle'
import {
  bodyweight,
  commands,
  exercises,
  routineEntries,
  routines,
  schedule,
  settings,
  workoutEntries,
  workoutSets,
  workouts
} from './schema.drizzle'

export { ownerId } from './model'

export type GymDatabase = PostgresJsDatabase<BuiltModuleSchema<typeof schema>>

export type GymTransaction = Parameters<
  Parameters<GymDatabase['transaction']>[0]
>[0]

export type GymStore = Pick<
  GymDatabase,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>

const catalog = z
  .array(exerciseInputSchema.extend({ catalog_key: z.string() }))
  .parse(rawCatalog)
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

export async function lockOwner(db: GymStore, owner: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`gym:${owner}`},0))`
  )
}

export async function ensureState(db: GymStore, owner: string) {
  await db
    .insert(settings)
    .values({ owner_id: owner, values: settingsInputSchema.parse({}) })
    .onConflictDoNothing()
  const seeded = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.owner_id, owner), isNotNull(exercises.catalog_key)))
    .limit(1)

  if (!seeded.length)
    await db
      .insert(exercises)
      .values(
        catalog.map(item => ({ ...item, owner_id: owner, custom: false }))
      )
      .onConflictDoNothing({
        target: [exercises.owner_id, exercises.catalog_key]
      })
}

export async function ownedExercise(
  db: GymStore,
  owner: string,
  id: string,
  allowArchived = false
) {
  const [item] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.owner_id, owner), eq(exercises.id, id)))

  if (!item) throw new ClientError('Exercise not found', 404)
  if (item.archived && !allowArchived)
    throw new ClientError('Unarchive this exercise before adding it', 409)

  return exerciseSchema.parse(item)
}

export async function getRoutine(
  db: GymStore,
  owner: string,
  id: string
): Promise<Routine> {
  const [item] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.owner_id, owner), eq(routines.id, id)))

  if (!item) throw new ClientError('Routine not found', 404)

  const entries = await db
    .select()
    .from(routineEntries)
    .where(
      and(eq(routineEntries.owner_id, owner), eq(routineEntries.routine_id, id))
    )
    .orderBy(asc(routineEntries.position))

  return routineSchema.parse({ ...item, entries })
}

export async function getWorkout(
  db: GymStore,
  owner: string,
  id: string
): Promise<Workout> {
  const [item] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.owner_id, owner), eq(workouts.id, id)))

  if (!item) throw new ClientError('Workout not found', 404)

  const entries = await db
    .select()
    .from(workoutEntries)
    .where(
      and(eq(workoutEntries.owner_id, owner), eq(workoutEntries.workout_id, id))
    )
    .orderBy(asc(workoutEntries.position))
  const sets = entries.length
    ? await db
        .select()
        .from(workoutSets)
        .where(
          and(
            eq(workoutSets.owner_id, owner),
            inArray(
              workoutSets.entry_id,
              entries.map(entry => entry.id)
            )
          )
        )
        .orderBy(asc(workoutSets.position))
    : []

  return workoutSchema.parse({
    ...item,
    started_at: item.started_at.toISOString(),
    finished_at: item.finished_at?.toISOString() ?? null,
    rest_until: item.rest_until?.toISOString() ?? null,
    entries: entries.map(entry => ({
      ...entry,
      sets: sets.filter(set => set.entry_id === entry.id)
    }))
  })
}

export async function getSnapshot(
  db: GymStore,
  owner: string,
  today = dayjs().format('YYYY-MM-DD')
): Promise<GymSnapshot> {
  await ensureState(db, owner)
  const [
    ownedExercises,
    ownedRoutines,
    entries,
    ownedSchedule,
    ownedWorkouts,
    loggedEntries,
    loggedSets,
    weights,
    preferences
  ] = await Promise.all([
    db
      .select()
      .from(exercises)
      .where(eq(exercises.owner_id, owner))
      .orderBy(asc(exercises.name)),
    db
      .select()
      .from(routines)
      .where(eq(routines.owner_id, owner))
      .orderBy(asc(routines.name)),
    db
      .select()
      .from(routineEntries)
      .where(eq(routineEntries.owner_id, owner))
      .orderBy(asc(routineEntries.position)),
    db.select().from(schedule).where(eq(schedule.owner_id, owner)),
    db
      .select()
      .from(workouts)
      .where(eq(workouts.owner_id, owner))
      .orderBy(asc(workouts.started_at)),
    db
      .select()
      .from(workoutEntries)
      .where(eq(workoutEntries.owner_id, owner))
      .orderBy(asc(workoutEntries.position)),
    db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.owner_id, owner))
      .orderBy(asc(workoutSets.position)),
    db
      .select()
      .from(bodyweight)
      .where(eq(bodyweight.owner_id, owner))
      .orderBy(asc(bodyweight.date)),
    db.select().from(settings).where(eq(settings.owner_id, owner))
  ])
  const history = ownedWorkouts.map(item =>
    workoutSchema.parse({
      ...item,
      started_at: item.started_at.toISOString(),
      finished_at: item.finished_at?.toISOString() ?? null,
      rest_until: item.rest_until?.toISOString() ?? null,
      entries: loggedEntries
        .filter(entry => entry.workout_id === item.id)
        .map(entry => ({
          ...entry,
          sets: loggedSets.filter(set => set.entry_id === entry.id)
        }))
    })
  )
  const preference = preferences[0]

  if (!preference) throw new Error('Gym settings initialization failed')

  const values = settingsSchema.parse({
    ...preference.values,
    revision: preference.revision
  })
  const completed = history.filter(item => item.status === 'completed')

  return {
    exercises: ownedExercises.map(item => exerciseSchema.parse(item)),
    routines: ownedRoutines.map(item =>
      routineSchema.parse({
        ...item,
        entries: entries.filter(entry => entry.routine_id === item.id)
      })
    ),
    schedule: ownedSchedule.map(item => scheduleSchema.parse(item)),
    workouts: history,
    active: history.find(item => item.status === 'active') ?? null,
    bodyweight: weights.map(item => ({
      id: item.id,
      date: item.date,
      weight_kg: item.weight_kg,
      notes: item.notes
    })),
    settings: values,
    stats: trainingStats(completed, values.formula, today)
  }
}

export async function writeRoutine(
  db: GymStore,
  owner: string,
  input: RoutineInput,
  id?: string,
  expectedRevision?: number,
  allowArchivedExercises = false
): Promise<Routine> {
  const plan = routineInputSchema.parse(input)

  if (new Set(plan.entries.map(entry => entry.id)).size !== plan.entries.length)
    throw new ClientError('Routine entry identifiers must be unique')
  validateSupersets(plan.entries)

  for (const entry of plan.entries) {
    await ownedExercise(db, owner, entry.exercise_id, allowArchivedExercises)
    validatePrescription(entry.prescription, plan.progression)
  }

  if (id) {
    const current = await getRoutine(db, owner, id)

    if (expectedRevision === undefined)
      throw new ClientError('Expected revision required', 409)
    checkRevision(current.revision, expectedRevision)
    await db
      .update(routines)
      .set({
        name: plan.name,
        notes: plan.notes,
        progression: plan.progression,
        revision: current.revision + 1
      })
      .where(and(eq(routines.owner_id, owner), eq(routines.id, id)))
    await db
      .delete(routineEntries)
      .where(
        and(
          eq(routineEntries.owner_id, owner),
          eq(routineEntries.routine_id, id)
        )
      )
  } else {
    id = randomUUID()
    await db.insert(routines).values({
      id,
      owner_id: owner,
      name: plan.name,
      notes: plan.notes,
      progression: plan.progression
    })
  }
  if (plan.entries.length)
    await db.insert(routineEntries).values(
      plan.entries.map((entry, position) => ({
        ...entry,
        owner_id: owner,
        routine_id: id,
        position
      }))
    )

  return getRoutine(db, owner, id)
}

export async function archiveRoutine(
  db: GymStore,
  owner: string,
  id: string,
  expectedRevision: number,
  archived = true
): Promise<Routine> {
  const current = await getRoutine(db, owner, id)
  checkRevision(current.revision, expectedRevision)
  await db
    .update(routines)
    .set({ archived, revision: current.revision + 1 })
    .where(and(eq(routines.owner_id, owner), eq(routines.id, id)))
  if (archived)
    await db
      .update(schedule)
      .set({ routine_id: null })
      .where(and(eq(schedule.owner_id, owner), eq(schedule.routine_id, id)))

  return getRoutine(db, owner, id)
}

export async function writeSchedule(
  db: GymStore,
  owner: string,
  input: z.input<typeof scheduleInputSchema>
) {
  const assignment = scheduleInputSchema.parse(input)

  if (
    assignment.routine_id &&
    (await getRoutine(db, owner, assignment.routine_id)).archived
  )
    throw new ClientError('Unarchive this routine before scheduling it', 409)

  const key =
    assignment.date !== null
      ? eq(schedule.date, assignment.date)
      : eq(schedule.weekday, assignment.weekday!)
  const [current] = await db
    .select()
    .from(schedule)
    .where(and(eq(schedule.owner_id, owner), key))
  const [row] = current
    ? await db
        .update(schedule)
        .set(assignment)
        .where(and(eq(schedule.owner_id, owner), eq(schedule.id, current.id)))
        .returning()
    : await db
        .insert(schedule)
        .values({ ...assignment, owner_id: owner })
        .returning()

  if (!row) throw new Error('Schedule save failed')

  return scheduleSchema.parse(row)
}

export async function runCommand<T>(
  db: GymStore,
  owner: string,
  id: string,
  action: string,
  input: unknown,
  work: () => Promise<T>
): Promise<T> {
  await lockOwner(db, owner)
  const fingerprint = digest({ action, input })
  const [existing] = await db
    .select()
    .from(commands)
    .where(and(eq(commands.owner_id, owner), eq(commands.id, id)))

  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new ClientError(
        'This command identifier was already used for another action',
        409
      )

    return existing.result as T
  }

  const result = await work()
  await db.insert(commands).values({
    id,
    owner_id: owner,
    fingerprint,
    result: JSON.parse(JSON.stringify(result))
  })

  return result
}

export async function replaceWorkoutEntries(
  db: GymStore,
  owner: string,
  workoutId: string,
  input: WorkoutUpdate['entries'],
  previous: WorkoutEntry[] = []
): Promise<void> {
  const prepared = []

  for (const [position, entry] of input.entries()) {
    const prior = previous.find(
      value => value.id === entry.id && value.exercise_id === entry.exercise_id
    )
    const exercise = await ownedExercise(db, owner, entry.exercise_id, !!prior)
    prepared.push({
      ...entry,
      position,
      exercise: prior?.exercise ?? exerciseInputSchema.parse(exercise),
      suggestion:
        prior?.suggestion ??
        suggestionSchema.parse({
          policy: 'off',
          kind: 'off',
          reason: 'disabled'
        })
    })
  }
  await db
    .delete(workoutEntries)
    .where(
      and(
        eq(workoutEntries.owner_id, owner),
        eq(workoutEntries.workout_id, workoutId)
      )
    )
  if (prepared.length)
    await db.insert(workoutEntries).values(
      prepared.map(({ sets: _sets, ...entry }) => ({
        ...entry,
        owner_id: owner,
        workout_id: workoutId
      }))
    )

  const sets = prepared.flatMap(entry =>
    entry.sets.map((set, position) => ({
      ...set,
      owner_id: owner,
      entry_id: entry.id,
      position
    }))
  )

  if (sets.length) await db.insert(workoutSets).values(sets)
}

export async function updateWorkout(
  db: GymStore,
  owner: string,
  id: string,
  input: WorkoutUpdate,
  expectedRevision: number
): Promise<Workout> {
  const current = await getWorkout(db, owner, id)
  checkRevision(current.revision, expectedRevision)
  if (current.status === 'discarded')
    throw new ClientError('This workout was deleted', 409)
  validateWorkoutDraft(input)
  if (current.status !== 'active' && (input.work_timer || input.rest_until))
    throw new ClientError('Completed history cannot run a timer')
  await replaceWorkoutEntries(db, owner, id, input.entries, current.entries)
  await db
    .update(workouts)
    .set({
      name: input.name,
      date: input.date,
      notes: input.notes,
      bodyweight_kg: input.bodyweight_kg,
      current_entry_id: input.current_entry_id,
      rest_until: input.rest_until ? new Date(input.rest_until) : null,
      work_timer: input.work_timer,
      revision: current.revision + 1
    })
    .where(and(eq(workouts.owner_id, owner), eq(workouts.id, id)))

  return getWorkout(db, owner, id)
}

export async function startWorkout(
  db: GymStore,
  owner: string,
  input: {
    routine_id?: string | null
    name?: string
    date?: string
    bodyweight_kg?: number | null
  }
): Promise<Workout> {
  const state = await getSnapshot(db, owner)

  if (state.active)
    throw new ClientError(
      'Resume or discard your active workout before starting another',
      409
    )

  const routine = input.routine_id
    ? await getRoutine(db, owner, input.routine_id)
    : null

  if (routine?.archived)
    throw new ClientError('Unarchive this routine before starting it', 409)

  const id = randomUUID()
  const entries: WorkoutEntry[] = []

  for (const planned of routine?.entries ?? []) {
    const exercise = await ownedExercise(db, owner, planned.exercise_id)
    const suggestion = nextPrescription(
      state.workouts,
      planned,
      exercise,
      routine?.progression,
      state.settings.unit
    )
    const target = { ...planned.prescription }

    if (suggestion.seconds !== undefined) target.seconds = suggestion.seconds
    if (suggestion.reps !== undefined && suggestion.policy !== 'double')
      target.reps = suggestion.reps

    const entryId = randomUUID()
    const last = state.workouts
      .filter(workout => workout.status === 'completed')
      .toReversed()
      .flatMap(workout => workout.entries)
      .find(
        entry =>
          entry.exercise_id === exercise.id &&
          entry.target.mode === target.mode &&
          entry.sets.some(set => set.done)
      )
    const sets = Array.from({ length: target.sets }, (_, position) => {
      const previous =
        last?.sets.filter(set => set.done)[position] ??
        last?.sets.filter(set => set.done).at(-1)

      return {
        ...setInputSchema.parse({
          id: randomUUID(),
          weight_kg:
            suggestion.weight_kg ?? previous?.weight_kg ?? target.weight_kg,
          reps:
            target.mode === 'reps'
              ? (suggestion.reps ?? previous?.reps ?? target.reps)
              : 0,
          seconds:
            target.mode === 'time'
              ? (suggestion.seconds ?? previous?.seconds ?? target.seconds)
              : 0,
          minutes:
            target.mode === 'cardio'
              ? (previous?.minutes ?? target.minutes)
              : 0,
          speed_kmh:
            target.mode === 'cardio'
              ? (previous?.speed_kmh ?? target.speed_kmh)
              : 0
        }),
        position
      }
    })
    entries.push({
      id: entryId,
      exercise_id: exercise.id,
      superset_group: planned.superset_group,
      target,
      exercise: exerciseInputSchema.parse(exercise),
      suggestion,
      sets,
      position: entries.length
    })
  }
  await db.insert(workouts).values({
    id,
    owner_id: owner,
    routine_id: routine?.id ?? null,
    name: input.name ?? routine?.name ?? 'Freestyle',
    date: input.date ?? dayjs().format('YYYY-MM-DD'),
    status: 'active',
    bodyweight_kg: input.bodyweight_kg ?? null,
    current_entry_id: entries[0]?.id ?? null
  })

  if (entries.length) {
    await db.insert(workoutEntries).values(
      entries.map(({ sets: _sets, ...entry }) => ({
        ...entry,
        owner_id: owner,
        workout_id: id
      }))
    )
    await db.insert(workoutSets).values(
      entries.flatMap(entry =>
        entry.sets.map(set => ({
          ...set,
          owner_id: owner,
          entry_id: entry.id
        }))
      )
    )
  }
  if (input.bodyweight_kg != null)
    await db
      .insert(bodyweight)
      .values({
        owner_id: owner,
        date: input.date ?? dayjs().format('YYYY-MM-DD'),
        weight_kg: input.bodyweight_kg
      })
      .onConflictDoUpdate({
        target: [bodyweight.owner_id, bodyweight.date],
        set: { weight_kg: input.bodyweight_kg }
      })

  return getWorkout(db, owner, id)
}

function workoutFingerprint(workout: Workout) {
  return digest({
    date: workout.date,
    start: workout.started_at,
    name: workout.name,
    entries: workout.entries.map(entry => ({
      exercise: entry.exercise.name.trim().toLowerCase(),
      target: entry.target,
      sets: entry.sets.map(({ id: _id, position: _position, ...set }) => set)
    }))
  })
}

export async function importBackup(
  db: GymStore,
  owner: string,
  input: GymBackup,
  options: {
    include_schedule?: boolean
    include_settings?: boolean
    restore_exercises?: boolean
  } = {}
): Promise<ImportSummary> {
  const data = backupSchema.parse(input)

  for (const items of [
    data.exercises,
    data.routines,
    data.workouts,
    data.bodyweight
  ])
    if (new Set(items.map(item => item.id)).size !== items.length)
      throw new ClientError('Imported entity identifiers must be unique')

  const state = await getSnapshot(db, owner)
  const summary: ImportSummary = {
    exercises: 0,
    routines: 0,
    workouts: 0,
    bodyweight: 0,
    duplicates: 0
  }
  const exerciseIds = new Map<string, string>(),
    routineIds = new Map<string, string>()

  for (const exercise of data.exercises) {
    const byId = state.exercises.find(value => value.id === exercise.id)
    const byCatalog = exercise.catalog_key
      ? state.exercises.find(
          value => value.catalog_key === exercise.catalog_key
        )
      : undefined
    const byName = state.exercises.filter(
      value =>
        value.name.trim().toLowerCase() ===
          exercise.name.trim().toLowerCase() && value.mode === exercise.mode
    )
    const match =
      byId ?? byCatalog ?? (byName.length === 1 ? byName[0] : undefined)

    if (match) {
      const values = {
        ...exerciseInputSchema.parse(exercise),
        archived: exercise.archived
      }

      if (
        options.restore_exercises &&
        digest({
          ...exerciseInputSchema.parse(match),
          archived: match.archived
        }) !== digest(values)
      ) {
        await db
          .update(exercises)
          .set({ ...values, revision: match.revision + 1 })
          .where(and(eq(exercises.owner_id, owner), eq(exercises.id, match.id)))
        Object.assign(match, values, { revision: match.revision + 1 })
      }
      exerciseIds.set(exercise.id, match.id)
      continue
    }

    const id = randomUUID()
    const values = {
      ...exerciseInputSchema.parse(exercise),
      id,
      owner_id: owner,
      custom: true,
      catalog_key: null,
      archived: exercise.archived
    }
    await db.insert(exercises).values(values)
    state.exercises.push(exerciseSchema.parse({ ...values, revision: 1 }))
    exerciseIds.set(exercise.id, id)
    summary.exercises++
  }

  const mappedExercise = (id: string) => {
    const target = exerciseIds.get(id)

    if (!target)
      throw new ClientError(
        'Import refers to an exercise missing from its exercise catalog'
      )

    return target
  }

  for (const routine of data.routines) {
    const existing = state.routines.find(value => value.id === routine.id)
    const key =
      'import:' +
      digest({
        name: routine.name,
        notes: routine.notes,
        progression: routine.progression,
        entries: routine.entries.map(entry => ({
          exercise: mappedExercise(entry.exercise_id),
          prescription: entry.prescription,
          superset_group: entry.superset_group
        }))
      })
    const [prior] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.owner_id, owner), eq(routines.source_key, key)))

    if (existing || prior) {
      routineIds.set(routine.id, (existing ?? prior)!.id)
      summary.duplicates++
      continue
    }
    if (
      new Set(routine.entries.map(entry => entry.id)).size !==
      routine.entries.length
    )
      throw new ClientError('Imported routine entry identifiers must be unique')

    const saved = await writeRoutine(
      db,
      owner,
      {
        ...routine,
        entries: routine.entries.map(entry => ({
          ...entry,
          id: randomUUID(),
          exercise_id: mappedExercise(entry.exercise_id)
        }))
      },
      undefined,
      undefined,
      true
    )
    await db
      .update(routines)
      .set({ source_key: key, archived: routine.archived })
      .where(and(eq(routines.owner_id, owner), eq(routines.id, saved.id)))
    routineIds.set(routine.id, saved.id)
    summary.routines++
  }

  for (const workout of data.workouts) {
    validateWorkoutDraft(workout)
    if (
      workout.status !== 'active' &&
      (workout.work_timer || workout.rest_until)
    )
      throw new ClientError('Imported history cannot run a timer')
    if (workout.status === 'active' && workout.finished_at)
      throw new ClientError(
        'An active imported workout cannot have a finish timestamp'
      )

    const key = 'import:' + workoutFingerprint(workout)
    const [prior] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.owner_id, owner), eq(workouts.source_key, key)))

    if (
      prior ||
      state.workouts.some(
        value =>
          value.id === workout.id ||
          workoutFingerprint(value) === workoutFingerprint(workout)
      ) ||
      state.active?.id === workout.id
    ) {
      summary.duplicates++
      continue
    }
    if (workout.status === 'active' && (await getSnapshot(db, owner)).active)
      throw new ClientError(
        'Import contains an active workout; finish or discard the current session first',
        409
      )

    const id = randomUUID()
    const entryIds = new Map(
      workout.entries.map(entry => [entry.id, randomUUID()])
    )
    const setIds = new Map(
      workout.entries.flatMap(entry =>
        entry.sets.map(set => [set.id, randomUUID()] as const)
      )
    )
    const entries = workout.entries.map((entry, position) => ({
      ...entry,
      position,
      id: entryIds.get(entry.id)!,
      exercise_id: mappedExercise(entry.exercise_id),
      sets: entry.sets.map((set, position) => ({
        ...set,
        position,
        id: setIds.get(set.id)!
      }))
    }))
    const timer =
      workout.status === 'active' && workout.work_timer
        ? {
            ...workout.work_timer,
            entry_id: entryIds.get(workout.work_timer.entry_id)!,
            set_id: setIds.get(workout.work_timer.set_id)!
          }
        : null
    const draft = {
      ...workout,
      entries,
      current_entry_id: workout.current_entry_id
        ? (entryIds.get(workout.current_entry_id) ?? null)
        : null,
      rest_until: workout.status === 'active' ? workout.rest_until : null,
      work_timer: timer
    }
    validateWorkoutDraft(draft)
    if (workout.status === 'completed' && !workout.finished_at)
      throw new ClientError('Completed import workouts need a finish timestamp')
    if (workout.finished_at && workout.finished_at < workout.started_at)
      throw new ClientError('Imported workout finishes before it starts')
    await db.insert(workouts).values({
      id,
      owner_id: owner,
      routine_id: workout.routine_id
        ? (routineIds.get(workout.routine_id) ?? null)
        : null,
      name: workout.name,
      date: workout.date,
      status: workout.status,
      started_at: new Date(workout.started_at),
      finished_at: workout.finished_at ? new Date(workout.finished_at) : null,
      notes: workout.notes,
      bodyweight_kg: workout.bodyweight_kg,
      current_entry_id: draft.current_entry_id,
      rest_until: draft.rest_until ? new Date(draft.rest_until) : null,
      work_timer: draft.work_timer,
      source_key: key
    })

    if (entries.length) {
      await db.insert(workoutEntries).values(
        entries.map(({ sets: _sets, ...entry }) => ({
          ...entry,
          owner_id: owner,
          workout_id: id
        }))
      )
      await db.insert(workoutSets).values(
        entries.flatMap(entry =>
          entry.sets.map(set => ({
            ...set,
            owner_id: owner,
            entry_id: entry.id
          }))
        )
      )
    }
    summary.workouts++
  }

  for (const weight of data.bodyweight) {
    const [prior] = await db
      .select()
      .from(bodyweight)
      .where(
        and(eq(bodyweight.owner_id, owner), eq(bodyweight.date, weight.date))
      )

    if (prior) {
      summary.duplicates++
      continue
    }
    await db.insert(bodyweight).values({
      owner_id: owner,
      date: weight.date,
      weight_kg: weight.weight_kg,
      notes: weight.notes,
      source_key: 'import:' + weight.id
    })
    summary.bodyweight++
  }

  if (options.include_schedule)
    for (const item of data.schedule) {
      if (item.routine_id && !routineIds.has(item.routine_id))
        throw new ClientError('Imported schedule refers to a missing routine')
      await writeSchedule(db, owner, {
        weekday: item.weekday,
        date: item.date,
        routine_id: item.routine_id ? routineIds.get(item.routine_id)! : null
      })
    }

  if (options.include_settings && data.settings) {
    const values = settingsInputSchema.parse(data.settings)

    try {
      new Intl.DateTimeFormat('en', { timeZone: values.timezone })
    } catch {
      throw new ClientError('Choose a valid timezone')
    }
    await db
      .update(settings)
      .set({ values, revision: state.settings.revision + 1 })
      .where(eq(settings.owner_id, owner))
  }

  return summary
}

export async function resetOwnedData(
  db: GymStore,
  owner: string
): Promise<void> {
  await db.delete(schedule).where(eq(schedule.owner_id, owner))
  await db.delete(workouts).where(eq(workouts.owner_id, owner))
  await db.delete(routines).where(eq(routines.owner_id, owner))
  await db.delete(exercises).where(eq(exercises.owner_id, owner))
  await db.delete(bodyweight).where(eq(bodyweight.owner_id, owner))
  const [current] = await db
    .select()
    .from(settings)
    .where(eq(settings.owner_id, owner))

  if (current)
    await db
      .update(settings)
      .set({
        values: settingsInputSchema.parse({}),
        revision: current.revision + 1
      })
      .where(eq(settings.owner_id, owner))
  await ensureState(db, owner)
}
