import { type RelationsBuilder } from 'drizzle-orm'
import {
  integer,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@lifeforge/drizzle'

const pgTable = createModuleTable()

export const eventTypeEnum = pgEnum('calendar_event_type', [
  'single',
  'recurring'
])

export const durationUnitEnum = pgEnum('calendar_duration_unit', [
  'hour',
  'year',
  'month',
  'day',
  'week',
  'minute'
])

export const calendars = pgTable('calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().default(''),
  color: varchar('color', { length: 255 }).notNull().default(''),
  link: varchar('link', { length: 1024 }).notNull().default(''),
  last_synced: timestamp('last_synced', { mode: 'date' })
})

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().default(''),
  color: varchar('color', { length: 255 }).notNull().default(''),
  icon: varchar('icon', { length: 255 }).notNull().default('')
})

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull().default(''),
  category: uuid('category').references(() => categories.id, {
    onDelete: 'set null'
  }),
  calendar: uuid('calendar').references(() => calendars.id, {
    onDelete: 'set null'
  }),
  location: varchar('location', { length: 512 }).notNull().default(''),
  location_coords: jsonb('location_coords').$type<{
    lat: number
    lon: number
  } | null>(),
  reference_link: varchar('reference_link', { length: 1024 })
    .notNull()
    .default(''),
  description: text('description').notNull().default(''),
  type: eventTypeEnum('type').notNull(),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const eventsSingle = pgTable('events_single', {
  id: uuid('id').defaultRandom().primaryKey(),
  base_event: uuid('base_event')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  start: timestamp('start', { mode: 'date' }),
  end: timestamp('end', { mode: 'date' })
})

export const eventsRecurring = pgTable('events_recurring', {
  id: uuid('id').defaultRandom().primaryKey(),
  recurring_rule: text('recurring_rule').notNull(),
  duration_amount: integer('duration_amount').notNull().default(0),
  duration_unit: durationUnitEnum('duration_unit').notNull(),
  exceptions: jsonb('exceptions').$type<string[]>().notNull().default([]),
  base_event: uuid('base_event')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' })
})

export const eventsIcal = pgTable('events_ical', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendar: uuid('calendar').references(() => calendars.id, {
    onDelete: 'cascade'
  }),
  external_id: varchar('external_id', { length: 255 }).notNull().default(''),
  title: varchar('title', { length: 255 }).notNull().default(''),
  description: text('description').notNull().default(''),
  start: timestamp('start', { mode: 'date' }),
  end: timestamp('end', { mode: 'date' }),
  location: varchar('location', { length: 512 }).notNull().default(''),
  recurrence_rule: text('recurrence_rule')
})

export const tables = {
  calendars,
  categories,
  events,
  eventsSingle,
  eventsRecurring,
  eventsIcal
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  eventsSingle: {
    base: r.one.events({
      from: r.eventsSingle.base_event,
      to: r.events.id
    })
  },
  eventsRecurring: {
    base: r.one.events({
      from: r.eventsRecurring.base_event,
      to: r.events.id
    })
  },
  eventsIcal: {
    calendar_info: r.one.calendars({
      from: r.eventsIcal.calendar,
      to: r.calendars.id
    })
  }
})
