import dayjs from 'dayjs'
import z from 'zod'

import getDateRange from './getDateRange'

export const RANGE_MODE = z.enum([
  'week',
  'month',
  'mtd',
  'quarter',
  'year',
  'ytd',
  'all',
  'custom'
])

export type RangeMode = z.infer<typeof RANGE_MODE>

export interface ResolvedDateRange {
  startDate: string | null
  endDate: string | null
}

export function resolveDateRange(
  range?: RangeMode,
  startDate?: string,
  endDate?: string
): ResolvedDateRange {
  if (!range) {
    return { startDate: null, endDate: null }
  }

  return getDateRange(range, startDate, endDate)
}

export function getPreviousDateRange(
  range: RangeMode,
  startDate?: string,
  endDate?: string
): ResolvedDateRange | null {
  const current = resolveDateRange(range, startDate, endDate)

  if (!current.startDate || !current.endDate) {
    return null
  }

  const start = dayjs(current.startDate)

  const end = dayjs(current.endDate)

  // Month-to-date compares against the same stretch of the previous month.
  if (range === 'mtd') {
    return {
      startDate: start.subtract(1, 'month').format('YYYY-MM-DD'),
      endDate: end.subtract(1, 'month').format('YYYY-MM-DD')
    }
  }

  // Year-to-date compares against the same stretch of the previous year.
  if (range === 'ytd') {
    return {
      startDate: start.subtract(1, 'year').format('YYYY-MM-DD'),
      endDate: end.subtract(1, 'year').format('YYYY-MM-DD')
    }
  }

  const duration = end.diff(start, 'day') + 1

  const previousEnd = start.subtract(1, 'day')

  const previousStart = previousEnd.subtract(duration - 1, 'day')

  return {
    startDate: previousStart.format('YYYY-MM-DD'),
    endDate: previousEnd.format('YYYY-MM-DD')
  }
}

export function isWithinDateRange(
  date: Date,
  { startDate, endDate }: ResolvedDateRange
): boolean {
  const value = dayjs(date)

  if (startDate && value.isBefore(dayjs(startDate), 'day')) {
    return false
  }

  if (endDate && value.isAfter(dayjs(endDate), 'day')) {
    return false
  }

  return true
}
