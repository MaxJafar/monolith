import dayjs from 'dayjs'

import {
  type CellValue,
  type RecordPage,
  isISODate,
  propertyValue
} from '../../../shared'

export type CalendarRange = { start: string; end: string }

export type CalendarLayout = 'month' | 'week' | 'agenda'

export function addCalendarDays(date: string, count: number): string {
  if (!isISODate(date)) throw new Error('A valid calendar date is required')

  const value = new Date(date + 'T12:00:00.000Z')
  value.setUTCDate(value.getUTCDate() + count)

  return value.toISOString().slice(0, 10)
}

export function shiftCalendarMonth(date: string, count: number): string {
  if (!isISODate(date)) throw new Error('A valid calendar date is required')

  const value = new Date(date + 'T12:00:00.000Z')
  value.setUTCDate(1)
  value.setUTCMonth(value.getUTCMonth() + count)

  return value.toISOString().slice(0, 10)
}

export function calendarDays(
  anchor: string,
  layout: 'month' | 'week'
): string[] {
  if (!isISODate(anchor)) throw new Error('A valid calendar date is required')

  const first = layout === 'month' ? anchor.slice(0, 7) + '-01' : anchor

  const weekday = new Date(first + 'T12:00:00.000Z').getUTCDay()
  const start = addCalendarDays(first, -(weekday === 0 ? 6 : weekday - 1))

  return Array.from({ length: layout === 'month' ? 42 : 7 }, (_, index) =>
    addCalendarDays(start, index)
  )
}

export function recordCalendarRange(
  record: RecordPage,
  dateFieldId: string | null | undefined,
  endDateFieldId?: string | null
): CalendarRange | null {
  if (!dateFieldId) return null

  const start = propertyValue(record, dateFieldId)
  const rawEnd = endDateFieldId ? propertyValue(record, endDateFieldId) : null

  if (!isISODate(start)) return null

  const end = rawEnd == null || rawEnd === '' ? start : rawEnd

  if (!isISODate(end) || end < start) return null

  return { start, end }
}

export function calendarRecordPatch(
  record: RecordPage,
  date: string,
  dateFieldId: string,
  endDateFieldId?: string | null
) {
  const range = recordCalendarRange(record, dateFieldId, endDateFieldId)
  if (!range || !isISODate(date)) return null
  const days = dayjs(date).diff(dayjs(range.start), 'day')
  const values = { ...record.values }
  const patch: {
    values: Record<string, CellValue>
    date?: string
    end_date?: string
  } = { values }
  for (const [id, next] of [
    [dateFieldId, date],
    [endDateFieldId, addCalendarDays(range.end, days)]
  ] as const) {
    if (!id) continue
    if (id === 'date' || id === 'end_date') {
      // Moving a day preserves the event's time and duration across DST changes.
      const original = record[id]
      patch[id] = original
        ? dayjs(original).add(days, 'day').toISOString()
        : dayjs(next + 'T12:00:00').toISOString()
    } else values[id] = next
  }
  return patch
}

export function rangesOverlap(
  range: CalendarRange,
  start: string,
  end: string
) {
  return range.start <= end && range.end >= start
}

export function moveCalendarRecord(
  record: RecordPage,
  date: string,
  dateFieldId: string,
  endDateFieldId?: string | null
): Record<string, CellValue> | null {
  const range = recordCalendarRange(record, dateFieldId, endDateFieldId)

  if (!range || !isISODate(date)) return null

  const duration =
    (Date.parse(range.end + 'T12:00:00.000Z') -
      Date.parse(range.start + 'T12:00:00.000Z')) /
    86400000

  return {
    ...record.values,
    [dateFieldId]: date,
    ...(endDateFieldId
      ? { [endDateFieldId]: addCalendarDays(date, duration) }
      : {})
  }
}
