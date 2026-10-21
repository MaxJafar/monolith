// SPDX-License-Identifier: 0BSD
import { RRule } from 'rrule'
import { expect, it } from 'vitest'

import { decodeRepeat, emptyRepeat, encodeRepeat } from './model'

const start = new Date('2026-10-20T12:00:00Z')
it('round-trips grouped weekdays and generates the same occurrence dates', () => {
  for (const dayGroup of ['day', 'weekday', 'weekendDay', 'wed'] as const) {
    const draft = {
      ...emptyRepeat(),
      start,
      frequency: 'monthly' as const,
      pattern: 'relativeDay' as const,
      position: 'last' as const,
      dayGroup,
      ending: 'after' as const,
      count: 4
    }
    const text = encodeRepeat(draft)
    const restored = decodeRepeat(text)!
    expect(restored.dayGroup).toBe(dayGroup)
    expect(restored.position).toBe('last')
    const after = encodeRepeat(restored)
    expect(RRule.fromString(after).all()).toEqual(RRule.fromString(text).all())
  }
})
it('round-trips every frequency, count and duration without changing UTC start time', () => {
  for (const frequency of [
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly'
  ] as const) {
    const draft = {
      ...emptyRepeat(),
      start,
      frequency,
      interval: frequency === 'yearly' ? 1 : 2,
      days: ['tue', 'fri'] as const,
      count: 3,
      ending: 'after' as const,
      duration: { duration_amt: 45, duration_unit: 'minute' as const }
    }
    const text = encodeRepeat({ ...draft, days: [...draft.days] })
    const restored = decodeRepeat(text)!
    expect(restored.start?.toISOString()).toBe(start.toISOString())
    expect(restored.duration).toEqual(draft.duration)
    expect(restored.count).toBe(3)
    expect(restored.frequency).toBe(frequency)
    expect(encodeRepeat(restored)).toBe(text)
  }
})
it('retains an inclusive ending timestamp and last-day-of-month rules', () => {
  const until = new Date('2027-02-28T23:59:59Z')
  const draft = {
    ...emptyRepeat(),
    start,
    frequency: 'monthly' as const,
    monthDay: -1,
    ending: 'on' as const,
    until
  }
  const parsed = decodeRepeat(encodeRepeat(draft))!
  expect(parsed.monthDay).toBe(-1)
  expect(parsed.until).toEqual(until)
  expect(
    RRule.fromString(encodeRepeat(parsed))
      .all()
      .map(date => date.getUTCDate())
  ).toEqual([31, 30, 31, 31, 28])
})
it('leaves unsupported constraints and multi-rule schedules for the raw editor', () => {
  for (const rule of [
    'DTSTART;TZID=Asia/Baku:20261020T120000\nRRULE:FREQ=DAILY',
    'RRULE:FREQ=DAILY;BYHOUR=9,17',
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15',
    'RRULE:FREQ=WEEKLY;WKST=SU;BYDAY=MO,FR',
    'RRULE:FREQ=YEARLY;INTERVAL=2;BYMONTH=2;BYMONTHDAY=1',
    'RRULE:FREQ=DAILY\nEXDATE:20261022T120000Z',
    'RRULE:FREQ=MONTHLY;BYDAY=2TU',
    'RRULE:FREQ=DAILY\nRRULE:FREQ=WEEKLY'
  ])
    expect(decodeRepeat(rule)).toBeNull()
})
it('does not silently turn malformed durations or impossible fields into defaults', () => {
  for (const suffix of [
    'duration_amt=0;duration_unit=day',
    'duration_amt=1.2;duration_unit=hour',
    'duration_amt=2;duration_unit=second',
    'duration_amt=1;duration_unit=day;extra=1'
  ])
    expect(decodeRepeat('RRULE:FREQ=DAILY||' + suffix)).toBeNull()
  expect(
    encodeRepeat({ ...emptyRepeat(), start, frequency: 'weekly', days: [] })
  ).toBe('')
  expect(encodeRepeat({ ...emptyRepeat(), start, interval: 0 })).toBe('')
  expect(
    encodeRepeat({ ...emptyRepeat(), start, ending: 'on', until: new Date(0) })
  ).toBe('')
  expect(decodeRepeat('RRULE:FREQ=MONTHLY;BYMONTHDAY=0')).toBeNull()
})
it('uses DTSTART defaults for weekly, monthly and annual schedules', () => {
  expect(
    decodeRepeat('DTSTART:20261020T120000Z\nRRULE:FREQ=WEEKLY')?.days
  ).toEqual(['tue'])
  expect(
    decodeRepeat('DTSTART:20261020T120000Z\nRRULE:FREQ=MONTHLY')?.monthDay
  ).toBe(20)
  expect(
    decodeRepeat('DTSTART:20261020T120000Z\nRRULE:FREQ=YEARLY')
  ).toMatchObject({ month: 10, monthDay: 20 })
})
