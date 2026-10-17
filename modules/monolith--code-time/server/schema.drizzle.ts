import { type RelationsBuilder } from 'drizzle-orm'
import {
  bigint,
  date,
  integer,
  jsonb,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable()

export type CodeTimeBreakdown = Record<string, number>

export const dailyEntries = pgTable('daily_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  relative_files: jsonb('relative_files')
    .$type<CodeTimeBreakdown>()
    .notNull()
    .default({}),
  projects: jsonb('projects').$type<CodeTimeBreakdown>().notNull().default({}),
  languages: jsonb('languages')
    .$type<CodeTimeBreakdown>()
    .notNull()
    .default({}),
  hourly: jsonb('hourly').$type<CodeTimeBreakdown>().notNull().default({}),
  total_minutes: integer('total_minutes').notNull().default(0),
  last_timestamp: bigint('last_timestamp', { mode: 'number' })
    .notNull()
    .default(0),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const tables = { daily_entries: dailyEntries }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
