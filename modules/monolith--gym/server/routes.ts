import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import {
  type GymBackup,
  backupSchema,
  bodyweightInputSchema,
  bodyweightSchema,
  commandSchema,
  exerciseInputSchema,
  exerciseSchema,
  importInputSchema,
  importSummarySchema,
  isoDateSchema,
  prescriptionSchema,
  routineInputSchema,
  routineSchema,
  scheduleInputSchema,
  scheduleSchema,
  settingsInputSchema,
  settingsSchema,
  snapshotSchema,
  workoutSchema,
  workoutUpdateSchema
} from '../shared'
import endpoints from './endpoints'
import { checkRevision, ownerId } from './model'
import {
  bodyweight,
  exercises,
  schedule,
  settings,
  workouts
} from './schema.drizzle'
import {
  archiveRoutine as archiveRoutineRow,
  ensureState,
  getRoutine,
  getSnapshot,
  getWorkout,
  importBackup,
  lockOwner,
  ownedExercise,
  resetOwnedData,
  runCommand,
  startWorkout as startWorkoutRow,
  updateWorkout as updateWorkoutRow,
  writeRoutine,
  writeSchedule
} from './store'

const idQuery = z.object({ id: z.string().uuid() })
const revision = z.object({ expected_revision: z.number().int().positive() })
const archiveInput = revision.extend({ archived: z.boolean().default(true) })

export const snapshot = endpoints
  .query({
    description:
      'Read your native exercise library, plans, active session and training history',
    input: { query: z.object({ today: isoDateSchema.optional() }) },
    output: { OK: snapshotSchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const state = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      return getSnapshot(tx, owner, query.today)
    })

    return response.ok(state)
  })

export const createExercise = endpoints
  .mutation({
    description: 'Create an owned custom exercise',
    input: { body: exerciseInputSchema },
    output: { CREATED: exerciseSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const [item] = await db
      .insert(exercises)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!item) throw new Error('Exercise creation failed')

    return response.created(exerciseSchema.parse(item))
  })

export const updateExercise = endpoints
  .mutation({
    description: 'Edit exercise details while preserving workout snapshots',
    input: {
      query: idQuery,
      body: exerciseInputSchema.extend({
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: exerciseSchema }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)
      const current = await ownedExercise(tx, owner, query.id, true)
      checkRevision(current.revision, body.expected_revision)
      const [updated] = await tx
        .update(exercises)
        .set({
          ...exerciseInputSchema.parse(body),
          revision: current.revision + 1
        })
        .where(and(eq(exercises.owner_id, owner), eq(exercises.id, query.id)))
        .returning()

      if (!updated) throw new ClientError('Exercise not found', 404)

      return updated
    })

    return response.ok(exerciseSchema.parse(item))
  })

export const archiveExercise = endpoints
  .mutation({
    description: 'Archive or restore an exercise without deleting its history',
    input: { query: idQuery, body: archiveInput },
    output: { OK: exerciseSchema }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)
      const current = await ownedExercise(tx, owner, query.id, true)
      checkRevision(current.revision, body.expected_revision)
      const [updated] = await tx
        .update(exercises)
        .set({ archived: body.archived, revision: current.revision + 1 })
        .where(and(eq(exercises.owner_id, owner), eq(exercises.id, query.id)))
        .returning()

      if (!updated) throw new ClientError('Exercise not found', 404)

      return updated
    })

    return response.ok(exerciseSchema.parse(item))
  })

export const createRoutine = endpoints
  .mutation({
    description: 'Create a routine with ordered exercises and prescriptions',
    input: { body: routineInputSchema },
    output: { CREATED: routineSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      return writeRoutine(tx, owner, body)
    })

    return response.created(item)
  })

export const updateRoutine = endpoints
  .mutation({
    description: 'Save a routine with optimistic revision protection',
    input: {
      query: idQuery,
      body: routineInputSchema.extend({
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: routineSchema }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      return writeRoutine(tx, owner, body, query.id, body.expected_revision)
    })

    return response.ok(item)
  })

export const duplicateRoutine = endpoints
  .mutation({
    description: 'Duplicate a routine with new stable entry identities',
    input: {
      query: idQuery,
      body: revision.extend({
        name: z.string().trim().min(1).max(160).optional()
      })
    },
    output: { CREATED: routineSchema }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)
      const current = await getRoutine(tx, owner, query.id)
      checkRevision(current.revision, body.expected_revision)

      return writeRoutine(tx, owner, {
        ...current,
        name: body.name ?? current.name + ' copy',
        entries: current.entries.map(entry => ({ ...entry, id: randomUUID() }))
      })
    })

    return response.created(item)
  })

