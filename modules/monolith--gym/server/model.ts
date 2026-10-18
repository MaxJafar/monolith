import dayjs from 'dayjs'

import { ClientError } from '@monolith/server-utils'

import {
  type Exercise,
  type Formula,
  type GymStats,
  type Prescription,
  type Progression,
  type RoutineEntry,
  type Suggestion,
  type Unit,
  type Workout,
  type WorkoutEntry,
  type WorkoutUpdate,
  muscleGroupSchema,
  toKilograms
} from '../shared'

export function ownerId(res: { locals: Record<string, unknown> }): string {
  const id = res.locals.userId

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ClientError('Authentication required', 401)

  return id
}

export function checkRevision(actual: number, expected: number) {
  if (actual !== expected)
    throw new ClientError(
      'This item changed elsewhere. Reload before saving.',
      409
    )
}

export function validatePrescription(
  target: Prescription,
  routinePolicy: Progression = 'linear'
) {
  const policy = target.progression ?? routinePolicy
  const allowed =
    target.mode === 'reps'
      ? ['off', 'linear', 'greyskull', 'double']
      : target.mode === 'time'
        ? ['off', 'time']
        : ['off']

  if (target.progression && !allowed.includes(target.progression))
    throw new ClientError('Progression policy does not match the logging mode')
  if (
    target.mode === 'reps' &&
    policy === 'double' &&
    target.reps_min > target.reps
  )
    throw new ClientError('Minimum reps cannot exceed the top of the rep range')
  if (target.mode === 'time' && target.seconds <= 0)
    throw new ClientError('Timed exercises need a positive duration')
  if (target.mode === 'cardio' && target.minutes <= 0)
    throw new ClientError('Cardio exercises need a positive duration')
}

export function validateSupersets(
  entries: { superset_group: string | null }[]
) {
  const groups = new Map<string, number[]>()
  entries.forEach((entry, index) => {
    if (entry.superset_group)
      groups.set(entry.superset_group, [
        ...(groups.get(entry.superset_group) ?? []),
        index
      ])
  })
  for (const positions of groups.values())
    if (
      positions.length < 2 ||
      positions.some((position, index) => position !== positions[0]! + index)
    )
      throw new ClientError(
        'A superset must contain at least two adjacent exercises'
      )
}

export function validateWorkoutDraft(input: WorkoutUpdate) {
  const ids = input.entries.flatMap(entry => [
    entry.id,
    ...entry.sets.map(set => set.id)
  ])

  if (new Set(ids).size !== ids.length)
    throw new ClientError('Workout entry and set identifiers must be unique')
  if (ids.length > 5000)
    throw new ClientError('A workout supports at most 5000 entries and sets')
  if (
    input.current_entry_id &&
    !input.entries.some(entry => entry.id === input.current_entry_id)
  )
    throw new ClientError('Current exercise does not belong to this workout')
  validateSupersets(input.entries)

  for (const entry of input.entries) {
    validatePrescription(entry.target)

    for (const set of entry.sets) {
      if (!set.done) continue
      if (entry.target.mode === 'reps' && set.reps <= 0)
        throw new ClientError('Completed rep sets need a positive rep count')
      if (entry.target.mode === 'time' && set.seconds <= 0)
        throw new ClientError('Completed timed sets need a positive duration')
      if (entry.target.mode === 'cardio' && set.minutes <= 0)
        throw new ClientError('Completed cardio sets need a positive duration')
      if (
        entry.target.mode !== 'reps' &&
        (set.rir !== null || set.rpe !== null)
      )
        throw new ClientError('Effort ratings only apply to rep sets')
    }
  }

  if (input.work_timer) {
    const timer = input.work_timer
    const entry = input.entries.find(entry => entry.id === timer.entry_id)
    const set = entry?.sets.find(set => set.id === timer.set_id)

    if (!entry || entry.target.mode !== 'time' || !set || set.done)
      throw new ClientError(
        'Work timer must reference an unfinished timed set in this workout'
      )
    if (Date.parse(timer.started_at) > Date.now() + 5000)
      throw new ClientError('Work timer cannot start in the future')
  }
}

export function estimateOneRepMax(
  weight: number,
  reps: number,
  formula: Formula = 'epley'
): number | null {
  if (
    !Number.isFinite(weight) ||
    !Number.isInteger(reps) ||
    weight <= 0 ||
    reps < 1 ||
    reps > 12
  )
    return null

  const value =
    reps === 1
      ? weight
      : formula === 'brzycki'
        ? (weight * 36) / (37 - reps)
        : formula === 'lombardi'
          ? weight * Math.pow(reps, 0.1)
          : weight * (1 + reps / 30)

  return Math.round(value * 10) / 10
}

