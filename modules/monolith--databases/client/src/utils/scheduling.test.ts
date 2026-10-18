import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import {
  type ScheduleRow,
  calendarBinding,
  calendarTiming,
  expandCalendarRecord,
  scheduleSchema,
  timingPatch
} from '../../../calendarShared'
import type { RecordPage } from '../../../shared'
import {
  daySegments,
  gestureTimes,
  moveToDate,
  occursOnDay,
  snapMinutes
} from '../components/calendar/timeGridModel'

const record: RecordPage = {
  id: '10000000-0000-4000-8000-000000000001',
  base_id: '10000000-0000-4000-8000-000000000002',
  title: 'Planning',
  item_type: 'event',
  content: '',
  values: {},
  date: '2026-03-01T14:00:00.000Z',
  end_date: '2026-03-01T15:00:00.000Z',
  updated: '2026-03-01T00:00:00.000Z'
}
function schedule(
  settings: Partial<ScheduleRow['settings']> = {}
): ScheduleRow {
  return {
    record_id: record.id,
    organizer_id: record.id,
    revision: 1,
    responses: {},
    settings: scheduleSchema.parse({
      time_zone: 'America/New_York',
      recurrence: { frequency: 'weekly', count: 4 },
      ...settings
    })
  }
}
describe('Calendar scheduling and gestures', () => {
  it('keeps weekly wall-clock time across spring DST', () => {
    const items = expandCalendarRecord(
      record,
      '2026-03-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      [],
      schedule()
    )
    expect(items.map(item => item.start)).toEqual([
      '2026-03-01T14:00:00.000Z',
      '2026-03-08T13:00:00.000Z',
      '2026-03-15T13:00:00.000Z',
      '2026-03-22T13:00:00.000Z'
    ])
    expect(
      items.every(item => dayjs(item.end).diff(item.start, 'minute') === 60)
    ).toBe(true)
  })
  it('skips nonexistent local time without using up COUNT', () => {
    const items = expandCalendarRecord(
      {
        ...record,
        date: '2026-03-01T07:30:00.000Z',
        end_date: '2026-03-01T08:30:00.000Z'
      },
      '2026-03-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      [],
      schedule({
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          weekdays: [],
          until: null,
          count: 3
        }
      })
    )
    expect(items.map(item => item.start)).toEqual([
      '2026-03-01T07:30:00.000Z',
      '2026-03-15T06:30:00.000Z',
      '2026-03-22T06:30:00.000Z'
    ])
  })
  it('skips months without the requested day and includes the until date', () => {
    const item = {
      ...record,
      date: '2026-01-31T09:00:00.000Z',
      end_date: '2026-01-31T10:00:00.000Z'
    }
    const row = schedule({
      time_zone: 'UTC',
      recurrence: {
        frequency: 'monthly',
        interval: 1,
        weekdays: [],
        until: '2026-05-31',
        count: null
      }
    })
    expect(
      expandCalendarRecord(
        item,
        '2026-01-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z',
        [],
        row
      ).map(item => item.start.slice(0, 10))
    ).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])
  })
  it('uses stable occurrence IDs for a moved, skipped and completed recurring task', () => {
    const row = schedule({
      exceptions: {
        '2026-03-01T14:00:00.000Z': {
          start: '2026-04-02T09:00:00.000Z',
          end: '2026-04-02T10:00:00.000Z',
          done: true
        },
        '2026-03-08T13:00:00.000Z': { cancelled: true }
      }
    })
    const april = expandCalendarRecord(
      { ...record, item_type: 'task' },
      '2026-04-01T00:00:00.000Z',
      '2026-04-03T00:00:00.000Z',
      [],
      row
    )
    expect(april).toHaveLength(1)
    expect(april[0]).toMatchObject({
      original: record.date,
      start: '2026-04-02T09:00:00.000Z',
      done: true
    })
    expect(
      expandCalendarRecord(
        record,
        '2026-03-08T00:00:00.000Z',
        '2026-03-09T00:00:00.000Z',
        [],
        row
      )
    ).toEqual([])
  })
  it('binds custom dates without creating a shadow canonical date', () => {
    const id = '10000000-0000-4000-8000-000000000003'
    const item = {
      ...record,
      date: null,
      end_date: null,
      values: { [id]: '2026-03-08' }
    }
    const field = {
      id,
      base_id: record.base_id,
      name: 'Deadline',
      kind: 'date' as const,
      config: {
        options: [],
        cardinality: 'one' as const,
        reciprocal_field_id: null
      },
      position: 0,
      target_base_id: null
    }
    expect(calendarBinding(item, [field])).toEqual({ start: id, end: null })
    const occurrence = expandCalendarRecord(
      item,
      '2026-03-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      [field]
    )[0]!
    const patch = timingPatch(
      occurrence,
      dayjs('2026-03-10').toISOString(),
      dayjs('2026-03-11').toISOString()
    )
    expect(patch).toEqual({ values: { [id]: '2026-03-10' } })
  })
  it('keeps all-day occurrences on civil day boundaries across DST', () => {
    const timing = calendarTiming(
      record,
      'date',
      'end_date',
      schedule({ all_day: true }).settings
    )!
    expect(dayjs(timing.start).tz('America/New_York').format('HH:mm')).toBe(
      '00:00'
    )
    const items = expandCalendarRecord(
      record,
      '2026-03-07T00:00:00.000Z',
      '2026-03-10T00:00:00.000Z',
      [],
      schedule({ all_day: true })
    )
    expect(items[0]?.start).toBe('2026-03-08T05:00:00.000Z')
    expect(items[0]?.end).toBe('2026-03-09T04:00:00.000Z')
  })
  it('snaps movement, preserves duration and stops resize at fifteen minutes', () => {
    const item = expandCalendarRecord(
      record,
      '2026-03-01T00:00:00.000Z',
      '2026-03-02T00:00:00.000Z',
      []
    )[0]!
    expect(snapMinutes(16)).toBe(15)
    const moved = gestureTimes(item, 'move', 30, 1)
    expect(dayjs(moved.start).diff(item.start, 'minute')).toBe(1470)
    expect(dayjs(moved.end).diff(moved.start, 'minute')).toBe(60)
    const resized = gestureTimes(item, 'resize', -120, 0)
    expect(dayjs(resized.end).diff(resized.start, 'minute')).toBe(15)
  })
  it('keeps an all-day event on its civil date when the viewer is in another time zone', () => {
    const item = expandCalendarRecord(
      record,
      '2026-03-07T00:00:00.000Z',
      '2026-03-10T00:00:00.000Z',
      [],
      schedule({ all_day: true })
    )[0]!
    expect(occursOnDay(item, '2026-03-08')).toBe(true)
    expect(occursOnDay(item, '2026-03-09')).toBe(false)
    const moved = moveToDate(item, '2026-11-01')
    expect(moved).toEqual({
      start: '2026-11-01T04:00:00.000Z',
      end: '2026-11-02T05:00:00.000Z'
    })
  })
  it('does not interpret malformed custom dates as rolled-over calendar dates', () => {
    expect(
      calendarTiming(
        { ...record, values: { malformed: '2026-02-31' } },
        'malformed',
        null
      )
    ).toBeNull()
  })
  it('lays out overlaps separately and resets columns for adjacent appointments', () => {
    const item = expandCalendarRecord(
      record,
      '2026-03-01T00:00:00.000Z',
      '2026-03-02T00:00:00.000Z',
      []
    )[0]!
    const second = {
      ...item,
      id: 'second',
      start: dayjs(item.start).add(30, 'minute').toISOString(),
      end: dayjs(item.end).add(30, 'minute').toISOString()
    }
    const third = {
      ...item,
      id: 'third',
      start: second.end,
      end: dayjs(second.end).add(1, 'hour').toISOString()
    }
    const segments = daySegments(
      [third, second, item],
      dayjs(item.start).format('YYYY-MM-DD')
    )
    expect(segments.map(item => [item.column, item.columns])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1]
    ])
  })
})
