import dayjs from 'dayjs'
import z from 'zod'

export const unitSchema = z.enum(['kg', 'lb'])

export const exerciseModeSchema = z.enum(['reps', 'time', 'cardio'])

export const progressionSchema = z.enum([
  'off',
  'linear',
  'greyskull',
  'double',
  'time'
])

export const muscleGroupSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'cardio',
  'full-body'
])

export const formulaSchema = z.enum(['epley', 'brzycki', 'lombardi'])

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    value =>
      dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value,
    'Use a valid YYYY-MM-DD date'
  )

const name = z.string().trim().min(1).max(160)
const load = z.number().finite().min(0).max(10000)
const duration = z.number().finite().min(0).max(86400)
const timezone = z
  .string()
  .min(1)
  .max(100)
  .refine(value => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value })

      return true
    } catch {
      return false
    }
  }, 'Choose a valid timezone')

export const exerciseInputSchema = z.object({
  name,
  mode: exerciseModeSchema.default('reps'),
  muscle_group: muscleGroupSchema,
  secondary_muscles: z.array(muscleGroupSchema).max(12).default([]),
  equipment: z.string().trim().max(100).default(''),
  instructions: z.string().max(10000).default('')
})

export const exerciseSchema = exerciseInputSchema.extend({
  id: z.string().uuid(),
  custom: z.boolean(),
  archived: z.boolean(),
  catalog_key: z.string().nullable(),
  revision: z.number().int().positive()
})

export const prescriptionSchema = z.object({
  mode: exerciseModeSchema.default('reps'),
  sets: z.number().int().min(1).max(50).default(3),
  reps: z.number().int().min(1).max(1000).default(10),
  reps_min: z.number().int().min(1).max(1000).default(8),
  weight_kg: load.default(0),
  seconds: duration.default(45),
  minutes: z.number().finite().min(0).max(1440).default(20),
  speed_kmh: z.number().finite().min(0).max(200).default(8),
  rest_seconds: z.number().int().min(0).max(3600).default(90),
  progression: progressionSchema.nullable().default(null),
  increment: z.number().finite().positive().max(1000).nullable().default(null)
})

export const routineEntryInputSchema = z.object({
  id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  superset_group: z.string().trim().min(1).max(100).nullable().default(null),
  prescription: prescriptionSchema
})

export const routineEntrySchema = routineEntryInputSchema.extend({
  position: z.number().int().nonnegative()
})

export const routineInputSchema = z.object({
  name,
  notes: z.string().max(10000).default(''),
  progression: progressionSchema.default('linear'),
  entries: z.array(routineEntryInputSchema).max(100).default([])
})

export const routineSchema = routineInputSchema.extend({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  archived: z.boolean(),
  entries: z.array(routineEntrySchema)
})

export const scheduleInputSchema = z
  .object({
    weekday: z.number().int().min(0).max(6).nullable().default(null),
    date: isoDateSchema.nullable().default(null),
    routine_id: z.string().uuid().nullable().default(null)
  })
  .refine(
    value => (value.weekday !== null) !== (value.date !== null),
    'Choose a weekday or a specific date'
  )

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  weekday: z.number().int().min(0).max(6).nullable(),
  date: isoDateSchema.nullable(),
  routine_id: z.string().uuid().nullable()
})

export const settingsInputSchema = z.object({
  unit: unitSchema.default('kg'),
  rest_seconds: z.number().int().min(0).max(3600).default(90),
  effort: z.enum(['none', 'rir', 'rpe']).default('none'),
  sound: z.boolean().default(true),
  keep_awake: z.boolean().default(true),
  body_style: z.enum(['male', 'female']).default('male'),
  target_weight_kg: z
    .number()
    .finite()
    .positive()
    .max(1000)
    .nullable()
    .default(null),
  weekly_workout_goal: z.number().int().min(0).max(14).default(3),
  formula: formulaSchema.default('epley'),
  reminder_enabled: z.boolean().default(false),
  reminder_time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .default('08:00'),
  timezone: timezone.default('UTC')
})

export const settingsSchema = settingsInputSchema.extend({
  revision: z.number().int().positive()
})

