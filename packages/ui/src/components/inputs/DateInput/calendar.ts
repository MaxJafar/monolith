// SPDX-License-Identifier: 0BSD
export function validDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}
export function localDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0
) {
  const result = new Date(0)
  result.setFullYear(year, month, day)
  result.setHours(hour, minute, 0, 0)
  return result
}
export function dayKey(date: Date): string {
  return [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0')
  ].join('-')
}
export function dayAllowed(date: Date, min?: Date, max?: Date) {
  if (!validDate(date) || date.getFullYear() < 1 || date.getFullYear() > 9999)
    return false
  const key = dayKey(date)
  return (
    (!validDate(min) || key >= dayKey(min)) &&
    (!validDate(max) || key <= dayKey(max))
  )
}
export function monthDays(month: Date): Date[] {
  const first = localDate(month.getFullYear(), month.getMonth(), 1)
  const start = 1 - first.getDay()
  return Array.from({ length: 42 }, (_, index) =>
    localDate(first.getFullYear(), first.getMonth(), start + index)
  )
}
export function shiftDay(date: Date, days: number): Date {
  return localDate(date.getFullYear(), date.getMonth(), date.getDate() + days)
}
export function shiftMonth(date: Date, months: number): Date {
  const first = localDate(date.getFullYear(), date.getMonth() + months, 1)
  const last = localDate(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return localDate(
    first.getFullYear(),
    first.getMonth(),
    Math.min(date.getDate(), last)
  )
}
export function monthAllowed(month: Date, min?: Date, max?: Date) {
  if (
    !validDate(month) ||
    month.getFullYear() < 1 ||
    month.getFullYear() > 9999
  )
    return false
  const first = localDate(month.getFullYear(), month.getMonth(), 1),
    last = localDate(month.getFullYear(), month.getMonth() + 1, 0)
  return (
    (!validDate(min) || dayKey(last) >= dayKey(min)) &&
    (!validDate(max) || dayKey(first) <= dayKey(max))
  )
}
export function clockText(date: Date): string {
  return (
    date.getHours().toString().padStart(2, '0') +
    ':' +
    date.getMinutes().toString().padStart(2, '0')
  )
}
/** Reject nonexistent local times instead of silently shifting an event across a DST gap. */
export function dateWithTime(
  day: Date,
  time: string,
  hasTime: boolean
): Date | null {
  if (!validDate(day)) return null
  if (!hasTime)
    return localDate(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0)
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hour = Number(match[1]),
    minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  const result = localDate(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    minute
  )
  return result.getHours() === hour &&
    result.getMinutes() === minute &&
    dayKey(result) === dayKey(day)
    ? result
    : null
}
export function selectionAllowed(
  date: Date | null,
  hasTime: boolean,
  min?: Date,
  max?: Date
): date is Date {
  return (
    validDate(date) &&
    dayAllowed(date, min, max) &&
    (!hasTime ||
      ((!validDate(min) || date >= min) && (!validDate(max) || date <= max)))
  )
}
export function startingDate(
  value: Date | null,
  min?: Date,
  max?: Date,
  now = new Date()
): Date {
  const date = validDate(value) ? value : now
  return validDate(min) && date < min
    ? min
    : validDate(max) && date > max
      ? max
      : date
}
