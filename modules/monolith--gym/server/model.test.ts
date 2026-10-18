import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  type Prescription,
  type Workout,
  exerciseInputSchema,
  importInputSchema,
  isoDateSchema,
  prescriptionSchema,
  scheduledRoutine,
  settingsInputSchema,
  toDisplayWeight,
  toKilograms,
  workoutSchema,
  workoutUpdateSchema
} from '../shared'
import {
  checkRevision,
  estimateOneRepMax,
  nextPrescription,
  ownerId,
  trainingStats,
  validatePrescription,
  validateSupersets,
  validateWorkoutDraft
} from './model'

const exerciseId = randomUUID()
const planned = (input: Partial<Prescription> = {}) => ({
  exercise_id: exerciseId,
  prescription: prescriptionSchema.parse(input)
})

function session(
  reps: number[] = [10, 10, 10],
  weight = 100,
  options: {
    target?: Partial<Prescription>
    status?: Workout['status']
    done?: boolean[]
    day?: number
  } = {}
): Workout {
  const day = options.day ?? 1

  return workoutSchema.parse({
    id: randomUUID(),
    routine_id: null,
    name: 'Session',
    date: `2026-10-${String(day).padStart(2, '0')}`,
    status: options.status ?? 'completed',
    started_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    finished_at:
      options.status === 'active'
        ? null
        : `2026-10-${String(day).padStart(2, '0')}T11:00:00.000Z`,
    notes: '',
    bodyweight_kg: null,
    revision: 1,
    current_entry_id: null,
    rest_until: null,
    entries: [
      {
        id: randomUUID(),
        exercise_id: exerciseId,
        position: 0,
        superset_group: null,
        target: prescriptionSchema.parse(options.target ?? {}),
        exercise: exerciseInputSchema.parse({
          name: 'Press',
          muscle_group: 'chest',
          secondary_muscles: ['triceps']
        }),
        suggestion: { policy: 'linear', kind: 'first', reason: 'baseline' },
        sets: reps.map((count, position) => ({
          id: randomUUID(),
          position,
          weight_kg: weight,
          reps: count,
          seconds: count,
          minutes: count,
          speed_kmh: 8,
          done: options.done?.[position] ?? true
        }))
      }
    ]
  })
}

const chest = { muscle_group: 'chest' as const }

