import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import z from 'zod'

import { type Field, type RecordPage, isISODate, isoDate } from './shared'

dayjs.extend(utc)
dayjs.extend(timezone)

export const timeZoneSchema = z
  .string()
  .max(100)
  .refine(value => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value })

      return true
    } catch {
      return false
    }
  }, 'Choose a valid IANA time zone')

export const recurrenceSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1).max(365).default(1),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    until: isoDate.nullable().default(null),
    count: z.number().int().min(1).max(10000).nullable().default(null)
  })
  .refine(
    rule => !(rule.until && rule.count),
    'Choose an end date or occurrence count'
  )

export const occurrenceChangeSchema = z
  .object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    cancelled: z.boolean().optional(),
    done: z.boolean().optional()
  })
  .refine(
    value =>
      (!value.start && !value.end) ||
      (!!value.start && !!value.end && value.end > value.start),
    'End must be after start'
  )

export const scheduleSchema = z.object({
  time_zone: timeZoneSchema.default('UTC'),
  all_day: z.boolean().default(false),
  start_field: z.union([z.literal('date'), z.string().uuid()]).default('date'),
  end_field: z
    .union([z.literal('end_date'), z.string().uuid()])
    .nullable()
    .default('end_date'),
  recurrence: recurrenceSchema.nullable().default(null),
  reminders: z.array(z.number().int().min(0).max(40320)).max(5).default([10]),
  // Email is opt-in for the organizer. Invitees control their own preference.
  email: z.boolean().default(false),
  attendees: z.array(z.string().uuid()).max(100).default([]),
  exceptions: z
    .record(z.string().datetime(), occurrenceChangeSchema)
    .refine(
      value => Object.keys(value).length <= 2000,
      'Too many occurrence changes'
    )
    .default({})
})

export const scheduleRowSchema = z.object({
  record_id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  organizer_id: z.string().uuid(),
  settings: scheduleSchema,
  responses: z.record(
    z.string().uuid(),
    z.object({
      status: z.enum(['accepted', 'tentative', 'declined']),
      email: z.boolean()
    })
  )
})

export type Schedule = z.infer<typeof scheduleSchema>

export type ScheduleRow = z.infer<typeof scheduleRowSchema>

export type CalendarOccurrence = {
  id: string
  record: RecordPage
  original: string
  start: string
  end: string
  allDay: boolean
  done: boolean
  schedule?: ScheduleRow
  startField: string
  endField: string | null
}

export function calendarBinding(
  record: RecordPage,
  fields: Field[],
  start?: string | null,
  end?: string | null
) {
  if (start) return { start, end: end ?? null }
  if (record.date) return { start: 'date', end: 'end_date' }

  const dates = fields.filter(
    field => field.base_id === record.base_id && field.kind === 'date'
  )
  const first = dates.find(field => isISODate(record.values[field.id]))

  return { start: first?.id ?? 'date', end: null }
}

export function calendarTiming(
  record: RecordPage,
  startField: string,
  endField: string | null,
  settings?: Schedule
) {
  const zone =
    settings?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const rawStart =
    startField === 'date' ? record.date : record.values[startField]
  const rawEnd =
    endField === 'end_date'
      ? record.end_date
      : endField
        ? record.values[endField]
        : null

  if (typeof rawStart !== 'string' || !dayjs(rawStart).isValid()) return null
  if (startField !== 'date' && !isISODate(rawStart)) return null

  const allDay =
    isISODate(rawStart) || (settings?.all_day ?? record.item_type !== 'event')

  let start = isISODate(rawStart)
    ? dayjs.tz(rawStart + 'T00:00', zone)
    : dayjs(rawStart).tz(zone)
  if (allDay) start = dayjs.tz(start.format('YYYY-MM-DD') + 'T00:00', zone)
  let end =
    typeof rawEnd === 'string' && dayjs(rawEnd).isValid()
      ? isISODate(rawEnd)
        ? dayjs.tz(rawEnd + 'T00:00', zone)
        : dayjs(rawEnd).tz(zone)
      : start.add(allDay ? 1 : 0, 'day').add(allDay ? 0 : 60, 'minute')
  // Custom date properties have inclusive ends. Timed events use exclusive ends.
  if (typeof rawEnd === 'string' && isISODate(rawEnd))
    end = dayjs.tz(
      dayjs.utc(rawEnd).add(1, 'day').format('YYYY-MM-DD') + 'T00:00',
      zone
    )
  else if (allDay && rawEnd)
    end = dayjs.tz(
      dayjs
        .utc(end.format('YYYY-MM-DD'))
        .add(end.hour() || end.minute() ? 1 : 0, 'day')
        .format('YYYY-MM-DD') + 'T00:00',
      zone
    )
  if (!end.isAfter(start) || (allDay && !rawEnd))
    end = allDay
      ? dayjs.tz(
          dayjs
            .utc(start.format('YYYY-MM-DD'))
            .add(1, 'day')
            .format('YYYY-MM-DD') + 'T00:00',
          zone
        )
      : start.add(60, 'minute')

  return { start: start.toISOString(), end: end.toISOString(), allDay, zone }
}

