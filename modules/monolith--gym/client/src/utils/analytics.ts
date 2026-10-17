import dayjs from 'dayjs'

import type {
  ExerciseMode,
  Formula,
  GymStats,
  Settings,
  Workout,
  WorkoutSet
} from '../../../shared'

export type RangePeriod = 'week' | '30' | '90' | '365' | 'all' | 'custom'

export type RangeSelection = {
  period: RangePeriod
  from: string | null
  until: string | null
}

export type AnalyticsRange = {
  from: string | null
  until: string | null
  valid: boolean
}

export type TrendPoint = { date: string; value: number; note?: string }

export type EffortScale = 'rir' | 'rpe'

export type ExerciseMetric =
  | 'estimate_kg'
  | 'best_weight_kg'
  | 'volume_kg'
  | 'longest_seconds'
  | 'total_seconds'
  | 'best_speed_kmh'
  | 'total_minutes'
  | 'distance_km'
  | 'effort'

export const initialRange: RangeSelection = {
  period: '90',
  from: null,
  until: null
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dayjs(value).isValid() &&
    dayjs(value).format('YYYY-MM-DD') === value
  )
}

export function analyticsRange(
  selection: RangeSelection,
  today: string
): AnalyticsRange {
  if (selection.period === 'all')
    return { from: null, until: null, valid: true }

  if (selection.period === 'custom') {
    const { from, until } = selection

    return {
      from,
      until,
      valid:
        (!from || validDate(from)) &&
        (!until || validDate(until)) &&
        (!from || !until || from <= until)
    }
  }

  const from = dayjs(today)
    .subtract(
      selection.period === 'week'
        ? (dayjs(today).day() + 6) % 7
        : Number(selection.period) - 1,
      'day'
    )
    .format('YYYY-MM-DD')

  return { from, until: today, valid: validDate(today) }
}

export function inAnalyticsRange(date: string, range: AnalyticsRange) {
  return (
    range.valid &&
    (!range.from || date >= range.from) &&
    (!range.until || date <= range.until)
  )
}

export function completedInRange(workouts: Workout[], range: AnalyticsRange) {
  return workouts
    .filter(
      workout =>
        workout.status === 'completed' && inAnalyticsRange(workout.date, range)
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.started_at.localeCompare(b.started_at)
    )
}

export function effortRir(set: Pick<WorkoutSet, 'rir' | 'rpe'>) {
  return set.rir ?? (set.rpe === null ? null : 10 - set.rpe)
}

export function effortScale(
  workouts: Workout[],
  preference: Settings['effort']
): EffortScale {
  if (preference !== 'none') return preference
  let rir = 0
  let rpe = 0

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue

    for (const entry of workout.entries) {
      if (entry.target.mode !== 'reps') continue

      for (const set of entry.sets) {
        if (!set.done) continue
        if (set.rir !== null) rir++
        else if (set.rpe !== null) rpe++
      }
    }
  }

  return rpe > rir ? 'rpe' : 'rir'
}

export function displayEffort(rir: number, scale: EffortScale) {
  return Math.round((scale === 'rpe' ? 10 - rir : rir) * 100) / 100
}

export function effortAnalytics(workouts: Workout[]) {
  const histogram = [0, 1, 2, 3, 4].map(rir => ({ rir, sets: 0 }))
  const weeks = new Map<
    string,
    { done: number; rated: number; sum: number; hard: number }
  >()

  let done = 0
  let rated = 0
  let sum = 0
  let hard = 0

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue

    const week = dayjs(workout.date)
      .subtract((dayjs(workout.date).day() + 6) % 7, 'day')
      .format('YYYY-MM-DD')
    const bucket = weeks.get(week) ?? { done: 0, rated: 0, sum: 0, hard: 0 }

    for (const entry of workout.entries) {
      if (entry.target.mode !== 'reps') continue

      for (const set of entry.sets) {
        if (!set.done) continue
        done++
        bucket.done++
        const rir = effortRir(set)

        if (rir === null) continue
        rated++
        sum += rir
        bucket.rated++
        bucket.sum += rir
        histogram[Math.min(4, Math.max(0, Math.floor(rir)))]!.sets++

        if (rir <= 3) {
          hard++
          bucket.hard++
        }
      }
    }
    weeks.set(week, bucket)
  }

  return {
    done,
    rated,
    hard,
    average_rir: rated >= 5 ? sum / rated : null,
    hard_fraction: rated >= 5 ? hard / rated : null,
    histogram,
    weeks: [...weeks.entries()]
      .filter(([, bucket]) => bucket.rated >= 2)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        done: bucket.done,
        rated: bucket.rated,
        average_rir: bucket.sum / bucket.rated,
        hard: bucket.hard
      }))
  }
}

export function rangeTotals(workouts: Workout[]) {
  let sets = 0
  let volume = 0
  let duration = 0

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue
    if (workout.finished_at)
      duration += Math.max(
        0,
        dayjs(workout.finished_at).diff(dayjs(workout.started_at), 'second')
      )

    for (const entry of workout.entries)
      for (const set of entry.sets) {
        if (!set.done) continue
        sets++
        if (entry.target.mode === 'reps') volume += set.weight_kg * set.reps
      }
  }

  return {
    workouts: workouts.filter(workout => workout.status === 'completed').length,
    sets,
    volume,
    duration
  }
}

