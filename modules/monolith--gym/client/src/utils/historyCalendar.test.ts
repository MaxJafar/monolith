import { describe, expect, it } from 'vitest'

import {
  type ScheduleItem,
  type Workout,
  routineSchema,
  workoutSchema
} from '../../../shared'
import { historyMonth } from './historyCalendar'

const uuid = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
const routines = [1, 2].map(value =>
  routineSchema.parse({
    id: uuid(value),
    name: `Routine ${value}`,
    revision: 1,
    archived: false,
    entries: []
  })
)
const schedule: ScheduleItem[] = [
  { id: uuid(3), date: null, weekday: 1, routine_id: uuid(1) },
  { id: uuid(4), date: '2026-10-05', weekday: null, routine_id: null },
  { id: uuid(5), date: '2026-10-12', weekday: null, routine_id: uuid(2) }
]

function workout(date: string, status: Workout['status'], id = 6): Workout {
  return workoutSchema.parse({
    id: uuid(id),
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
    entries: []
  })
}

describe('native Gym history calendar', () => {
  it('uses a six-week Monday-first civil grid with both month spillovers', () => {
    const calendar = historyMonth('2026-10', [], [], [])
    expect(calendar.days).toHaveLength(42)
    expect(calendar.days[0]).toMatchObject({
      date: '2026-09-28',
      in_month: false
    })
    expect(calendar.days[41]).toMatchObject({
      date: '2026-11-08',
      in_month: false
    })
    expect(calendar.days.filter(day => day.in_month)).toHaveLength(31)
  })
  it('uses explicit rest and date-specific plans before the weekly schedule', () => {
    const calendar = historyMonth('2026-10', [], schedule, routines)
    expect(calendar.days.find(day => day.date === '2026-10-05')).toMatchObject({
      routine: null,
      override: true,
      explicit_rest: true
    })
    expect(
      calendar.days.find(day => day.date === '2026-10-12')!.routine?.id
    ).toBe(uuid(2))
    expect(
      calendar.days.find(day => day.date === '2026-10-19')!.routine?.id
    ).toBe(uuid(1))
  })
  it('retains multiple completed sessions and planned indicators on the same day without counting active/discarded sessions', () => {
    const calendar = historyMonth(
      '2026-10',
      [
        workout('2026-10-12', 'completed'),
        workout('2026-10-12', 'completed', 7),
        workout('2026-10-12', 'active', 8),
        workout('2026-10-12', 'discarded', 9),
        workout('2026-11-01', 'completed', 10)
      ],
      schedule,
      routines
    )
    expect(calendar.completed.map(item => item.id)).toEqual([uuid(6), uuid(7)])
    const day = calendar.days.find(day => day.date === '2026-10-12')!
    expect(day.completed).toHaveLength(2)
    expect(day.routine?.id).toBe(uuid(2))
    expect(
      calendar.days.find(day => day.date === '2026-11-01')!.completed
    ).toHaveLength(1)
  })
  it('keeps civil dates stable at DST/year boundaries and preserves input plans and history', () => {
    const calendar = historyMonth(
      '2027-01',
      [workout('2026-12-31', 'completed')],
      schedule,
      routines
    )
    expect(calendar.days[0]!.date).toBe('2026-12-28')
    expect(
      calendar.days.find(day => day.date === '2026-12-31')!.completed
    ).toHaveLength(1)
    expect(schedule[1]!.routine_id).toBeNull()
    expect(
      historyMonth('2026-11', [], [], []).days.find(
        day => day.date === '2026-11-01'
      )!.date
    ).toBe('2026-11-01')
  })
})
