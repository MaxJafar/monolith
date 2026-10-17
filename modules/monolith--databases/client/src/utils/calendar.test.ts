import { describe, expect, it } from 'vitest'

import type { CellValue, RecordPage } from '../../../shared'
import {
  addCalendarDays,
  calendarDays,
  calendarRecordPatch,
  moveCalendarRecord,
  rangesOverlap,
  recordCalendarRange,
  shiftCalendarMonth
} from './calendar'

const startField = '11111111-1111-4111-8111-111111111111'
const endField = '22222222-2222-4222-8222-222222222222'

function page(values: Record<string, CellValue>): RecordPage {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    base_id: '44444444-4444-4444-8444-444444444444',
    title: 'Launch',
    content: 'Keep this page and its other properties.',
    values,
    updated: '2026-10-12T12:00:00.000Z'
  }
}

describe('Database calendar civil dates', () => {
  it('moves canonical dates without copying them into custom properties or losing time', () => {
    const record = {
      ...page({ [startField]: 'Preserved' }),
      date: '2026-10-13T13:15:00.000Z',
      end_date: '2026-10-14T13:45:00.000Z'
    }
    const patch = calendarRecordPatch(record, '2026-10-15', 'date', 'end_date')!
    expect(patch.values).toEqual(record.values)
    expect(patch.date).toBe('2026-10-15T13:15:00.000Z')
    expect(patch.end_date).toBe('2026-10-16T13:45:00.000Z')
  })
  it('renders a Monday-aligned six-week month including leap day', () => {
    const days = calendarDays('2024-02-29', 'month')

    expect(days).toHaveLength(42)
    expect(new Set(days).size).toBe(42)
    expect(days.slice(0, 7)).toEqual([
      '2024-01-29',
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
      '2024-02-03',
      '2024-02-04'
    ])
    expect(days).toContain('2024-02-29')
    expect(days[days.length - 1]).toBe('2024-03-10')
  })

  it('keeps a six-week December grid across the year boundary', () => {
    const days = calendarDays('2026-12-31', 'month')

    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-11-30')
    expect(days[days.length - 1]).toBe('2027-01-10')
    expect(days).toContain('2027-01-01')
  })

  it('renders seven civil days from Monday through Sunday around leap day', () => {
    expect(calendarDays('2024-02-29', 'week')).toEqual([
      '2024-02-26',
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-03-02',
      '2024-03-03'
    ])
  })

  it('places a Sunday anchor in the preceding Monday week across New Year', () => {
    expect(calendarDays('2027-01-03', 'week')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03'
    ])
  })

  it('keeps the spring DST week complete without a missing or repeated day', () => {
    expect(calendarDays('2026-03-08', 'week')).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08'
    ])
  })

  it.each([
    ['2026-03-07', 2, '2026-03-09'],
    ['2026-03-09', -2, '2026-03-07'],
    ['2026-10-31', 2, '2026-11-02'],
    ['2026-11-02', -2, '2026-10-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2026-12-31', 1, '2027-01-01']
  ])('moves civil date %s by %i days to %s', (date, count, expected) => {
    expect(addCalendarDays(date, count)).toBe(expected)
  })

  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2024-03-31', -1, '2024-02-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-01']
  ])('navigates from %s by %i months to %s', (date, count, expected) => {
    expect(shiftCalendarMonth(date, count)).toBe(expected)
  })

  it.each(['2026-02-30', '2026-2-01', 'not-a-date'])(
    'rejects an invalid civil date %s when navigating days or months',
    date => {
      expect(() => addCalendarDays(date, 1)).toThrow('valid calendar date')
      expect(() => shiftCalendarMonth(date, 1)).toThrow('valid calendar date')
      expect(() => calendarDays(date, 'week')).toThrow('valid calendar date')
      expect(() => calendarDays(date, 'month')).toThrow('valid calendar date')
    }
  )
})

