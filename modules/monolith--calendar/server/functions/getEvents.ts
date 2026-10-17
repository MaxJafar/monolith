import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { ne } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import fs from 'fs'
import path from 'path'

import { type BuiltModuleSchema, scopeDbForModule } from '@monolith/drizzle'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { ClientError, type CoreContext } from '@monolith/server-utils'

import type { CalendarSchema } from '../endpoints'
import { calendars } from '../schema.drizzle'
import {
  MAX_OCCURRENCES,
  expandOccurrences,
  parseDuration,
  parseEventRange
} from './eventValidation'
import { ICalSyncService } from './icalSyncing'

dayjs.extend(utc)

type CalendarDb = PostgresJsDatabase<BuiltModuleSchema<CalendarSchema>>

export interface AggregatedEvent {
  id: string
  type: 'single' | 'recurring'
  start: string
  end: string
  rrule?: string
  title: string
  calendar: string
  category: string
  description: string
  location: string
  location_coords: { lat: number; lon: number }
  reference_link: string
  is_strikethrough?: boolean
  updated?: string
}

export default async function getEvents({
  db,
  start,
  end,
  logging
}: {
  db: CalendarDb
  start: string
  end: string
  logging: CoreContext['logging']
}): Promise<AggregatedEvent[]> {
  const { start: startMoment, end: endMoment } = parseEventRange(start, end)

  let recurrenceCount = 0

  const calendarsWithIcs = await db
    .select()
    .from(calendars)
    .where(ne(calendars.link, ''))

  const syncService = new ICalSyncService(db)

  for (const calendar of calendarsWithIcs) {
    if (await syncService.shouldSync(calendar.id)) {
      // The request transaction owns the user context, so finish before it closes.
      await syncService.syncCalendar(calendar.id, calendar.link)
    }
  }

  const allEvents: AggregatedEvent[] = []

  // Get single events
  const singleCalendarEvents = await db.query.eventsSingle.findMany({
    where: {
      AND: [
        {
          OR: [{ start: { gte: startMoment } }, { end: { gte: startMoment } }]
        },
        { OR: [{ start: { lte: endMoment } }, { end: { lte: endMoment } }] }
      ]
    },
    with: { base: true }
  })

  for (const event of singleCalendarEvents) {
    const baseEvent = event.base

    if (!baseEvent) continue

    allEvents.push({
      id: baseEvent.id,
      type: 'single',
      start: event.start ? event.start.toISOString() : '',
      end: event.end ? event.end.toISOString() : '',
      title: baseEvent.title,
      updated: baseEvent.updated.toISOString(),
      calendar: baseEvent.calendar ?? '',
      category: baseEvent.category ?? '',
      description: baseEvent.description,
      location: baseEvent.location,
      location_coords: baseEvent.location_coords ?? { lat: 0, lon: 0 },
      reference_link: baseEvent.reference_link
    })
  }

  // Get recurring events
  const recurringCalendarEvents = await db.query.eventsRecurring.findMany({
    with: { base: true }
  })

  for (const event of recurringCalendarEvents) {
    const baseEvent = event.base

    if (!baseEvent) continue

    const duration = parseDuration(
      `${event.recurring_rule}||duration_amt=${event.duration_amount};duration_unit=${event.duration_unit}`
    )

    if ('error' in duration) throw new ClientError(duration.error)

    const eventsInRange = expandOccurrences(
      event.recurring_rule,
      dayjs(startMoment)
        .subtract(event.duration_amount, event.duration_unit)
        .toDate(),
      endMoment,
      MAX_OCCURRENCES - recurrenceCount
    )
    recurrenceCount += eventsInRange.length

    for (const eventDate of eventsInRange) {
      const eventStart = dayjs(eventDate).toISOString()

      if (
        event.exceptions.some((exception: string) =>
          dayjs.utc(exception).isSame(eventDate)
        )
      ) {
        continue
      }

      const eventEnd = dayjs(eventDate)
        .add(event.duration_amount, event.duration_unit)
        .toISOString()

      allEvents.push({
        id: `${baseEvent.id}-${dayjs(eventDate).utc().format('YYYYMMDD_HH:mm:ss')}`,
        type: 'recurring',
        start: eventStart,
        end: eventEnd,
        rrule: `${event.recurring_rule}||duration_amt=${event.duration_amount};duration_unit=${event.duration_unit}`,
        title: baseEvent.title,
        updated: baseEvent.updated.toISOString(),
        calendar: baseEvent.calendar ?? '',
        category: baseEvent.category ?? '',
        description: baseEvent.description,
        location: baseEvent.location,
        location_coords: baseEvent.location_coords ?? { lat: 0, lon: 0 },
        reference_link: baseEvent.reference_link
      })
    }
  }

  // Get iCal events
  const icalEvents = await db.query.eventsIcal.findMany({
    where: {
      AND: [
        {
          OR: [{ start: { gte: startMoment } }, { end: { gte: startMoment } }]
        },
        { OR: [{ start: { lte: endMoment } }, { end: { lte: endMoment } }] }
      ]
    },
    with: { calendar_info: true }
  })

  for (const event of icalEvents) {
    allEvents.push({
      id: `ical-${event.id}`,
      type: 'single',
      start: event.start ? event.start.toISOString() : '',
      end: event.end ? event.end.toISOString() : '',
      title: event.title,
      calendar: event.calendar_info?.id ?? '',
      category: '_external',
      description: event.description,
      location: event.location,
      location_coords: { lat: 0, lon: 0 },
      reference_link: ''
    })
  }

  const externalEventGetterFiles = fs.globSync(
    process.env.NODE_ENV === 'production'
      ? '../../modules/*/server/dist/events.js'
      : '../../modules/*/server/events.ts'
  )

  logging.debug(
    `Found ${externalEventGetterFiles.length} external event getter files`
  )

  for (const file of externalEventGetterFiles) {
    try {
      const { default: getExternalEvents } = await import(path.resolve(file))

      const getterModuleId = file
        .replace(/\\/g, '/')
        .match(/\/modules\/([^/]+)\//)?.[1]

      const entries = await getExternalEvents({
        db: scopeDbForModule(
          db,
          getterModuleId
            ? ModuleRegistry.getModuleKeyMap(getterModuleId)
            : undefined
        ),
        start: dayjs(startMoment).format('YYYY-MM-DD HH:mm:ss'),
        end: dayjs(endMoment).format('YYYY-MM-DD HH:mm:ss')
      })

      allEvents.push(...entries)
    } catch (err) {
      logging.warn(`Cannot import external events from ${file}: ${err}`)
    }
  }

  return allEvents
}