function sessionResult(entry: WorkoutEntry) {
  const results = entry.sets.map(set =>
    set.done ? (entry.target.mode === 'time' ? set.seconds : set.reps) : 0
  )
  const goal =
    entry.target.mode === 'time' ? entry.target.seconds : entry.target.reps

  return {
    goal,
    minimum: Math.min(...results),
    final: results.at(-1) ?? 0,
    weight: Math.max(
      0,
      ...entry.sets.filter(set => set.done).map(set => set.weight_kg)
    ),
    success:
      results.length >= entry.target.sets &&
      goal > 0 &&
      results.every(value => value >= goal)
  }
}

export function nextPrescription(
  history: Workout[],
  entry: Pick<RoutineEntry, 'exercise_id' | 'prescription'>,
  exercise: Pick<Exercise, 'muscle_group'>,
  routinePolicy: Progression = 'linear',
  unit: Unit = 'kg'
): Suggestion {
  const target = entry.prescription
  const candidate = target.progression ?? routinePolicy
  const allowed =
    target.mode === 'reps'
      ? ['off', 'linear', 'greyskull', 'double']
      : target.mode === 'time'
        ? ['off', 'time']
        : ['off']
  const policy: Progression = allowed.includes(candidate) ? candidate : 'off'
  const base = { policy, misses: 0 }

  if (policy === 'off') return { ...base, kind: 'off', reason: 'disabled' }

  const sessions = history
    .filter(workout => workout.status === 'completed')
    .sort(
      (a, b) =>
        a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id)
    )
    .flatMap(workout =>
      workout.entries
        .filter(
          value =>
            value.exercise_id === entry.exercise_id &&
            value.target.mode === target.mode &&
            value.sets.some(set => set.done)
        )
        .map(sessionResult)
    )
  const last = sessions.at(-1)

  if (!last) return { ...base, kind: 'first', reason: 'baseline' }
  let misses = 0
  for (
    let index = sessions.length - 1;
    index >= 0 && !sessions[index]!.success;
    index--
  )
    misses++

  const heavy = [
    'back',
    'quadriceps',
    'hamstrings',
    'glutes',
    'calves'
  ].includes(exercise.muscle_group)
  const increment =
    target.increment ??
    (target.mode === 'time'
      ? 5
      : toKilograms(unit === 'lb' ? (heavy ? 10 : 5) : heavy ? 5 : 2.5, unit))
  const snap = (value: number, step: number) =>
    Math.round(Math.round(value / step) * step * 10000) / 10000
  const reduce = (value: number, step: number) =>
    Math.max(step, Math.min(snap(value * 0.9, step), snap(value - step, step)))
  const stalled = misses >= (policy === 'greyskull' ? 1 : 3)

  if (target.mode === 'time') {
    const seconds = last.goal || target.seconds

    return last.success
      ? { ...base, kind: 'up', reason: 'success', seconds: seconds + increment }
      : stalled
        ? {
            ...base,
            misses,
            kind: 'deload',
            reason: 'stalled',
            seconds: reduce(seconds, 5)
          }
        : { ...base, misses, kind: 'hold', reason: 'miss', seconds }
  }
  if (last.weight === 0)
    return last.success
      ? {
          ...base,
          kind: 'up',
          reason: 'bodyweight-success',
          weight_kg: 0,
          reps: last.goal + 1
        }
      : {
          ...base,
          misses,
          kind: 'hold',
          reason: 'bodyweight-hold',
          weight_kg: 0,
          reps: last.goal || target.reps
        }

  if (policy === 'double') {
    const floor = Math.min(target.reps_min, target.reps)

    return last.success
      ? {
          ...base,
          kind: 'up',
          reason: 'success',
          weight_kg: snap(last.weight + increment, increment),
          reps: floor
        }
      : stalled
        ? {
            ...base,
            misses,
            kind: 'deload',
            reason: 'stalled',
            weight_kg: reduce(last.weight, increment),
            reps: floor
          }
        : {
            ...base,
            misses,
            kind: 'hold',
            reason: 'rep-range',
            weight_kg: last.weight,
            reps: Math.min(target.reps, Math.max(floor, last.minimum + 1))
          }
  }

  const doubleJump = policy === 'greyskull' && last.final >= last.goal * 2

  return last.success
    ? {
        ...base,
        kind: 'up',
        reason: doubleJump ? 'amrap-double' : 'success',
        weight_kg: snap(
          last.weight + increment * (doubleJump ? 2 : 1),
          increment
        )
      }
    : stalled
      ? {
          ...base,
          misses,
          kind: 'deload',
          reason: 'stalled',
          weight_kg: reduce(last.weight, increment)
        }
      : {
          ...base,
          misses,
          kind: 'hold',
          reason: 'miss',
          weight_kg: last.weight
        }
}

