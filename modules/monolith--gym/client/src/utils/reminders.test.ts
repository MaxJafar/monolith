import { describe, expect, it } from 'vitest'

import { routineSchema, settingsSchema, workoutSchema } from '../../../shared'
import { dueWorkoutReminder, reminderSlotKey } from './reminders'

const routine = routineSchema.parse({
  id: '00000000-0000-4000-8000-000000000010',
  name: 'Push',
  revision: 1,
  archived: false,
  entries: []
})
const settings = settingsSchema.parse({
  revision: 1,
  reminder_enabled: true,
  reminder_time: '08:00',
  timezone: 'America/New_York'
})
const data = {
  settings,
  routines: [routine],
  schedule: [
    {
      id: '00000000-0000-4000-8000-000000000011',
      weekday: 1,
      date: null,
      routine_id: routine.id
    }
  ],
  workouts: [],
  active: null
}

describe('foreground planned workout reminder', () => {
  it('uses the chosen timezone and becomes due at the saved time, not browser UTC', () => {
    expect(
      dueWorkoutReminder(data, new Date('2026-10-12T11:59:59Z'))
    ).toBeNull()
    expect(
      dueWorkoutReminder(data, new Date('2026-10-12T12:00:00Z'))
    ).toMatchObject({
      date: '2026-10-12',
      time: '08:00',
      routine_id: routine.id
    })
  })
  it('handles winter daylight-saving offset and a later foreground opening on the same civil day', () => {
    expect(
      dueWorkoutReminder(data, new Date('2026-11-02T12:59:00Z'))
    ).toBeNull()
    expect(
      dueWorkoutReminder(data, new Date('2026-11-02T14:00:00Z'))?.date
    ).toBe('2026-11-02')
  })
  it('gives an explicit rest-day override precedence over the weekly plan', () => {
    expect(
      dueWorkoutReminder(
        {
          ...data,
          schedule: [
            ...data.schedule,
            {
              id: '00000000-0000-4000-8000-000000000012',
              weekday: null,
              date: '2026-10-12',
              routine_id: null
            }
          ]
        },
        new Date('2026-10-12T15:00:00Z')
      )
    ).toBeNull()
  })
  it('does not remind for disabled settings, missing plans or an archived routine', () => {
    const now = new Date('2026-10-12T15:00:00Z')
    expect(
      dueWorkoutReminder(
        { ...data, settings: { ...settings, reminder_enabled: false } },
        now
      )
    ).toBeNull()
    expect(dueWorkoutReminder({ ...data, schedule: [] }, now)).toBeNull()
    expect(
      dueWorkoutReminder(
        { ...data, routines: [{ ...routine, archived: true }] },
        now
      )
    ).toBeNull()
  })
  it('does not ask for a new workout while an active session exists or today’s training is complete', () => {
    const workout = workoutSchema.parse({
      id: '00000000-0000-4000-8000-000000000013',
      routine_id: null,
      name: 'Freestyle',
      date: '2026-10-12',
      status: 'active',
      started_at: '2026-10-12T14:00:00Z',
      finished_at: null,
      notes: '',
      bodyweight_kg: null,
      revision: 1,
      current_entry_id: null,
      rest_until: null,
      entries: []
    })
    const now = new Date('2026-10-12T15:00:00Z')
    expect(dueWorkoutReminder({ ...data, active: workout }, now)).toBeNull()
    expect(
      dueWorkoutReminder(
        { ...data, workouts: [{ ...workout, status: 'completed' }] },
        now
      )
    ).toBeNull()
    expect(
      dueWorkoutReminder(
        { ...data, workouts: [{ ...workout, status: 'discarded' }] },
        now
      )
    ).not.toBeNull()
  })
  it('uses a stable owner, civil-day, timezone and reminder-time slot for deduplication', () => {
    const due = dueWorkoutReminder(data, new Date('2026-10-12T15:00:00Z'))!
    expect(reminderSlotKey('owner-a', due)).toBe(
      reminderSlotKey('owner-a', { ...due, routine_name: 'Renamed' })
    )
    expect(reminderSlotKey('owner-a', due)).not.toBe(
      reminderSlotKey('owner-b', due)
    )
    expect(reminderSlotKey('owner-a', due)).not.toBe(
      reminderSlotKey('owner-a', { ...due, date: '2026-10-13' })
    )
    expect(reminderSlotKey('owner-a', due)).not.toBe(
      reminderSlotKey('owner-a', { ...due, time: '09:00' })
    )
  })
  it('returns no reminder for an invalid timezone instead of crashing the workspace', () => {
    expect(
      dueWorkoutReminder(
        { ...data, settings: { ...settings, timezone: 'Not/AZone' } },
        new Date()
      )
    ).toBeNull()
  })
})