describe('Database calendar scheduling and inclusive overlap', () => {
  it('uses the selected start property and preserves a spanning date range', () => {
    const record = page({
      [startField]: '2026-12-30',
      [endField]: '2027-01-02',
      otherDate: '2026-01-01'
    })

    expect(recordCalendarRange(record, startField, endField)).toEqual({
      start: '2026-12-30',
      end: '2027-01-02'
    })
    expect(recordCalendarRange(record, 'otherDate')).toEqual({
      start: '2026-01-01',
      end: '2026-01-01'
    })
  })

  it.each<Record<string, CellValue>>([
    {},
    { [endField]: null },
    { [endField]: '' }
  ])(
    'treats an absent or cleared optional end as a one-day record',
    endValues => {
      const record = page({ [startField]: '2024-02-29', ...endValues })

      expect(recordCalendarRange(record, startField, endField)).toEqual({
        start: '2024-02-29',
        end: '2024-02-29'
      })
      expect(recordCalendarRange(record, startField)).toEqual({
        start: '2024-02-29',
        end: '2024-02-29'
      })
    }
  )

  it('leaves records unscheduled when no date property is selected', () => {
    const record = page({ [startField]: '2026-10-12' })

    expect(recordCalendarRange(record, undefined)).toBeNull()
    expect(recordCalendarRange(record, null)).toBeNull()
    expect(recordCalendarRange(record, 'missing-field')).toBeNull()
  })

  it.each<CellValue>([
    null,
    '',
    '2026-02-30',
    '2026-2-01',
    '2026-10-12T00:00:00.000Z',
    false,
    0,
    ['2026-10-12']
  ])('leaves an invalid start value %j unscheduled', value => {
    expect(
      recordCalendarRange(page({ [startField]: value }), startField)
    ).toBeNull()
  })

  it.each<CellValue>(['2026-02-30', '2026-10-11', false, 0])(
    'leaves an invalid or reversed end value %j unscheduled',
    end => {
      expect(
        recordCalendarRange(
          page({ [startField]: '2026-10-12', [endField]: end }),
          startField,
          endField
        )
      ).toBeNull()
    }
  )

  it('includes both boundary dates and a record spanning the visible range', () => {
    const spanning = { start: '2026-12-20', end: '2027-01-10' }

    expect(rangesOverlap(spanning, '2026-12-28', '2027-01-03')).toBe(true)
    expect(rangesOverlap(spanning, '2026-12-19', '2026-12-20')).toBe(true)
    expect(rangesOverlap(spanning, '2027-01-10', '2027-01-11')).toBe(true)
    expect(rangesOverlap(spanning, '2026-12-18', '2026-12-19')).toBe(false)
    expect(rangesOverlap(spanning, '2027-01-11', '2027-01-12')).toBe(false)
    expect(
      rangesOverlap(
        { start: '2024-02-29', end: '2024-02-29' },
        '2024-02-29',
        '2024-02-29'
      )
    ).toBe(true)
  })
})

describe('Moving a database calendar record', () => {
  it('preserves unrelated values and duration across both New York DST transitions', () => {
    const values = {
      [startField]: '2026-03-07',
      [endField]: '2026-03-09',
      otherDate: '2026-12-25',
      tags: ['Art', 'Launch'],
      estimate: 0,
      complete: false,
      note: 'Keep me'
    }
    const record = page(values)
    const moved = moveCalendarRecord(record, '2026-10-31', startField, endField)

    expect(moved).toEqual({
      ...values,
      [startField]: '2026-10-31',
      [endField]: '2026-11-02'
    })
    expect(moved).not.toBe(record.values)
    expect(record.values).toEqual(values)
    expect(record.values[startField]).toBe('2026-03-07')
    expect(record.values[endField]).toBe('2026-03-09')
  })

  it('keeps the leap-day duration when moving across New Year', () => {
    expect(
      moveCalendarRecord(
        page({ [startField]: '2024-02-28', [endField]: '2024-03-02' }),
        '2026-12-30',
        startField,
        endField
      )
    ).toEqual({
      [startField]: '2026-12-30',
      [endField]: '2027-01-02'
    })
  })

  it('moves only the selected date when the view has no end property', () => {
    expect(
      moveCalendarRecord(
        page({ [startField]: '2026-10-12', [endField]: '2026-12-01' }),
        '2026-10-13',
        startField
      )
    ).toEqual({
      [startField]: '2026-10-13',
      [endField]: '2026-12-01'
    })
  })

  it.each(['2026-02-30', '2026-2-01', '2026-10-12T00:00:00Z', ''])(
    'rejects invalid target %s without changing the source',
    target => {
      const record = page({ [startField]: '2026-10-12' })

      expect(moveCalendarRecord(record, target, startField)).toBeNull()
      expect(record.values).toEqual({ [startField]: '2026-10-12' })
    }
  )

  it('rejects movement of an unscheduled or reversed source range', () => {
    expect(moveCalendarRecord(page({}), '2026-10-13', startField)).toBeNull()
    expect(
      moveCalendarRecord(
        page({ [startField]: '2026-10-12', [endField]: '2026-10-11' }),
        '2026-10-13',
        startField,
        endField
      )
    ).toBeNull()
  })
})
