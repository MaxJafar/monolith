import { type RelationsBuilder } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgEnum,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable()

export const pomodoroSessionStatusEnum = pgEnum('pomodoro_session_status', [
  'new',
  'active',
  'completed'
])

export const pomodoroSubSessionTypeEnum = pgEnum('pomodoro_sub_session_type', [
  'work',
  'short_break',
  'long_break'
])

export const pomodoroSettings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  autoStartBreak: boolean('auto_start_break').default(false).notNull(),
  autoStartWork: boolean('auto_start_work').default(false).notNull(),
  notificationSound: varchar('notification_sound', { length: 255 }),
  workColor: varchar('work_color', { length: 255 }).notNull(),
  shortBreakColor: varchar('short_break_color', { length: 255 }).notNull(),
  longBreakColor: varchar('long_break_color', { length: 255 }).notNull(),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const pomodoroSessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workDuration: integer('work_duration').notNull(),
  shortBreakDuration: integer('short_break_duration').notNull(),
  longBreakDuration: integer('long_break_duration').notNull(),
  sessionUntilLongBreak: integer('session_until_long_break').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: pomodoroSessionStatusEnum('status').notNull(),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull()
})

export const pomodoroSubSessions = pgTable('sub_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: pomodoroSubSessionTypeEnum('type').notNull(),
  durationElapsed: integer('duration_elapsed').default(0).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  sessionId: uuid('session_id').references(() => pomodoroSessions.id, {
    onDelete: 'cascade'
  }),
  ended: timestamp('ended', { mode: 'date' }),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull()
})

export const tables = {
  settings: pomodoroSettings,
  sessions: pomodoroSessions,
  subSessions: pomodoroSubSessions
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  sessions: {
    subSessions: r.many.subSessions()
  },
  subSessions: {
    session: r.one.sessions({
      from: r.subSessions.sessionId,
      to: r.sessions.id
    })
  }
})
