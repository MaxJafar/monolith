import { type RelationsBuilder } from 'drizzle-orm'
import { boolean, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable()

export const todoLists = pgTable('lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default('')
})

export const todoTags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default('')
})

export const todoPriorities = pgTable('priorities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  color: text('color').notNull().default('')
})

export const todoEntries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  summary: text('summary').notNull().default(''),
  notes: text('notes').notNull().default(''),
  due_date: timestamp('due_date', { mode: 'date' }),
  due_date_has_time: boolean('due_date_has_time').notNull().default(false),
  list: uuid('list').references(() => todoLists.id, { onDelete: 'set null' }),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  priority: uuid('priority').references(() => todoPriorities.id, {
    onDelete: 'set null'
  }),
  done: boolean('done').notNull().default(false),
  completed_at: timestamp('completed_at', { mode: 'date' }),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const tables = {
  lists: todoLists,
  tags: todoTags,
  priorities: todoPriorities,
  entries: todoEntries
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  entries: {
    list_info: r.one.lists({ from: r.entries.list, to: r.lists.id }),
    priority_info: r.one.priorities({
      from: r.entries.priority,
      to: r.priorities.id
    })
  },
  lists: {
    entries: r.many.entries()
  },
  priorities: {
    entries: r.many.entries()
  }
})