describe('Native Gym training semantics', () => {
  it('requires authenticated UUIDs and rejects stale revisions', () => {
    expect(() => ownerId({ locals: {} })).toThrow('Authentication required')
    expect(() => ownerId({ locals: { userId: 'other' } })).toThrow()
    expect(ownerId({ locals: { userId: exerciseId } })).toBe(exerciseId)
    expect(() => checkRevision(2, 1)).toThrow('Reload')
  })
  it('validates civil dates, timezones and explicit replacement confirmation', () => {
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(isoDateSchema.parse('2024-02-29')).toBe('2024-02-29')
    expect(
      settingsInputSchema.safeParse({ timezone: 'arbitrary timezone' }).success
    ).toBe(false)
    expect(
      settingsInputSchema.parse({ timezone: 'America/New_York' }).timezone
    ).toBe('America/New_York')
    const data = {
      format: 'zillion-gym',
      version: 1,
      exported_at: new Date().toISOString(),
      exercises: [],
      routines: [],
      schedule: [],
      workouts: [],
      bodyweight: []
    }
    expect(
      importInputSchema.safeParse({
        command_id: randomUUID(),
        data,
        mode: 'replace'
      }).success
    ).toBe(false)
    expect(
      importInputSchema.parse({ command_id: randomUUID(), data }).mode
    ).toBe('merge')
  })
  it('supports off and baseline without inventing progress', () => {
    expect(nextPrescription([], planned(), chest)).toMatchObject({
      kind: 'first',
      reason: 'baseline'
    })
    expect(
      nextPrescription([session()], planned({ progression: 'off' }), chest)
    ).toMatchObject({ kind: 'off', reason: 'disabled' })
  })
  it('adds canonical kg loads after linear success with muscle and display-unit increments', () => {
    expect(nextPrescription([session()], planned(), chest).weight_kg).toBe(
      102.5
    )
    expect(
      nextPrescription([session()], planned(), { muscle_group: 'quadriceps' })
        .weight_kg
    ).toBe(105)
    expect(
      nextPrescription([session()], planned({ increment: 1 }), chest).weight_kg
    ).toBe(101)
    expect(
      nextPrescription(
        [session([10, 10, 10], toKilograms(100, 'lb'))],
        planned(),
        chest,
        'linear',
        'lb'
      ).weight_kg
    ).toBeCloseTo(toKilograms(105, 'lb'), 3)
  })
  it('holds on incomplete prescriptions and deloads after three consecutive misses', () => {
    const missed = session([10, 10, 10], 100, { done: [true, true, false] })
    expect(nextPrescription([missed], planned(), chest)).toMatchObject({
      kind: 'hold',
      misses: 1,
      weight_kg: 100
    })
    expect(nextPrescription([session([10, 10])], planned(), chest).kind).toBe(
      'hold'
    )
    expect(
      nextPrescription(
        [1, 2, 3].map(day => session([9, 9, 9], 100, { day })),
        planned(),
        chest
      )
    ).toMatchObject({ kind: 'deload', misses: 3, weight_kg: 90 })
  })
  it('resets the miss streak after success and excludes active/discarded sessions', () => {
    const history = [
      session([8, 8, 8], 100, { day: 1 }),
      session([10, 10, 10], 100, { day: 2 }),
      session([8, 8, 8], 102.5, { day: 3 }),
      session([1, 1, 1], 999, { day: 4, status: 'discarded' }),
      session([1, 1, 1], 999, { day: 5, status: 'active' })
    ]
    expect(nextPrescription(history, planned(), chest)).toMatchObject({
      kind: 'hold',
      misses: 1,
      weight_kg: 102.5
    })
  })
  it('uses Greyskull AMRAP double increments and a first-miss deload', () => {
    expect(
      nextPrescription([session([10, 10, 20])], planned(), chest, 'greyskull')
    ).toMatchObject({ kind: 'up', reason: 'amrap-double', weight_kg: 105 })
    expect(
      nextPrescription([session([10, 10, 9])], planned(), chest, 'greyskull')
    ).toMatchObject({ kind: 'deload', misses: 1, weight_kg: 90 })
  })
  it('moves through double progression rep range then adds load and resets reps', () => {
    const entry = planned({ progression: 'double', reps: 12, reps_min: 8 })
    expect(
      nextPrescription(
        [
          session([8, 8, 8], 100, {
            target: { reps: 12, reps_min: 8, progression: 'double' }
          })
        ],
        entry,
        chest
      )
    ).toMatchObject({ kind: 'hold', reps: 9, weight_kg: 100 })
    expect(
      nextPrescription(
        [
          session([12, 12, 12], 100, {
            target: { reps: 12, reps_min: 8, progression: 'double' }
          })
        ],
        entry,
        chest
      )
    ).toMatchObject({ kind: 'up', reps: 8, weight_kg: 102.5 })
  })
  it('progresses bodyweight reps and timed targets without adding fictitious load', () => {
    expect(
      nextPrescription([session([10, 10, 10], 0)], planned(), chest)
    ).toMatchObject({ weight_kg: 0, reps: 11, reason: 'bodyweight-success' })
    expect(
      nextPrescription([session([9, 9, 9], 0)], planned(), chest)
    ).toMatchObject({ weight_kg: 0, reps: 10, kind: 'hold' })
    expect(
      nextPrescription(
        [
          session([50, 50, 50], 0, {
            target: { mode: 'time', seconds: 50, progression: 'time' }
          })
        ],
        planned({ mode: 'time', seconds: 45, progression: 'time' }),
        chest
      )
    ).toMatchObject({ seconds: 55, kind: 'up' })
    expect(
      nextPrescription([], planned({ mode: 'cardio' }), chest).policy
    ).toBe('off')
  })
  it('recomputes next targets from edited history rather than mutable progression counters', () => {
    const logged = session()
    expect(nextPrescription([logged], planned(), chest).kind).toBe('up')
    logged.entries[0]!.sets[2]!.reps = 8
    expect(nextPrescription([logged], planned(), chest)).toMatchObject({
      kind: 'hold',
      weight_kg: 100
    })
  })
  it('limits estimated one-rep maximum to completed 1–12 rep eligible loads', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 12)).toBe(140)
    expect(estimateOneRepMax(100, 13)).toBeNull()
    expect(estimateOneRepMax(0, 10)).toBeNull()
    expect(estimateOneRepMax(100, 2.5)).toBeNull()
    expect(estimateOneRepMax(Infinity, 5)).toBeNull()
    expect(estimateOneRepMax(100, 10, 'brzycki')).toBe(133.3)
    expect(estimateOneRepMax(100, 10, 'lombardi')).toBe(125.9)
  })
  it('derives completed-only heatmap, volume, PR, primary/secondary muscles and RIR/RPE stats', () => {
    const logged = session([10, 13, 10], 100, { done: [true, true, false] })
    logged.entries[0]!.sets[0]!.rir = 2
    logged.entries[0]!.sets[1]!.rpe = 9
    const stats = trainingStats(
      [
        logged,
        session([1], 999, { status: 'active' }),
        session([1], 999, { status: 'discarded' })
      ],
      'epley',
      '2026-10-01'
    )
    expect(stats).toMatchObject({
      workouts: 1,
      completed_sets: 2,
      volume_kg: 2300,
      duration_seconds: 3600,
      streak_weeks: 1
    })
    expect(stats.records).toHaveLength(1)
    expect(stats.records[0]).toMatchObject({ reps: 10, estimate_kg: 133.3 })
    expect(stats.effort).toMatchObject({
      rated_sets: 2,
      average_rir: 1.5,
      hard_sets: 2
    })
    expect(
      stats.muscles.find(item => item.muscle_group === 'chest')
    ).toMatchObject({ sets: 2, hard_sets: 2 })
    expect(
      stats.muscles.find(item => item.muscle_group === 'triceps')
    ).toMatchObject({ sets: 1, hard_sets: 1 })
    expect(stats.heatmap).toEqual([
      { date: '2026-10-01', workouts: 1, sets: 2, volume_kg: 2300 }
    ])
  })
  it('uses date-specific rest overrides and Sunday-based weekday schedules', () => {
    const schedule = [
      { id: randomUUID(), weekday: 1, date: null, routine_id: exerciseId },
      { id: randomUUID(), weekday: null, date: '2026-10-12', routine_id: null }
    ]
    expect(scheduledRoutine(schedule, '2026-10-12')).toBeNull()
    expect(scheduledRoutine(schedule, '2026-10-19')).toBe(exerciseId)
  })
  it('validates adjacent supersets and incompatible logging policies', () => {
    expect(() =>
      validateSupersets([{ superset_group: 'A' }, { superset_group: 'A' }])
    ).not.toThrow()
    expect(() => validateSupersets([{ superset_group: 'A' }])).toThrow(
      'adjacent'
    )
    expect(() =>
      validateSupersets([
        { superset_group: 'A' },
        { superset_group: null },
        { superset_group: 'A' }
      ])
    ).toThrow()
    expect(() =>
      validatePrescription(
        prescriptionSchema.parse({ mode: 'time', progression: 'linear' })
      )
    ).toThrow('logging mode')
    expect(() =>
      validatePrescription(
        prescriptionSchema.parse({
          progression: 'double',
          reps_min: 12,
          reps: 8
        })
      )
    ).toThrow('rep range')
  })
  it('checks timer references and duplicate identities before persisting a session', () => {
    const logged = session([45], 0, {
      target: { mode: 'time', seconds: 45, sets: 1 },
      done: [false],
      status: 'active'
    })
    const entry = logged.entries[0]!,
      set = entry.sets[0]!
    const draft = workoutUpdateSchema.parse({
      ...logged,
      current_entry_id: entry.id,
      work_timer: {
        entry_id: entry.id,
        set_id: set.id,
        started_at: new Date().toISOString(),
        target_seconds: 45
      }
    })
    expect(() => validateWorkoutDraft(draft)).not.toThrow()
    expect(() =>
      validateWorkoutDraft({
        ...draft,
        work_timer: { ...draft.work_timer!, set_id: randomUUID() }
      })
    ).toThrow('unfinished timed set')
    expect(() =>
      validateWorkoutDraft({
        ...draft,
        entries: [{ ...entry, sets: [set, { ...set }] }]
      })
    ).toThrow('identifiers must be unique')
    expect(() =>
      validateWorkoutDraft({
        ...draft,
        entries: [{ ...entry, sets: [{ ...set, done: true, seconds: 0 }] }]
      })
    ).toThrow('positive duration')
  })
  it('round-trips kg/lb display conversions without rewriting native masses', () => {
    expect(toKilograms(toDisplayWeight(72.3, 'lb'), 'lb')).toBeCloseTo(72.3, 10)
    expect(toDisplayWeight(72.3, 'kg')).toBe(72.3)
  })
})
