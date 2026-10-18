import dayjs from 'dayjs'

import type { CalendarOccurrence } from '../../../../calendarShared'

export const HOUR_HEIGHT = 64

export const SNAP_MINUTES = 15

export const CALENDAR_OCCURRENCE_DRAG =
  'application/x-monolith-calendar-occurrence'

export function occurrenceZone(item: CalendarOccurrence) {
  return (
    item.schedule?.settings.time_zone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
}

export function occursOnDay(item: CalendarOccurrence, date: string) {
  if (item.allDay) {
    const zone = occurrenceZone(item)

    return (
      dayjs(item.start).tz(zone).format('YYYY-MM-DD') <= date &&
      dayjs(item.end)
        .subtract(1, 'millisecond')
        .tz(zone)
        .format('YYYY-MM-DD') >= date
    )
  }

  return (
    item.start < dayjs(date).add(1, 'day').toISOString() &&
    item.end > dayjs(date).toISOString()
  )
}

export function moveToDate(item: CalendarOccurrence, date: string) {
  if (item.allDay) {
    const zone = occurrenceZone(item)
    const length = dayjs
      .utc(dayjs(item.end).tz(zone).format('YYYY-MM-DD'))
      .diff(dayjs.utc(dayjs(item.start).tz(zone).format('YYYY-MM-DD')), 'day')

    return {
      start: dayjs.tz(date + 'T00:00', zone).toISOString(),
      end: dayjs
        .tz(
          dayjs.utc(date).add(Math.max(1, length), 'day').format('YYYY-MM-DD') +
            'T00:00',
          zone
        )
        .toISOString()
    }
  }

  const start = dayjs(item.start),
    next = dayjs(date)
      .hour(start.hour())
      .minute(start.minute())
      .second(start.second())

  return {
    start: next.toISOString(),
    end: next.add(dayjs(item.end).diff(start, 'minute'), 'minute').toISOString()
  }
}

export function snapMinutes(pixels: number) {
  return Math.round(((pixels / HOUR_HEIGHT) * 60) / SNAP_MINUTES) * SNAP_MINUTES
}

export function gestureTimes(
  item: CalendarOccurrence,
  mode: 'move' | 'resize',
  minutes: number,
  days: number
) {
  const start =
    mode === 'move'
      ? dayjs(item.start).add(days, 'day').add(minutes, 'minute')
      : dayjs(item.start)
  const end =
    mode === 'move'
      ? start.add(dayjs(item.end).diff(dayjs(item.start), 'minute'), 'minute')
      : dayjs(item.end).add(minutes, 'minute')

  return {
    start: start.toISOString(),
    end: (end.diff(start, 'minute') < SNAP_MINUTES
      ? start.add(SNAP_MINUTES, 'minute')
      : end
    ).toISOString()
  }
}

export function daySegments(items: CalendarOccurrence[], date: string) {
  const start = dayjs(date).startOf('day'),
    end = start.add(1, 'day')
  const segments = items
    .filter(
      item =>
        !item.allDay &&
        dayjs(item.start).isBefore(end) &&
        dayjs(item.end).isAfter(start)
    )
    .map(item => {
      const begins = dayjs(item.start),
        finishes = dayjs(item.end)
      const top = begins.isBefore(start)
        ? 0
        : begins.hour() * 60 + begins.minute()
      const bottom =
        finishes.isAfter(end) || finishes.isSame(end)
          ? 1440
          : finishes.hour() * 60 + finishes.minute()

      return {
        item,
        top,
        bottom: Math.max(top + 15, bottom),
        column: 0,
        columns: 1,
        canResize: !finishes.isAfter(end)
      }
    })
    .sort(
      (a, b) =>
        a.top - b.top ||
        b.bottom - a.bottom ||
        a.item.id.localeCompare(b.item.id)
    )

  let group: typeof segments = [],
    ends: number[] = [],
    until = 0

  function finish() {
    for (const segment of group) segment.columns = ends.length
    group = []
    ends = []
    until = 0
  }

  for (const segment of segments) {
    if (segment.top >= until) finish()

    const available = ends.findIndex(end => end <= segment.top)
    segment.column = available < 0 ? ends.length : available
    ends[segment.column] = segment.bottom
    until = Math.max(until, segment.bottom)
    group.push(segment)
  }
  finish()

  return segments
}
