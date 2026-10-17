import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import ical from 'node-ical'

import type { BuiltModuleSchema } from '@monolith/drizzle'

import type { CalendarSchema } from '../endpoints'
import { calendars, eventsIcal } from '../schema.drizzle'

dayjs.extend(utc)

type CalendarDb = PostgresJsDatabase<BuiltModuleSchema<CalendarSchema>>

export class ICalSyncService {
  constructor(private db: CalendarDb) {}

  async syncCalendar(calendarId: string, icsUrl: string) {
    const response = await fetch(icsUrl)

    if (!response.ok) throw new Error('Failed to fetch iCal')

    const icalData = await response.text()

    const events = ical.sync.parseICS(icalData)

    // Clear existing events for this calendar
    await this.db.delete(eventsIcal).where(eq(eventsIcal.calendar, calendarId))

    const processedEvents = []

    for (const [key, event] of Object.entries(events)) {
      if (event.type === 'VEVENT') {
        const processedEvent = {
          calendar: calendarId,
          external_id: event.uid || key,
          title:
            (event.summary as any)?.val || event.summary || 'Untitled Event',
          description: event.description || '',
          start: event.start ? dayjs(event.start).utc().toDate() : null,
          end: event.end ? dayjs(event.end).utc().toDate() : null,
          location: event.location || '',
          recurrence_rule: event.rrule ? event.rrule.toString() : null
        }

        await this.db.insert(eventsIcal).values(processedEvent)

        processedEvents.push(processedEvent)
      }
    }

    // Update sync status
    await this.db
      .update(calendars)
      .set({ last_synced: new Date() })
      .where(eq(calendars.id, calendarId))

    return { success: true, eventsCount: processedEvents.length }
  }

  async shouldSync(
    calendarId: string,
    maxAge: number = 3600000
  ): Promise<boolean> {
    const syncStatus = await this.db.query.calendars.findFirst({
      where: { id: calendarId }
    })

    if (!syncStatus?.last_synced) return true

    const lastSync = dayjs(syncStatus.last_synced)

    const now = dayjs()

    return now.diff(lastSync) > maxAge
  }
}
