import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'

import { useAuth } from '@monolith/api'

import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import {
  type ScheduleRow,
  expandCalendarRecord
} from '../../../../../../modules/monolith--databases/calendarShared'
import type {
  Field,
  RecordPage
} from '../../../../../../modules/monolith--databases/shared'

export type WidgetEvent = {
  id: string
  title: string
  start: Dayjs
  /** Exclusive, like calendar occurrences. */
  end: Dayjs
  allDay: boolean
  kind: 'event' | 'task' | 'quest'
  done: boolean
  href: string
}

export type CalendarPreview =
  | { type: 'event'; event: WidgetEvent }
  | { type: 'day'; day: string }
  | { type: 'agenda' }

/** Recurrence, time zone and all-day settings saved with Schedule & guests. */
export function useWidgetSchedules(workspaceId: string) {
  const { userData } = useAuth()

  const options = workspaceAPI.calendar.list
    .input({ workspace_id: workspaceId })
    .queryOptions()
  const query = useQuery({
    ...options,
    initialData: undefined,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!workspaceId && !!userData?.id,
    retry: false,
    staleTime: 30_000
  })

  return query.data?.schedules
}

/** Dated records as occurrences in [from, to), expanding saved repeats. */
export function recordEvents(
  records: RecordPage[],
  fields: Field[],
  schedules: ScheduleRow[] | undefined,
  from: Dayjs,
  to: Dayjs,
  workspaceId: string
): WidgetEvent[] {
  const saved = new Map(schedules?.map(row => [row.record_id, row]))

  return records.flatMap(record => {
    const schedule = saved.get(record.id)

    if (!record.date && !schedule) return []

    return expandCalendarRecord(
      record,
      from.toISOString(),
      to.toISOString(),
      fields,
      schedule
    ).map(occurrence => ({
      id: occurrence.id,
      title: record.title,
      start: dayjs(occurrence.start),
      end: dayjs(occurrence.end),
      allDay: occurrence.allDay,
      kind:
        record.item_type === 'task' ? ('task' as const) : ('event' as const),
      done: occurrence.done,
      href: `/databases?${new URLSearchParams({
        workspace: workspaceId,
        base: record.base_id,
        record: record.id
      })}`
    }))
  })
}

/** All-day items first, then by start time. */
export function sortEvents(events: WidgetEvent[]) {
  return [...events].sort(
    (a, b) =>
      Number(b.allDay) - Number(a.allDay) ||
      a.start.valueOf() - b.start.valueOf() ||
      a.title.localeCompare(b.title)
  )
}

export function eventsOn(events: WidgetEvent[], day: Dayjs) {
  const start = day.startOf('day'),
    end = start.add(1, 'day')

  return sortEvents(
    events.filter(
      event => event.start.isBefore(end) && event.end.isAfter(start)
    )
  )
}

/** `formatRange` is newer than this app's ES2020 library types. */
export function formatRange(
  format: Intl.DateTimeFormat,
  start: Date,
  end: Date
) {
  const ranged = format as unknown as {
    formatRange?: (start: Date, end: Date) => string
  }

  return ranged.formatRange
    ? ranged.formatRange(start, end)
    : `${format.format(start)} – ${format.format(end)}`
}

export function timeRange(event: WidgetEvent, locale: string) {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit'
  })

  return event.end.isAfter(event.start)
    ? formatRange(format, event.start.toDate(), event.end.toDate())
    : format.format(event.start.toDate())
}

/** Monday-first weeks, matching the calendar workspace. */
export function startOfWeek(day: Dayjs) {
  return day.startOf('day').subtract((day.day() + 6) % 7, 'day')
}
