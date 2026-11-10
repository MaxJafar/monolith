/**
 * Civil (calendar) dates as `YYYY-MM-DD`. Every calculation runs in UTC on
 * the date alone, so a transaction never moves to another day or month
 * because of the viewer's time zone.
 */
export type CivilDate = string

export type Granularity = 'week' | 'month' | 'year' | 'all'

export type Bucket = 'day' | 'week' | 'month' | 'year'

export const CIVIL_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

const DAY = 86400000

function toTime(date: CivilDate): number {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number
  ]

  return Date.UTC(year, month - 1, day)
}

function fromTime(time: number): CivilDate {
  return new Date(time).toISOString().slice(0, 10)
}

export function isCivilDate(value: string): boolean {
  return CIVIL_DATE.test(value) && fromTime(toTime(value)) === value
}

export function todayCivil(now = new Date()): CivilDate {
  const offset = now.getTimezoneOffset() * 60000

  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export const addDays = (date: CivilDate, days: number) =>
  fromTime(toTime(date) + days * DAY)

export const daysBetween = (from: CivilDate, to: CivilDate) =>
  Math.round((toTime(to) - toTime(from)) / DAY)

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Add months, keeping the day of month and clamping to the month's end. */
export function addMonths(
  date: CivilDate,
  months: number,
  anchorDay?: number
): CivilDate {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number
  ]
  const index = year * 12 + (month - 1) + months
  const nextYear = Math.floor(index / 12)
  const nextMonth = (index % 12) + 1
  const nextDay = Math.min(anchorDay ?? day, daysInMonth(nextYear, nextMonth))

  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
}

/** ISO weekday: Monday 1 … Sunday 7. */
export function weekday(date: CivilDate): number {
  const day = new Date(toTime(date)).getUTCDay()

  return day === 0 ? 7 : day
}

/** `weekStart` uses ISO weekdays: 1 for Monday, 7 for Sunday. */
export function startOfWeek(date: CivilDate, weekStart = 1): CivilDate {
  return addDays(date, -((weekday(date) - weekStart + 7) % 7))
}

export const startOfMonth = (date: CivilDate) => `${date.slice(0, 7)}-01`

export const endOfMonth = (date: CivilDate) =>
  addDays(addMonths(startOfMonth(date), 1), -1)

export const startOfYear = (date: CivilDate) => `${date.slice(0, 4)}-01-01`

export const endOfYear = (date: CivilDate) => `${date.slice(0, 4)}-12-31`

export function bucketStart(
  date: CivilDate,
  bucket: Bucket,
  weekStart = 1
): CivilDate {
  if (bucket === 'day') return date
  if (bucket === 'week') return startOfWeek(date, weekStart)
  if (bucket === 'month') return startOfMonth(date)

  return startOfYear(date)
}

export function nextBucket(start: CivilDate, bucket: Bucket): CivilDate {
  if (bucket === 'day') return addDays(start, 1)
  if (bucket === 'week') return addDays(start, 7)
  if (bucket === 'month') return addMonths(start, 1, 1)

  return addMonths(start, 12, 1)
}

/** Every bucket start from `from` to `to`, bounded to keep charts sane. */
export function bucketStarts(
  from: CivilDate,
  to: CivilDate,
  bucket: Bucket,
  weekStart = 1,
  limit = 400
): CivilDate[] {
  const starts: CivilDate[] = []

  for (
    let start = bucketStart(from, bucket, weekStart);
    start <= to && starts.length < limit;
    start = nextBucket(start, bucket)
  )
    starts.push(start)

  return starts
}

export type PeriodRange = {
  from: CivilDate
  to: CivilDate
  bucket: Bucket
}

export function periodRange(
  granularity: Granularity,
  anchor: CivilDate,
  weekStart = 1,
  earliest?: CivilDate
): PeriodRange {
  if (granularity === 'week') {
    const from = startOfWeek(anchor, weekStart)

    return { from, to: addDays(from, 6), bucket: 'day' }
  }

  if (granularity === 'month')
    return {
      from: startOfMonth(anchor),
      to: endOfMonth(anchor),
      bucket: 'day'
    }

  if (granularity === 'year')
    return { from: startOfYear(anchor), to: endOfYear(anchor), bucket: 'month' }

  const from = startOfMonth(
    earliest && earliest < anchor ? earliest : startOfYear(anchor)
  )

  return {
    from,
    to: endOfMonth(anchor),
    bucket: daysBetween(from, anchor) > 730 ? 'year' : 'month'
  }
}

export function shiftAnchor(
  granularity: Granularity,
  anchor: CivilDate,
  delta: number
): CivilDate {
  if (granularity === 'week') return addDays(anchor, delta * 7)
  if (granularity === 'month') return addMonths(startOfMonth(anchor), delta)
  if (granularity === 'year') return addMonths(startOfYear(anchor), delta * 12)

  return anchor
}

/** The same calendar span immediately before a period, for comparisons. */
export function previousRange(
  granularity: Granularity,
  anchor: CivilDate,
  weekStart = 1
): PeriodRange | null {
  if (granularity === 'all') return null

  return periodRange(
    granularity,
    shiftAnchor(granularity, anchor, -1),
    weekStart
  )
}

/** The share of a period that has elapsed by `today`, from 0 to 1. */
export function elapsedShare(range: PeriodRange, today: CivilDate): number {
  if (today < range.from) return 0
  if (today >= range.to) return 1

  return (
    (daysBetween(range.from, today) + 1) /
    (daysBetween(range.from, range.to) + 1)
  )
}