export const archiveRoutine = endpoints
  .mutation({
    description:
      'Archive or restore a routine while preserving finished workouts',
    input: { query: idQuery, body: archiveInput },
    output: { OK: routineSchema }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      return archiveRoutineRow(
        tx,
        owner,
        query.id,
        body.expected_revision,
        body.archived
      )
    })

    return response.ok(item)
  })

export const setSchedule = endpoints
  .mutation({
    description:
      'Assign a routine or explicit rest to a weekday or date override',
    input: { body: scheduleInputSchema },
    output: { OK: scheduleSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      return writeSchedule(tx, owner, body)
    })

    return response.ok(item)
  })

export const removeSchedule = endpoints
  .mutation({
    description: 'Remove a weekday assignment or date override',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const [item] = await db
      .delete(schedule)
      .where(and(eq(schedule.owner_id, owner), eq(schedule.id, query.id)))
      .returning()

    if (!item) throw new ClientError('Schedule not found', 404)

    return response.noContent()
  })

export const startWorkout = endpoints
  .mutation({
    description:
      'Start one recoverable session with derived progression targets',
    input: {
      body: z.object({
        command_id: z.string().uuid(),
        routine_id: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(160).optional(),
        date: isoDateSchema.optional(),
        bodyweight_kg: z
          .number()
          .finite()
          .positive()
          .max(1000)
          .nullable()
          .optional()
      })
    },
    output: { CREATED: workoutSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(tx =>
      runCommand(tx, owner, body.command_id, 'startWorkout', body, () =>
        startWorkoutRow(tx, owner, body)
      )
    )

    return response.created(item)
  })

export const updateWorkout = endpoints
  .mutation({
    description:
      'Save active or completed workout details with stable entries, sets and revisions',
    input: {
      query: idQuery,
      body: workoutUpdateSchema.extend(commandSchema.shape)
    },
    output: { OK: workoutSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(tx =>
      runCommand(
        tx,
        owner,
        body.command_id,
        'updateWorkout',
        { ...body, id: query.id },
        () =>
          updateWorkoutRow(tx, owner, query.id, body, body.expected_revision)
      )
    )

    return response.ok(item)
  })

export const finishWorkout = endpoints
  .mutation({
    description:
      'Finish a session once and retain missed sets in its prescription snapshot',
    input: { query: idQuery, body: commandSchema },
    output: { OK: workoutSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(tx =>
      runCommand(
        tx,
        owner,
        body.command_id,
        'finishWorkout',
        { ...body, id: query.id },
        async () => {
          const current = await getWorkout(tx, owner, query.id)
          checkRevision(current.revision, body.expected_revision)
          if (current.status !== 'active')
            throw new ClientError('Only an active workout can be finished', 409)
          if (!current.entries.some(entry => entry.sets.some(set => set.done)))
            throw new ClientError(
              'Log at least one completed set before finishing'
            )
          if (current.work_timer)
            throw new ClientError('Stop the work timer before finishing')
          await tx
            .update(workouts)
            .set({
              status: 'completed',
              finished_at: new Date(),
              rest_until: null,
              work_timer: null,
              revision: current.revision + 1
            })
            .where(and(eq(workouts.owner_id, owner), eq(workouts.id, query.id)))

          return getWorkout(tx, owner, query.id)
        }
      )
    )

    return response.ok(item)
  })

function deleteWorkoutRoute(description: string, action: string) {
  return endpoints
    .mutation({
      description,
      input: { query: idQuery, body: commandSchema },
      output: { OK: workoutSchema }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const owner = ownerId(res)
      const item = await db.transaction(tx =>
        runCommand(
          tx,
          owner,
          body.command_id,
          action,
          { ...body, id: query.id },
          async () => {
            const current = await getWorkout(tx, owner, query.id)
            checkRevision(current.revision, body.expected_revision)
            if (current.status === 'discarded')
              throw new ClientError('This workout was already discarded', 409)
            await tx
              .update(workouts)
              .set({
                status: 'discarded',
                work_timer: null,
                rest_until: null,
                revision: current.revision + 1
              })
              .where(
                and(eq(workouts.owner_id, owner), eq(workouts.id, query.id))
              )

            return getWorkout(tx, owner, query.id)
          }
        )
      )

      return response.ok(item)
    })
}

export const discardWorkout = deleteWorkoutRoute(
  'Discard an active session without affecting other history',
  'discardWorkout'
)

export const deleteWorkout = deleteWorkoutRoute(
  'Remove a completed workout from history and derived statistics',
  'deleteWorkout'
)

export const reopenWorkout = endpoints
  .mutation({
    description: 'Reopen completed history as the single active session',
    input: { query: idQuery, body: commandSchema },
    output: { OK: workoutSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(tx =>
      runCommand(
        tx,
        owner,
        body.command_id,
        'reopenWorkout',
        { ...body, id: query.id },
        async () => {
          const current = await getWorkout(tx, owner, query.id)
          checkRevision(current.revision, body.expected_revision)
          if (current.status !== 'completed')
            throw new ClientError(
              'Only completed workouts can be reopened',
              409
            )

          const state = await getSnapshot(tx, owner)

          if (state.active)
            throw new ClientError(
              'Finish or discard the current session first',
              409
            )
          await tx
            .update(workouts)
            .set({
              status: 'active',
              finished_at: null,
              work_timer: null,
              rest_until: null,
              revision: current.revision + 1
            })
            .where(and(eq(workouts.owner_id, owner), eq(workouts.id, query.id)))

          return getWorkout(tx, owner, query.id)
        }
      )
    )

    return response.ok(item)
  })

export const completeWorkTimer = endpoints
  .mutation({
    description:
      'Stop a persisted work timer and record actual elapsed seconds once',
    input: { query: idQuery, body: commandSchema },
    output: { OK: workoutSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(tx =>
      runCommand(
        tx,
        owner,
        body.command_id,
        'completeWorkTimer',
        { ...body, id: query.id },
        async () => {
          const current = await getWorkout(tx, owner, query.id)
          checkRevision(current.revision, body.expected_revision)
          const timer = current.work_timer

          if (current.status !== 'active' || !timer)
            throw new ClientError('This workout has no active work timer', 409)

          const seconds = Math.min(
            timer.target_seconds,
            Math.max(
              0,
              Math.floor((Date.now() - Date.parse(timer.started_at)) / 1000)
            )
          )
          const entries = current.entries.map(entry => ({
            ...entry,
            sets: entry.sets.map(set =>
              entry.id === timer.entry_id && set.id === timer.set_id
                ? { ...set, seconds, done: seconds > 0 }
                : set
            )
          }))

          return updateWorkoutRow(
            tx,
            owner,
            query.id,
            {
              ...current,
              entries,
              work_timer: null,
              rest_until:
                seconds > 0
                  ? new Date(
                      Date.now() +
                        (entries.find(entry => entry.id === timer.entry_id)
                          ?.target.rest_seconds ?? 0) *
                          1000
                    ).toISOString()
                  : null
            },
            current.revision
          )
        }
      )
    )

    return response.ok(item)
  })

export const saveBodyweight = endpoints
  .mutation({
    description:
      'Save or edit one bodyweight reading per civil day in kilograms',
    input: {
      body: bodyweightInputSchema.extend({ id: z.string().uuid().optional() })
    },
    output: { OK: bodyweightSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)

      if (body.id) {
        const [current] = await tx
          .select()
          .from(bodyweight)
          .where(
            and(eq(bodyweight.owner_id, owner), eq(bodyweight.id, body.id))
          )

        if (!current) throw new ClientError('Bodyweight reading not found', 404)
      }

      const [row] = body.id
        ? await tx
            .update(bodyweight)
            .set(bodyweightInputSchema.parse(body))
            .where(
              and(eq(bodyweight.owner_id, owner), eq(bodyweight.id, body.id))
            )
            .returning()
        : await tx
            .insert(bodyweight)
            .values({ ...bodyweightInputSchema.parse(body), owner_id: owner })
            .onConflictDoUpdate({
              target: [bodyweight.owner_id, bodyweight.date],
              set: { weight_kg: body.weight_kg, notes: body.notes }
            })
            .returning()

      if (!row) throw new Error('Bodyweight save failed')

      return bodyweightSchema.parse(row)
    })

    return response.ok(item)
  })

export const removeBodyweight = endpoints
  .mutation({
    description: 'Delete an owned bodyweight reading',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const [row] = await db
      .delete(bodyweight)
      .where(and(eq(bodyweight.owner_id, owner), eq(bodyweight.id, query.id)))
      .returning()

    if (!row) throw new ClientError('Bodyweight reading not found', 404)

    return response.noContent()
  })

export const updateSettings = endpoints
  .mutation({
    description:
      'Save display units, effort scale, goals and reminders without rewriting logged units',
    input: {
      body: settingsInputSchema.extend({
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: settingsSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const item = await db.transaction(async tx => {
      await lockOwner(tx, owner)
      await ensureState(tx, owner)
      const [current] = await tx
        .select()
        .from(settings)
        .where(eq(settings.owner_id, owner))

      if (!current) throw new Error('Settings not found')
      checkRevision(current.revision, body.expected_revision)

      try {
        new Intl.DateTimeFormat('en', { timeZone: body.timezone })
      } catch {
        throw new ClientError('Choose a valid timezone')
      }

      const values = settingsInputSchema.parse(body)
      await tx
        .update(settings)
        .set({ values, revision: current.revision + 1 })
        .where(eq(settings.owner_id, owner))

      return { ...values, revision: current.revision + 1 }
    })

    return response.ok(item)
  })

export const exportData = endpoints
  .query({
    description:
      'Export a versioned native backup or a selected shareable training plan',
    input: {
      query: z.object({
        scope: z.enum(['all', 'plan']).default('all'),
        routine_id: z.string().uuid().optional()
      })
    },
    output: { OK: backupSchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const state = await getSnapshot(db, owner)

    if (query.routine_id) await getRoutine(db, owner, query.routine_id)

    const plan = state.routines.filter(
      routine => !query.routine_id || routine.id === query.routine_id
    )
    const history = query.scope === 'all' ? state.workouts : []
    const exerciseIds = new Set([
      ...plan.flatMap(routine =>
        routine.entries.map(entry => entry.exercise_id)
      ),
      ...history.flatMap(workout =>
        workout.entries.map(entry => entry.exercise_id)
      )
    ])
    const data: GymBackup = {
      format: 'zillion-gym',
      version: 1,
      exported_at: new Date().toISOString(),
      exercises:
        query.scope === 'all'
          ? state.exercises
          : state.exercises.filter(exercise => exerciseIds.has(exercise.id)),
      routines: plan,
      schedule: state.schedule.filter(
        item => !query.routine_id || item.routine_id === query.routine_id
      ),
      workouts: history,
      bodyweight: query.scope === 'all' ? state.bodyweight : [],
      ...(query.scope === 'all' ? { settings: state.settings } : {})
    }

    return response.ok(data)
  })

export const importData = endpoints
  .mutation({
    description:
      'Merge a validated native backup atomically, remap identities and preserve existing history',
    input: { body: importInputSchema },
    output: { OK: importSummarySchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const result = await db.transaction(tx =>
      runCommand(tx, owner, body.command_id, 'importData', body, async () => {
        if (body.mode === 'replace') await resetOwnedData(tx, owner)

        return importBackup(tx, owner, body.data, {
          include_schedule: body.include_schedule,
          include_settings: body.include_settings,
          restore_exercises: body.mode === 'replace'
        })
      })
    )

    return response.ok(result)
  })

export const resetData = endpoints
  .mutation({
    description:
      'Reset your core Gym data while preserving command and coach audit records',
    input: {
      body: z.object({
        command_id: z.string().uuid(),
        confirmation: z.literal('RESET GYM')
      })
    },
    output: { OK: z.object({ reset: z.literal(true) }) }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const result = await db.transaction(tx =>
      runCommand(tx, owner, body.command_id, 'resetData', body, async () => {
        await resetOwnedData(tx, owner)

        return { reset: true as const }
      })
    )

    return response.ok(result)
  })

export const starterPlan = endpoints
  .mutation({
    description:
      'Add a Push/Pull/Legs starter plan once without replacing current plans',
    input: { body: z.object({ command_id: z.string().uuid() }) },
    output: { CREATED: z.array(routineSchema) }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const result = await db.transaction(tx =>
      runCommand(tx, owner, body.command_id, 'starterPlan', body, async () => {
        const state = await getSnapshot(tx, owner)
        const definitions = [
          { name: 'Push', catalog_keys: ['0025', '0405', '0201'] },
          { name: 'Pull', catalog_keys: ['0027', '2330', '0294'] },
          { name: 'Legs', catalog_keys: ['0043', '0085', '0417'] }
        ] as const
        const created = []

        for (const definition of definitions) {
          const chosen = definition.catalog_keys.map(key =>
            state.exercises.find(
              exercise =>
                exercise.catalog_key === key &&
                !exercise.archived &&
                exercise.mode === 'reps'
            )
          )

          if (chosen.some(exercise => !exercise))
            throw new ClientError(
              'Restore the standard starter exercises in your library before creating this plan'
            )

          const routine = await writeRoutine(tx, owner, {
            name: definition.name,
            notes: 'Adjust starting loads to your experience before training.',
            progression: 'linear',
            entries: chosen.map(exercise => ({
              id: randomUUID(),
              exercise_id: exercise!.id,
              superset_group: null,
              prescription: prescriptionSchema.parse({
                sets: 3,
                reps: 8,
                reps_min: 6
              })
            }))
          })
          created.push(routine)
        }
        for (const [index, weekday] of [1, 3, 5].entries())
          if (!state.schedule.some(item => item.weekday === weekday))
            await writeSchedule(tx, owner, {
              weekday,
              routine_id: created[index]!.id
            })

        return created
      })
    )

    return response.created(result)
  })
