// SPDX-License-Identifier: 0BSD
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

// Agents owns these work queues. Keep persisted table names and IDs so existing
// agent runs and Gym coaching jobs remain connected after the old addon is removed.
const identity = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull(),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})
const label = (name: string) => varchar(name, { length: 255 }).notNull()
export const entries = pgTable(
  'projects__entries',
  {
    ...identity(),
    name: label('name'),
    description: text('description').notNull(),
    color: label('color'),
    icon: label('icon'),
    category_id: uuid('category_id'),
    status_id: uuid('status_id'),
    visibility_id: uuid('visibility_id'),
    technology_ids: jsonb('technology_ids')
      .$type<string[]>()
      .default([])
      .notNull()
  },
  t => [index('projects__entries_owner_idx').on(t.owner_id)]
)
export const columns = pgTable(
  'projects__columns',
  {
    ...identity(),
    name: label('name'),
    color: label('color'),
    icon: label('icon'),
    project_id: uuid('project_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' })
  },
  t => [index('projects__columns_owner_idx').on(t.owner_id)]
)
export const tasks = pgTable(
  'projects__tasks',
  {
    ...identity(),
    title: label('title'),
    content: text('content').notNull(),
    column_id: uuid('column_id')
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    completed: boolean('completed').default(false).notNull()
  },
  t => [index('projects__tasks_owner_idx').on(t.owner_id)]
)