export const bodyweightInputSchema = z.object({
  date: isoDateSchema,
  weight_kg: z.number().finite().positive().max(1000),
  notes: z.string().max(1000).default('')
})

export const bodyweightSchema = bodyweightInputSchema.extend({
  id: z.string().uuid()
})

export const setInputSchema = z
  .object({
    id: z.string().uuid(),
    weight_kg: load.default(0),
    reps: z.number().int().min(0).max(1000).default(0),
    seconds: duration.default(0),
    minutes: z.number().finite().min(0).max(1440).default(0),
    speed_kmh: z.number().finite().min(0).max(200).default(0),
    done: z.boolean().default(false),
    rir: z.number().min(0).max(10).nullable().default(null),
    rpe: z.number().min(0).max(10).nullable().default(null)
  })
  .refine(
    value => value.rir === null || value.rpe === null,
    'Log RIR or RPE, not both'
  )

export const setSchema = setInputSchema.safeExtend({
  position: z.number().int().nonnegative()
})

export const suggestionSchema = z.object({
  policy: progressionSchema,
  kind: z.enum(['off', 'first', 'up', 'hold', 'deload']),
  reason: z.enum([
    'disabled',
    'baseline',
    'success',
    'bodyweight-success',
    'bodyweight-hold',
    'amrap-double',
    'miss',
    'stalled',
    'rep-range'
  ]),
  weight_kg: load.optional(),
  reps: z.number().int().positive().optional(),
  seconds: duration.optional(),
  misses: z.number().int().nonnegative().default(0)
})

export const workoutEntryInputSchema = z.object({
  id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  superset_group: z.string().trim().min(1).max(100).nullable().default(null),
  target: prescriptionSchema,
  sets: z.array(setInputSchema).min(1).max(100)
})

export const workoutEntrySchema = workoutEntryInputSchema.extend({
  position: z.number().int().nonnegative(),
  exercise: exerciseInputSchema,
  suggestion: suggestionSchema,
  sets: z.array(setSchema)
})

export const workTimerSchema = z.object({
  entry_id: z.string().uuid(),
  set_id: z.string().uuid(),
  started_at: z.string().datetime(),
  target_seconds: z.number().int().positive().max(86400)
})

export const workoutSchema = z.object({
  id: z.string().uuid(),
  routine_id: z.string().uuid().nullable(),
  name,
  date: isoDateSchema,
  status: z.enum(['active', 'completed', 'discarded']),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().nullable(),
  notes: z.string(),
  bodyweight_kg: z.number().finite().positive().nullable(),
  revision: z.number().int().positive(),
  current_entry_id: z.string().uuid().nullable(),
  rest_until: z.string().datetime().nullable(),
  work_timer: workTimerSchema.nullable().default(null),
  entries: z.array(workoutEntrySchema)
})

export const workoutUpdateSchema = z.object({
  name,
  date: isoDateSchema,
  notes: z.string().max(10000).default(''),
  bodyweight_kg: z
    .number()
    .finite()
    .positive()
    .max(1000)
    .nullable()
    .default(null),
  current_entry_id: z.string().uuid().nullable().default(null),
  rest_until: z.string().datetime().nullable().default(null),
  work_timer: workTimerSchema.nullable().default(null),
  entries: z.array(workoutEntryInputSchema).max(100)
})

export const statsSchema = z.object({
  workouts: z.number().int().nonnegative(),
  completed_sets: z.number().int().nonnegative(),
  volume_kg: z.number().nonnegative(),
  duration_seconds: z.number().nonnegative(),
  streak_weeks: z.number().int().nonnegative(),
  heatmap: z.array(
    z.object({
      date: isoDateSchema,
      workouts: z.number().int().positive(),
      sets: z.number().int().nonnegative(),
      volume_kg: z.number().nonnegative()
    })
  ),
  muscles: z.array(
    z.object({
      muscle_group: muscleGroupSchema,
      sets: z.number().nonnegative(),
      hard_sets: z.number().nonnegative()
    })
  ),
  effort: z.object({
    rated_sets: z.number().int().nonnegative(),
    average_rir: z.number().nullable(),
    hard_sets: z.number().int().nonnegative(),
    histogram: z.array(
      z.object({ rir: z.number(), sets: z.number().int().nonnegative() })
    )
  }),
  records: z.array(
    z.object({
      exercise_id: z.string().uuid(),
      name: z.string(),
      estimate_kg: z.number().positive(),
      weight_kg: z.number().positive(),
      reps: z.number().int().positive(),
      date: isoDateSchema,
      workout_id: z.string().uuid()
    })
  ),
  exercise_trends: z.array(
    z.object({
      exercise_id: z.string().uuid(),
      date: isoDateSchema,
      workout_id: z.string().uuid(),
      volume_kg: z.number().nonnegative(),
      best_weight_kg: z.number().nonnegative(),
      estimate_kg: z.number().nullable()
    })
  )
})