export function muscleAnalytics(workouts: Workout[]): GymStats['muscles'] {
  const muscles = new Map<
    GymStats['muscles'][number]['muscle_group'],
    { sets: number; hard_sets: number }
  >()

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue

    for (const entry of workout.entries) {
      const groups = [
        entry.exercise.muscle_group,
        ...new Set(
          entry.exercise.secondary_muscles.filter(
            group => group !== entry.exercise.muscle_group
          )
        )
      ]

      for (const set of entry.sets) {
        if (!set.done) continue

        const rir = entry.target.mode === 'reps' ? effortRir(set) : null

        for (const group of groups) {
          const cell = muscles.get(group) ?? { sets: 0, hard_sets: 0 }
          const factor = group === entry.exercise.muscle_group ? 1 : 0.5
          cell.sets += factor
          if (rir !== null && rir <= 3) cell.hard_sets += factor
          muscles.set(group, cell)
        }
      }
    }
  }

  return [...muscles.entries()].map(([muscle_group, counts]) => ({
    muscle_group,
    ...counts
  }))
}

export function estimateStrength(
  weight: number,
  reps: number,
  formula: Formula
) {
  if (weight <= 0 || reps < 1 || reps > 12) return null
  if (reps === 1) return weight

  return formula === 'epley'
    ? weight * (1 + reps / 30)
    : formula === 'brzycki'
      ? (weight * 36) / (37 - reps)
      : weight * reps ** 0.1
}

export function exerciseAnalytics(
  workouts: Workout[],
  exerciseId: string,
  formula: Formula
) {
  const completed = workouts
    .filter(workout => workout.status === 'completed')
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.started_at.localeCompare(b.started_at)
    )
  const allEntries = completed.flatMap(workout =>
    workout.entries.filter(
      entry =>
        entry.exercise_id === exerciseId && entry.sets.some(set => set.done)
    )
  )
  const latest = allEntries[allEntries.length - 1]
  const mode: ExerciseMode = latest?.target.mode ?? 'reps'
  const sessions = completed.flatMap(workout => {
    const entries = workout.entries.filter(
      entry => entry.exercise_id === exerciseId && entry.target.mode === mode
    )
    const sets = entries.flatMap(entry => entry.sets.filter(set => set.done))

    if (!sets.length) return []

    const estimates =
      mode === 'reps'
        ? sets.flatMap(set => {
            const value = estimateStrength(set.weight_kg, set.reps, formula)

            return value === null ? [] : [value]
          })
        : []
    const ratings =
      mode === 'reps'
        ? sets.flatMap(set => {
            const value = effortRir(set)

            return value === null ? [] : [value]
          })
        : []

    return [
      {
        date: workout.date,
        workout_id: workout.id,
        sets: sets.length,
        best_weight_kg: Math.max(0, ...sets.map(set => set.weight_kg)),
        volume_kg:
          mode === 'reps'
            ? sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0)
            : 0,
        estimate_kg: estimates.length ? Math.max(...estimates) : null,
        longest_seconds: Math.max(0, ...sets.map(set => set.seconds)),
        total_seconds: sets.reduce((sum, set) => sum + set.seconds, 0),
        best_speed_kmh: Math.max(0, ...sets.map(set => set.speed_kmh)),
        total_minutes: sets.reduce((sum, set) => sum + set.minutes, 0),
        distance_km: sets.reduce(
          (sum, set) => sum + (set.speed_kmh * set.minutes) / 60,
          0
        ),
        effort: ratings.length
          ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
          : null,
        rated: ratings.length
      }
    ]
  })

  return {
    mode,
    sessions,
    name: latest?.exercise.name ?? '',
    changedMode: allEntries.some(entry => entry.target.mode !== mode)
  }
}

export function exerciseMetrics(mode: ExerciseMode): ExerciseMetric[] {
  return mode === 'cardio'
    ? ['best_speed_kmh', 'total_minutes', 'distance_km']
    : mode === 'time'
      ? ['longest_seconds', 'total_seconds', 'best_weight_kg']
      : ['best_weight_kg', 'estimate_kg', 'volume_kg', 'effort']
}

export function chartLayout(
  points: TrendPoint[],
  domain?: [number, number],
  invert = false
) {
  const sorted = points
    .filter(point => Number.isFinite(point.value) && validDate(point.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const values = sorted.map(point => point.value)
  const min = domain?.[0] ?? Math.min(...values, 0)
  const max = domain?.[1] ?? Math.max(...values, 1)
  const valueSpan = max > min ? max - min : 1
  const first = sorted[0]?.date
  const last = sorted[sorted.length - 1]?.date
  const span = first && last ? dayjs(last).diff(dayjs(first), 'day') : 0

  return {
    min,
    max,
    points: sorted.map(point => ({
      ...point,
      x:
        span && first
          ? 60 + (dayjs(point.date).diff(dayjs(first), 'day') / span) * 500
          : 310,
      y: invert
        ? 20 + ((point.value - min) / valueSpan) * 130
        : 150 - ((point.value - min) / valueSpan) * 130
    }))
  }
}

export function trendPresentation(
  points: TrendPoint[],
  domain?: [number, number]
) {
  const layout = chartLayout(points, domain)
  const first = layout.points[0]
  const last = layout.points[layout.points.length - 1]

  return {
    domain: [layout.min, layout.max] as [number, number],
    points: layout.points.map(point => ({
      label: point.date,
      value: point.value,
      position: point.x,
      detail: point.note
    })),
    summary:
      first && last
        ? {
            count: layout.points.length,
            first,
            last,
            best: Math.max(...layout.points.map(point => point.value))
          }
        : null
  }
}