export function trainingStats(
  workouts: Workout[],
  formula: Formula = 'epley',
  today = dayjs().format('YYYY-MM-DD')
): GymStats {
  const history = workouts.filter(workout => workout.status === 'completed')
  const result: GymStats = {
    workouts: history.length,
    completed_sets: 0,
    volume_kg: 0,
    duration_seconds: 0,
    streak_weeks: 0,
    heatmap: [],
    muscles: muscleGroupSchema.options.map(muscle_group => ({
      muscle_group,
      sets: 0,
      hard_sets: 0
    })),
    effort: { rated_sets: 0, average_rir: null, hard_sets: 0, histogram: [] },
    records: [],
    exercise_trends: []
  }
  const days = new Map<string, GymStats['heatmap'][number]>()
  const best = new Map<string, GymStats['records'][number]>()
  const ratings: number[] = []
  const weekOf = (date: string) =>
    dayjs(date)
      .subtract((dayjs(date).day() + 6) % 7, 'day')
      .format('YYYY-MM-DD')
  const weeks = new Set(history.map(workout => weekOf(workout.date)))

  for (let index = 0; index < 520; index++) {
    const week = weekOf(
      dayjs(today)
        .subtract(index * 7, 'day')
        .format('YYYY-MM-DD')
    )

    if (weeks.has(week)) result.streak_weeks++
    else if (index > 0) break
  }

  for (const workout of history) {
    const day = days.get(workout.date) ?? {
      date: workout.date,
      workouts: 0,
      sets: 0,
      volume_kg: 0
    }
    day.workouts++
    if (workout.finished_at)
      result.duration_seconds += Math.max(
        0,
        (Date.parse(workout.finished_at) - Date.parse(workout.started_at)) /
          1000
      )

    for (const entry of workout.entries) {
      let volume = 0,
        load = 0,
        estimate: number | null = null

      for (const set of entry.sets.filter(set => set.done)) {
        day.sets++
        result.completed_sets++
        const amount =
          entry.target.mode === 'reps' ? set.weight_kg * set.reps : 0
        volume += amount
        day.volume_kg += amount
        result.volume_kg += amount
        load = Math.max(load, set.weight_kg)
        const rir =
          entry.target.mode === 'reps'
            ? (set.rir ?? (set.rpe === null ? null : 10 - set.rpe))
            : null

        if (rir !== null) ratings.push(rir)

        const hard = rir !== null && rir <= 3

        if (hard) result.effort.hard_sets++

        for (const muscle of [
          entry.exercise.muscle_group,
          ...new Set(
            entry.exercise.secondary_muscles.filter(
              group => group !== entry.exercise.muscle_group
            )
          )
        ]) {
          const cell = result.muscles.find(
            value => value.muscle_group === muscle
          )

          if (cell) {
            const factor = muscle === entry.exercise.muscle_group ? 1 : 0.5
            cell.sets += factor
            if (hard) cell.hard_sets += factor
          }
        }

        const current =
          entry.target.mode === 'reps'
            ? estimateOneRepMax(set.weight_kg, set.reps, formula)
            : null

        if (current !== null) {
          estimate = Math.max(estimate ?? 0, current)
          if (current > (best.get(entry.exercise_id)?.estimate_kg ?? 0))
            best.set(entry.exercise_id, {
              exercise_id: entry.exercise_id,
              name: entry.exercise.name,
              estimate_kg: current,
              weight_kg: set.weight_kg,
              reps: set.reps,
              date: workout.date,
              workout_id: workout.id
            })
        }
      }
      result.exercise_trends.push({
        exercise_id: entry.exercise_id,
        date: workout.date,
        workout_id: workout.id,
        volume_kg: volume,
        best_weight_kg: load,
        estimate_kg: estimate
      })
    }
    days.set(workout.date, day)
  }
  result.heatmap = [...days.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  result.records = [...best.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  result.exercise_trends.sort((a, b) => a.date.localeCompare(b.date))
  result.effort.rated_sets = ratings.length
  result.effort.average_rir = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : null
  result.effort.histogram = Array.from({ length: 11 }, (_, rir) => ({
    rir,
    sets: ratings.filter(value => Math.round(value) === rir).length
  }))

  return result
}