export const snapshotSchema = z.object({
  exercises: z.array(exerciseSchema),
  routines: z.array(routineSchema),
  schedule: z.array(scheduleSchema),
  workouts: z.array(workoutSchema),
  active: workoutSchema.nullable(),
  bodyweight: z.array(bodyweightSchema),
  settings: settingsSchema,
  stats: statsSchema
})

export const backupSchema = z.object({
  format: z.literal('zillion-gym'),
  version: z.literal(1),
  exported_at: z.string().datetime(),
  exercises: z.array(exerciseSchema).max(5000),
  routines: z.array(routineSchema).max(1000),
  schedule: z.array(scheduleSchema).max(5000),
  workouts: z.array(workoutSchema).max(10000),
  bodyweight: z.array(bodyweightSchema).max(10000),
  settings: settingsSchema.optional()
})

export const commandSchema = z.object({
  command_id: z.string().uuid(),
  expected_revision: z.number().int().positive()
})

export const importInputSchema = z
  .object({
    command_id: z.string().uuid(),
    data: backupSchema,
    include_schedule: z.boolean().default(false),
    include_settings: z.boolean().default(false),
    mode: z.enum(['merge', 'replace']).default('merge'),
    confirmation: z.literal('REPLACE GYM').optional()
  })
  .refine(
    value => value.mode !== 'replace' || value.confirmation === 'REPLACE GYM',
    'Replacing Gym data requires the exact confirmation REPLACE GYM'
  )

export const importSummarySchema = z.object({
  exercises: z.number().int().nonnegative(),
  routines: z.number().int().nonnegative(),
  workouts: z.number().int().nonnegative(),
  bodyweight: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative()
})

export type Unit = z.infer<typeof unitSchema>

export type ExerciseMode = z.infer<typeof exerciseModeSchema>

export type Progression = z.infer<typeof progressionSchema>

export type MuscleGroup = z.infer<typeof muscleGroupSchema>

export type Formula = z.infer<typeof formulaSchema>

export type Exercise = z.infer<typeof exerciseSchema>

export type Prescription = z.infer<typeof prescriptionSchema>

export type RoutineEntry = z.infer<typeof routineEntrySchema>

export type Routine = z.infer<typeof routineSchema>

export type ScheduleItem = z.infer<typeof scheduleSchema>

export type Settings = z.infer<typeof settingsSchema>

export type Bodyweight = z.infer<typeof bodyweightSchema>

export type WorkoutSet = z.infer<typeof setSchema>

export type WorkoutEntry = z.infer<typeof workoutEntrySchema>

export type Workout = z.infer<typeof workoutSchema>

export type Suggestion = z.infer<typeof suggestionSchema>

export type GymStats = z.infer<typeof statsSchema>

export type GymSnapshot = z.infer<typeof snapshotSchema>

export type GymBackup = z.infer<typeof backupSchema>

export type WorkoutUpdate = z.infer<typeof workoutUpdateSchema>

export type RoutineInput = z.infer<typeof routineInputSchema>

export type ImportSummary = z.infer<typeof importSummarySchema>

export type WorkTimer = z.infer<typeof workTimerSchema>

export function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg * 2.20462262185 : kg
}

export function toKilograms(value: number, unit: Unit): number {
  return unit === 'lb' ? value / 2.20462262185 : value
}

export function scheduledRoutine(
  schedule: ScheduleItem[],
  date: string
): string | null {
  const override = schedule.find(item => item.date === date)

  return override
    ? override.routine_id
    : (schedule.find(item => item.weekday === dayjs(date).day())?.routine_id ??
        null)
}
