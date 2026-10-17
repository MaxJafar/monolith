import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { coachIntakeSchema } from '../coachShared'
import {
  type GymSnapshot,
  exerciseSchema,
  routineSchema,
  settingsSchema,
  workoutSchema
} from '../shared'
import {
  buildCoachPayload,
  completedSinceReview,
  parseProposal
} from './coaching'
import { trainingStats } from './model'

function context(): GymSnapshot {
  return {
    exercises: [],
    routines: [],
    schedule: [],
    workouts: [],
    active: null,
    bodyweight: [],
    settings: settingsSchema.parse({ revision: 1 }),
    stats: trainingStats([], 'epley', '2026-10-12')
  }
}

const intake = coachIntakeSchema.parse({
  goal: 'Strength',
  experience: 'beginner',
  weekdays: [1, 3],
  session_minutes: 45,
  equipment: ['barbell']
})

describe('bounded coaching context', () => {
  it('includes referenced exercises beyond the catalog cap and equipment filter', () => {
    const state = context()
    state.exercises = Array.from({ length: 250 }, (_, index) =>
      exerciseSchema.parse({
        id: randomUUID(),
        name: `Movement ${index}`,
        muscle_group: 'chest',
        equipment: index === 249 ? 'cable' : 'barbell',
        custom: false,
        archived: false,
        catalog_key: String(index),
        revision: 1
      })
    )
    const reference = state.exercises[249]!
    state.routines = [
      routineSchema.parse({
        id: randomUUID(),
        name: 'Existing routine',
        archived: false,
        revision: 1,
        entries: [
          {
            id: randomUUID(),
            exercise_id: reference.id,
            position: 0,
            prescription: {}
          }
        ]
      })
    ]
    const payload = buildCoachPayload(state, intake, 'review', '')
    expect(payload.catalog).toHaveLength(200)
    expect(payload.catalog[0]?.id).toBe(reference.id)
    expect(payload.catalog.every(item => !('instructions' in item))).toBe(true)
  })

  it('rejects plans with more references than the context can safely describe', () => {
    const state = context()
    state.exercises = Array.from({ length: 201 }, (_, index) =>
      exerciseSchema.parse({
        id: randomUUID(),
        name: `Movement ${index}`,
        muscle_group: 'back',
        custom: true,
        archived: false,
        catalog_key: null,
        revision: 1
      })
    )
    state.routines = [0, 100, 200].map(start =>
      routineSchema.parse({
        id: randomUUID(),
        name: `Routine ${start}`,
        archived: false,
        revision: 1,
        entries: state.exercises
          .slice(start, start + 100)
          .map((exercise, position) => ({
            id: randomUUID(),
            exercise_id: exercise.id,
            position,
            prescription: {}
          }))
      })
    )
    expect(() => buildCoachPayload(state, intake, 'review', '')).toThrow(
      'more than 200'
    )
  })

  it('rejects conflicting mutations and duplicate weekday assignments before selection', () => {
    const routine_id = randomUUID()
    const update = {
      id: randomUUID(),
      reason: 'Adjust plan',
      kind: 'update-routine',
      routine_id,
      expected_revision: 1,
      patch: { name: 'Updated' }
    }
    const archive = {
      id: randomUUID(),
      reason: 'Remove plan',
      kind: 'archive-routine',
      routine_id,
      expected_revision: 1
    }
    expect(() =>
      parseProposal(
        JSON.stringify({ summary: 'Changes', changes: [update, archive] })
      )
    ).toThrow('valid Monolith Gym JSON')
    const schedule = () => ({
      id: randomUUID(),
      reason: 'Rest',
      kind: 'schedule',
      weekday: 1,
      routine_id: null
    })
    expect(() =>
      parseProposal(
        JSON.stringify({
          summary: 'Changes',
          changes: [schedule(), schedule()]
        })
      )
    ).toThrow('valid Monolith Gym JSON')
  })
})

describe('durable completed-session cadence', () => {
  const session = (
    finished: string,
    status = 'completed',
    started = '2026-10-01T10:00:00.000Z'
  ) =>
    workoutSchema.parse({
      id: randomUUID(),
      name: 'Session',
      date: '2026-10-01',
      routine_id: null,
      status,
      started_at: started,
      finished_at: finished,
      notes: '',
      bodyweight_kg: null,
      revision: 1,
      current_entry_id: null,
      rest_until: null,
      entries: []
    })
  const reviewedAt = new Date('2026-10-10T10:00:00.000Z')

  it('does not count older sessions after the previous anchor workout is deleted', () => {
    const old = session('2026-10-09T11:00:00.000Z')
    expect(completedSinceReview([old], reviewedAt)).toBe(0)
  })

  it('counts a reopened older-started session by its new completion time', () => {
    expect(
      completedSinceReview([session('2026-10-11T11:00:00.000Z')], reviewedAt)
    ).toBe(1)
  })

  it('ignores discarded sessions and completion at or before the review boundary', () => {
    expect(
      completedSinceReview(
        [
          session('2026-10-10T10:00:00.000Z'),
          session('2026-10-11T11:00:00.000Z', 'discarded'),
          session('2026-10-11T11:00:00.000Z')
        ],
        reviewedAt
      )
    ).toBe(1)
  })
})