/** Bounded civil-time recurrence. Invalid dates and DST gaps do not consume COUNT. */
export function expandCalendarRecord(
  record: RecordPage,
  from: string,
  to: string,
  fields: Field[],
  schedule?: ScheduleRow,
  binding?: { start: string; end: string | null }
): CalendarOccurrence[] {
  const selected =
    binding ??
    (schedule
      ? {
          start: schedule.settings.start_field,
          end: schedule.settings.end_field
        }
      : calendarBinding(record, fields))
  const active =
    schedule && schedule.settings.start_field === selected.start
      ? schedule
      : undefined
  const timing = calendarTiming(
    record,
    selected.start,
    selected.end,
    active?.settings
  )

  if (!timing) return []

  const settings = active?.settings
  const rule = settings?.recurrence
  const seed = dayjs(timing.start).tz(timing.zone)
  const seedDay = dayjs.utc(seed.format('YYYY-MM-DD'))
  const duration = dayjs(timing.end).diff(dayjs(timing.start), 'minute')
  const result: CalendarOccurrence[] = []
  const seen = new Set<string>()

  function add(original: string, start: string, end: string) {
    seen.add(original)
    const change = settings?.exceptions[original]

    if (change?.cancelled) return
    start = change?.start ?? start
    end = change?.end ?? end
    if (start >= to || end <= from) return
    result.push({
      id: record.id + ':' + original,
      record,
      original,
      start,
      end,
      allDay: timing!.allDay,
      done: change?.done ?? !!record.done,
      schedule: active,
      startField: selected.start,
      endField: selected.end
    })
  }

  if (!rule) add(timing.start, timing.start, timing.end)
  else {
    const endDay = dayjs(to).tz(timing.zone).format('YYYY-MM-DD')

    let count = 0

    const elapsed = Math.max(
      0,
      dayjs
        .utc(dayjs(from).tz(timing.zone).format('YYYY-MM-DD'))
        .diff(seedDay, 'day') -
        Math.ceil(duration / 1440) -
        2
    )
    // COUNT needs the complete prefix; endless rules can seek directly to the window.
    const first = rule.count ? 0 : elapsed
    const limit = Math.min(366000, dayjs.utc(endDay).diff(seedDay, 'day') + 1)

    for (let offset = first; offset <= limit; offset++) {
      const day = seedDay.add(offset, 'day')
      const date = day.format('YYYY-MM-DD')

      if (rule.until && date > rule.until) break

      const months =
        (day.year() - seedDay.year()) * 12 + day.month() - seedDay.month()
      const week = Math.floor((offset + ((seedDay.day() + 6) % 7)) / 7)
      const weekdays = rule.weekdays.length ? rule.weekdays : [seedDay.day()]
      const matches =
        offset === 0 ||
        (rule.frequency === 'daily'
          ? offset % rule.interval === 0
          : rule.frequency === 'weekly'
            ? week % rule.interval === 0 && weekdays.includes(day.day())
            : rule.frequency === 'monthly'
              ? months % rule.interval === 0 && day.date() === seedDay.date()
              : (day.year() - seedDay.year()) % rule.interval === 0 &&
                day.month() === seedDay.month() &&
                day.date() === seedDay.date())

      if (!matches) continue

      const civil = date + 'T' + seed.format('HH:mm:ss')
      const occurrence = dayjs.tz(civil, timing.zone)

      if (occurrence.format('YYYY-MM-DDTHH:mm:ss') !== civil) continue
      count++
      if (rule.count && count > rule.count) break

      const original = occurrence.toISOString()
      const end = timing.allDay
        ? dayjs
            .tz(
              day
                .add(Math.max(1, Math.round(duration / 1440)), 'day')
                .format('YYYY-MM-DD') + 'T00:00',
              timing.zone
            )
            .toISOString()
        : occurrence.add(duration, 'minute').toISOString()
      add(original, original, end)
    }
    // A moved occurrence can enter this window from outside it.
    for (const [original, change] of Object.entries(settings.exceptions))
      if (!seen.has(original) && change.start && change.end)
        add(original, change.start, change.end)
  }

  return result.sort((a, b) => a.start.localeCompare(b.start))
}

export function timingPatch(
  occurrence: CalendarOccurrence,
  start: string,
  end: string,
  timeZone?: string
) {
  if (!dayjs(start).isValid() || !dayjs(end).isAfter(start))
    throw Error('End must be after start')

  const values = { ...occurrence.record.values }
  const patch: {
    values?: RecordPage['values']
    date?: string
    end_date?: string
  } = {}
  const zone =
    occurrence.schedule?.settings.time_zone ??
    timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone

  if (occurrence.startField === 'date') patch.date = start
  else {
    values[occurrence.startField] = dayjs(start).tz(zone).format('YYYY-MM-DD')
    patch.values = values
  }

  if (occurrence.endField === 'end_date') patch.end_date = end
  else if (occurrence.endField) {
    values[occurrence.endField] = dayjs(end)
      .subtract(1, 'millisecond')
      .tz(zone)
      .format('YYYY-MM-DD')
    patch.values = values
  }

  return patch
}
