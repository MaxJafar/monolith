import { describe, expect, it } from 'vitest'

import {
  type ExerciseMode,
  type Workout,
  type WorkoutSet,
  workoutSchema
} from '../../../shared'
import {
  analyticsRange,
  chartLayout,
  completedInRange,
  displayEffort,
  effortAnalytics,
  effortRir,
  effortScale,
  estimateStrength,
  exerciseAnalytics,
  exerciseMetrics,
  inAnalyticsRange,
  muscleAnalytics,
  rangeTotals,
  trendPresentation
} from './analytics'

const exerciseId = '00000000-0000-4000-8000-000000000001'
const uuid = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`

function workout(
  date: string,
  sets: Partial<WorkoutSet>[],
  mode: ExerciseMode = 'reps',
  status: Workout['status'] = 'completed'
): Workout {
  return workoutSchema.parse({
    id: uuid(2),
    routine_id: null,
    name: 'Training',
    date,
    status,
    started_at: `${date}T10:00:00Z`,
    finished_at: `${date}T11:00:00Z`,
    notes: '',
    bodyweight_kg: null,
    revision: 1,
    current_entry_id: null,
    rest_until: null,
    entries: [
      {
        id: uuid(3),
        exercise_id: exerciseId,
        position: 0,
        target: { mode },
        exercise: {
          name: 'Exercise',
          mode,
          muscle_group: 'chest',
          secondary_muscles: ['triceps', 'chest', 'triceps']
        },
        suggestion: { policy: 'off', kind: 'off', reason: 'disabled' },
        sets: sets.map((set, position) => ({
          id: uuid(position + 10),
          position,
          done: true,
          ...set
        }))
      }
    ]
  })
}

describe('civil date analytics ranges', () => {
  it('includes exactly 30 civil days through today, including a DST transition', () => {
    const range = analyticsRange(
      { period: '30', from: null, until: null },
      '2026-11-02'
    )
    expect(range).toEqual({
      from: '2026-10-04',
      until: '2026-11-02',
      valid: true
    })
    expect(inAnalyticsRange('2026-10-04', range)).toBe(true)
    expect(inAnalyticsRange('2026-11-02', range)).toBe(true)
    expect(inAnalyticsRange('2026-10-03', range)).toBe(false)
    expect(inAnalyticsRange('2026-11-03', range)).toBe(false)
  })
  it('starts the current week on Monday even across a year boundary', () => {
    expect(
      analyticsRange({ period: 'week', from: null, until: null }, '2027-01-03')
        .from
    ).toBe('2026-12-28')
  })
  it('supports open-ended and all-time ranges and rejects invalid or reversed custom dates', () => {
    expect(
      inAnalyticsRange(
        '2099-01-01',
        analyticsRange({ period: 'all', from: null, until: null }, '2026-10-12')
      )
    ).toBe(true)
    expect(
      analyticsRange(
        { period: 'custom', from: '2026-02-30', until: null },
        '2026-10-12'
      ).valid
    ).toBe(false)
    expect(
      analyticsRange(
        { period: 'custom', from: '2026-11-02', until: '2026-10-31' },
        '2026-10-12'
      ).valid
    ).toBe(false)
    const open = analyticsRange(
      { period: 'custom', from: null, until: '2026-10-31' },
      '2026-10-12'
    )
    expect(inAnalyticsRange('2026-10-31', open)).toBe(true)
    expect(inAnalyticsRange('2026-11-01', open)).toBe(false)
  })
  it('excludes active/discarded sessions and sorts without mutating input', () => {
    const inputs = [
      workout('2026-10-12', [{}]),
      workout('2026-10-11', [{}], 'reps', 'active'),
      workout('2026-10-10', [{}], 'reps', 'discarded'),
      workout('2026-10-09', [{}])
    ]
    expect(
      completedInRange(inputs, {
        from: '2026-10-09',
        until: '2026-10-12',
        valid: true
      }).map(item => item.date)
    ).toEqual(['2026-10-09', '2026-10-12'])
    expect(inputs[0]!.date).toBe('2026-10-12')
  })
})

describe('mixed effort analytics', () => {
  it('preserves zero ratings, keeps missing ratings absent and normalizes RPE only for display', () => {
    expect(effortRir({ rir: 0, rpe: null })).toBe(0)
    expect(effortRir({ rir: null, rpe: null })).toBeNull()
    expect(effortRir({ rir: null, rpe: 8.5 })).toBe(1.5)
    const input = workout('2026-10-12', [
      { rir: 0 },
      { rpe: 8 },
      { rir: 4 },
      { rir: 10 },
      { rpe: 7 },
      {}
    ])
    const stats = effortAnalytics([input])
    expect(stats).toMatchObject({
      done: 6,
      rated: 5,
      hard: 3,
      average_rir: 3.8,
      hard_fraction: 0.6
    })
    expect(stats.histogram.map(row => row.sets)).toEqual([1, 0, 1, 1, 2])
    expect(displayEffort(stats.average_rir!, 'rpe')).toBe(6.2)
    expect(input.entries[0]!.sets[1]!.rpe).toBe(8)
    expect(input.entries[0]!.sets[1]!.rir).toBeNull()
  })
  it('requires five ratings for headlines and two for a weekly curve, retaining coverage', () => {
    const stats = effortAnalytics([
      workout('2026-12-28', [{ rir: 1 }, {}]),
      workout('2027-01-03', [{ rpe: 8 }]),
      workout('2027-01-04', [{ rir: 0 }])
    ])
    expect(stats.average_rir).toBeNull()
    expect(stats.hard_fraction).toBeNull()
    expect(stats.weeks).toEqual([
      { date: '2026-12-28', done: 3, rated: 2, average_rir: 1.5, hard: 2 }
    ])
  })
  it('honors the chosen display scale, otherwise uses the predominant original scale', () => {
    const inputs = [workout('2026-10-12', [{ rpe: 8 }, { rpe: 9 }, { rir: 2 }])]
    expect(effortScale(inputs, 'none')).toBe('rpe')
    expect(effortScale(inputs, 'rir')).toBe('rir')
    expect(
      effortAnalytics([
        workout('2026-10-12', [{ rir: 0 }], 'time'),
        workout('2026-10-12', [{ rir: 0 }], 'reps', 'active')
      ]).rated
    ).toBe(0)
  })
})

describe('mode-safe exercise progress', () => {
  it('aggregates repeated exercise entries per session using actual completed loads and formula', () => {
    const input = workout('2026-10-12', [
      { weight_kg: 50, reps: 10 },
      { weight_kg: 100, reps: 2, done: false },
      { weight_kg: 0, reps: 10 }
    ])
    input.entries.push({
      ...input.entries[0]!,
      id: uuid(4),
      position: 1,
      sets: [
        { ...input.entries[0]!.sets[0]!, id: uuid(20), weight_kg: 60, reps: 5 }
      ]
    })
    const stats = exerciseAnalytics([input], exerciseId, 'epley')
    expect(stats.sessions).toHaveLength(1)
    expect(stats.sessions[0]).toMatchObject({
      sets: 3,
      best_weight_kg: 60,
      volume_kg: 800,
      estimate_kg: 70
    })
  })
  it('shows longest/total timed work and excludes older strength sessions after a mode change', () => {
    const stats = exerciseAnalytics(
      [
        workout('2026-10-11', [{ weight_kg: 99, reps: 5 }]),
        workout(
          '2026-10-12',
          [
            { seconds: 35, weight_kg: 10 },
            { seconds: 50, weight_kg: 12 },
            { seconds: 90, done: false }
          ],
          'time'
        )
      ],
      exerciseId,
      'epley'
    )
    expect(stats.mode).toBe('time')
    expect(stats.changedMode).toBe(true)
    expect(stats.sessions).toHaveLength(1)
    expect(stats.sessions[0]).toMatchObject({
      longest_seconds: 50,
      total_seconds: 85,
      best_weight_kg: 12,
      estimate_kg: null,
      volume_kg: 0
    })
    expect(exerciseMetrics(stats.mode)).not.toContain('estimate_kg')
  })
  it('uses duration-weighted distance for mixed cardio speeds without converting speed into load', () => {
    const stats = exerciseAnalytics(
      [
        workout(
          '2026-10-12',
          [
            { minutes: 30, speed_kmh: 8 },
            { minutes: 15, speed_kmh: 12 },
            { minutes: 60, speed_kmh: 99, done: false }
          ],
          'cardio'
        )
      ],
      exerciseId,
      'epley'
    )
    expect(stats.sessions[0]).toMatchObject({
      total_minutes: 45,
      best_speed_kmh: 12,
      distance_km: 7,
      estimate_kg: null
    })
    expect(exerciseMetrics('cardio')).toEqual([
      'best_speed_kmh',
      'total_minutes',
      'distance_km'
    ])
  })
  it('omits ineligible 1RM estimates while retaining bodyweight and high-rep completed sets', () => {
    expect(estimateStrength(100, 1, 'brzycki')).toBe(100)
    expect(estimateStrength(100, 13, 'epley')).toBeNull()
    expect(estimateStrength(0, 10, 'lombardi')).toBeNull()
    const stats = exerciseAnalytics(
      [
        workout('2026-10-12', [
          { weight_kg: 0, reps: 10 },
          { weight_kg: 20, reps: 15 }
        ])
      ],
      exerciseId,
      'epley'
    )
    expect(stats.sessions[0]).toMatchObject({
      sets: 2,
      volume_kg: 300,
      estimate_kg: null
    })
  })
})

describe('range totals and chart geometry', () => {
  it('counts only completed sets, strength volume and nonnegative session duration', () => {
    const inputs = [
      workout('2026-10-12', [
        { reps: 5, weight_kg: 20 },
        { reps: 10, weight_kg: 50, done: false }
      ]),
      workout('2026-10-13', [{ seconds: 50, weight_kg: 20 }], 'time')
    ]
    inputs[1]!.finished_at = '2026-10-13T09:00:00Z'
    expect(rangeTotals(inputs)).toEqual({
      workouts: 2,
      sets: 2,
      volume: 100,
      duration: 3600
    })
    const muscles = muscleAnalytics(inputs)
    expect(muscles.find(row => row.muscle_group === 'chest')).toMatchObject({
      sets: 2,
      hard_sets: 0
    })
    expect(muscles.find(row => row.muscle_group === 'triceps')).toMatchObject({
      sets: 1,
      hard_sets: 0
    })
  })
  it('spaces points by civil date, not record index, and discards invalid chart data', () => {
    const layout = chartLayout([
      { date: '2026-11-02', value: 3 },
      { date: '2026-10-31', value: 1 },
      { date: '2026-11-01', value: 2 },
      { date: '2026-02-30', value: 9 },
      { date: '2026-10-30', value: Infinity }
    ])
    expect(layout.points.map(point => point.x)).toEqual([60, 310, 560])
    expect(
      chartLayout([
        { date: '2026-10-01', value: 1 },
        { date: '2026-10-02', value: 2 },
        { date: '2026-10-11', value: 3 }
      ]).points[1]!.x
    ).toBe(110)
  })
  it('supports single points, empty data and an inverted fixed effort scale', () => {
    expect(chartLayout([]).points).toEqual([])
    expect(
      chartLayout([{ date: '2026-10-12', value: 0 }], [0, 10], true).points[0]
    ).toMatchObject({ x: 310, y: 20 })
    expect(
      chartLayout([{ date: '2026-10-12', value: 10 }], [0, 10], true).points[0]!
        .y
    ).toBe(150)
  })
  it('uses the full plotted height for a fractional domain rather than rounding its span to one', () => {
    const layout = chartLayout(
      [
        { date: '2026-10-11', value: 78 },
        { date: '2026-10-12', value: 78.5 }
      ],
      [78, 78.5]
    )
    expect(layout.points.map(point => point.y)).toEqual([150, 20])
  })
})

describe('shared chart migration', () => {
  it('keeps civil spacing and separate same-day sessions with their original notes', () => {
    const points = [
      { date: '2026-11-10', value: 5, note: 'Latest workout' },
      { date: '2026-10-31', value: 1, note: 'Morning workout' },
      { date: '2026-10-31', value: 2, note: 'Evening workout' },
      { date: '2026-11-01', value: 3, note: 'DST day' }
    ]
    const chart = trendPresentation(points)
    expect(chart.points.map(point => point.position)).toEqual([
      60, 60, 110, 560
    ])
    expect(chart.points[1]).toMatchObject({
      label: '2026-10-31',
      value: 2,
      detail: 'Evening workout'
    })
    expect(chart.summary).toMatchObject({
      count: 4,
      best: 5,
      last: { date: '2026-11-10', value: 5 }
    })
    expect(points[0]!.date).toBe('2026-11-10')
  })
  it('preserves fractional bodyweight and fixed effort domains without turning missing data into zero', () => {
    const chart = trendPresentation(
      [
        { date: '2026-10-11', value: 78 },
        { date: '2026-10-12', value: 78.5 },
        { date: '2026-02-30', value: 80 },
        { date: '2026-10-13', value: Number.NaN }
      ],
      [77, 79]
    )
    expect(chart.domain).toEqual([77, 79])
    expect(chart.points.map(point => point.value)).toEqual([78, 78.5])
    expect(chart.summary).toMatchObject({ count: 2, best: 78.5 })
    expect(
      trendPresentation([{ date: '2026-10-12', value: 0 }], [0, 10]).points[0]!
        .value
    ).toBe(0)
    expect(trendPresentation([], [0, 10])).toMatchObject({
      points: [],
      domain: [0, 10],
      summary: null
    })
  })
})
