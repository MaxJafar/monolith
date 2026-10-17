import z from 'zod'

import { workoutSchema, workoutUpdateSchema } from '../../../shared'
import type { Workout, WorkoutUpdate } from '../../../shared'

export const recoverySchema = z
  .object({
    owner_id: z.string().uuid(),
    server: workoutSchema,
    draft: workoutSchema.extend({ name: z.string().max(160) }),
    pending: z
      .object({
        command_id: z.string().uuid(),
        expected_revision: z.number().int().positive(),
        body: workoutUpdateSchema
      })
      .nullable(),
    saved_at: z.string().datetime()
  })
  .refine(
    value =>
      value.server.id === value.draft.id &&
      value.server.status === 'active' &&
      value.draft.status === 'active',
    'Recovery must describe one active workout'
  )

export type WorkoutRecovery = z.infer<typeof recoverySchema>

export type PendingWorkoutCommand = NonNullable<WorkoutRecovery['pending']>

export type RecoveryStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

export function browserRecoveryStorage(): RecoveryStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function recoveryKey(ownerId: string) {
  return `zillion-gym:active:v1:${ownerId}`
}

export function readRecovery(
  storage: RecoveryStorage | null,
  ownerId: string
): WorkoutRecovery | null {
  try {
    if (!storage) return null

    const raw = storage.getItem(recoveryKey(ownerId))

    if (!raw || raw.length > 2_000_000) return null

    const result = recoverySchema.safeParse(JSON.parse(raw))

    return result.success && result.data.owner_id === ownerId
      ? result.data
      : null
  } catch {
    return null
  }
}

export function writeRecovery(
  storage: RecoveryStorage | null,
  ownerId: string,
  recovery: WorkoutRecovery
): boolean {
  try {
    if (!storage) return false

    const valid = recoverySchema.parse(recovery)

    if (valid.owner_id !== ownerId) return false
    storage.setItem(recoveryKey(ownerId), JSON.stringify(valid))

    return true
  } catch {
    return false
  }
}

export function removeRecovery(
  storage: RecoveryStorage | null,
  ownerId: string
): boolean {
  try {
    if (!storage) return false
    storage.removeItem(recoveryKey(ownerId))

    return true
  } catch {
    return false
  }
}

export function mutableWorkout(workout: Workout): WorkoutUpdate {
  return {
    name: workout.name,
    date: workout.date,
    notes: workout.notes,
    bodyweight_kg: workout.bodyweight_kg,
    current_entry_id: workout.current_entry_id,
    rest_until: workout.rest_until,
    work_timer: workout.work_timer,
    entries: workout.entries.map(entry => ({
      id: entry.id,
      exercise_id: entry.exercise_id,
      superset_group: entry.superset_group,
      target: entry.target,
      sets: entry.sets.map(
        ({
          id,
          weight_kg,
          reps,
          seconds,
          minutes,
          speed_kmh,
          done,
          rir,
          rpe
        }) => ({
          id,
          weight_kg,
          reps,
          seconds,
          minutes,
          speed_kmh,
          done,
          rir,
          rpe
        })
      )
    }))
  }
}

export function commandForDraft(
  draft: Workout,
  revision: number,
  pending: PendingWorkoutCommand | null,
  newId: () => string
): PendingWorkoutCommand {
  // A possibly acknowledged request must be replayed exactly before newer edits.
  return (
    pending ?? {
      command_id: newId(),
      expected_revision: revision,
      body: workoutUpdateSchema.parse(mutableWorkout(draft))
    }
  )
}

export function acknowledgeDraft(
  server: Workout,
  current: Workout,
  command: PendingWorkoutCommand
): Workout {
  return JSON.stringify(mutableWorkout(current)) ===
    JSON.stringify(command.body)
    ? server
    : { ...current, revision: server.revision }
}
