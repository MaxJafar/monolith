import dayjs from 'dayjs'
import rrule from 'rrule'

import { ClientError } from '@lifeforge/server-utils'

const { RRule } = rrule

export const MAX_RANGE_DAYS = 366

export const MAX_OCCURRENCES = 10000

const supported = [
  RRule.YEARLY,
  RRule.MONTHLY,
  RRule.WEEKLY,
  RRule.DAILY,
  RRule.HOURLY
]

function civilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const result = dayjs(value)

  return result.isValid() && result.format('YYYY-MM-DD') === value
    ? result
    : null
}

export function isOffsetInstant(value: string) {
  const matched =
    /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value
    )

  return (
    !!matched &&
    Number(matched[1]) < 24 &&
    Number(matched[2]) < 60 &&
    Number(matched[3]) < 60 &&
    civilDate(value.slice(0, 10)) !== null &&
    Number.isFinite(new Date(value).getTime())
  )
}

export function parseEventRange(start: string, end: string) {
  const fromDay = civilDate(start)
  const toDay = civilDate(end)
  const from = fromDay
    ? fromDay.startOf('day').toDate()
    : isOffsetInstant(start)
      ? new Date(start)
      : null
  const to = toDay
    ? toDay.endOf('day').toDate()
    : isOffsetInstant(end)
      ? new Date(end)
      : null

  if (!from || !to || to < from)
    throw new ClientError(
      'Provide an ordered range of valid dates or ISO timestamps with an offset'
    )
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86400000)
    throw new ClientError(
      `Calendar ranges are limited to ${MAX_RANGE_DAYS} days`
    )

  return { start: from, end: to }
}

export function parseRecurringRule(rule: string) {
  let parsed: InstanceType<typeof RRule>

  try {
    parsed = RRule.fromString(rule)
  } catch {
    throw new ClientError('Invalid recurring rule')
  }
  if (!supported.includes(parsed.options.freq))
    throw new ClientError(
      'Supported recurrence frequencies are hourly, daily, weekly, monthly and yearly'
    )
  if (
    !/^DTSTART(?:;[^:]*)?:/m.test(rule) ||
    !Number.isFinite(parsed.options.dtstart.getTime())
  )
    throw new ClientError('Recurring events require a valid start date')
  if (
    !Number.isSafeInteger(parsed.options.interval) ||
    parsed.options.interval < 1
  )
    throw new ClientError('Recurrence interval must be a positive integer')

  return parsed
}

export function parseDuration(value: string):
  | {
      rule: string
      amount: number
      unit: 'minute' | 'hour' | 'year' | 'month' | 'day' | 'week'
    }
  | { error: string } {
  const [rule, duration, extra] = value.split('||')
  const matched =
    /^duration_amt=(\d+);duration_unit=(minute|hour|day|week|month|year)$/.exec(
      duration ?? ''
    )
  const amount = Number(matched?.[1])
  const unit = matched?.[2] as
    'minute' | 'hour' | 'year' | 'month' | 'day' | 'week'

  if (
    !rule ||
    extra !== undefined ||
    !matched ||
    !Number.isSafeInteger(amount) ||
    amount < 1
  )
    return { error: 'Invalid duration format' }

  const durationDays = dayjs('2000-01-01')
    .add(amount, unit)
    .diff(dayjs('2000-01-01'), 'day', true)

  if (!Number.isFinite(durationDays) || durationDays > MAX_RANGE_DAYS)
    return { error: 'Recurring event duration is limited to 366 days' }

  try {
    parseRecurringRule(rule)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid recurring rule'
    }
  }

  return { rule, amount, unit }
}

export function expandOccurrences(
  rule: string,
  start: Date,
  end: Date,
  limit = MAX_OCCURRENCES
) {
  const parsed = parseRecurringRule(rule)
  // Include one extra occurrence to detect overflow, then fail explicitly.
  const results = parsed.between(
    start,
    end,
    true,
    (_date, count) => count <= limit
  )

  if (results.length > limit)
    throw new ClientError(
      'Too many recurring occurrences; narrow the calendar range'
    )

  return results
}
