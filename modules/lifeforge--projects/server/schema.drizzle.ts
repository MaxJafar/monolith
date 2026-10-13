import { type RelationsBuilder } from 'drizzle-orm'
import {
  boolean,
  index,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@lifeforge/drizzle'

const pgTable = createModuleTable('projects')

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__categories_owner_idx').on(table.owner_id)]
)

export const statuses = pgTable(
  'statuses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__statuses_owner_idx').on(table.owner_id)]
)

export const technologies = pgTable(
  'technologies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__technologies_owner_idx').on(table.owner_id)]
)

export const visibilities = pgTable(
  'visibilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__visibilities_owner_idx').on(table.owner_id)]
)

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    category_id: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null'
    }),
    status_id: uuid('status_id').references(() => statuses.id, {
      onDelete: 'set null'
    }),
    visibility_id: uuid('visibility_id').references(() => visibilities.id, {
      onDelete: 'set null'
    }),
    technology_ids: jsonb('technology_ids')
      .$type<string[]>()
      .default([])
      .notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__entries_owner_idx').on(table.owner_id)]
)

export const columns = pgTable(
  'columns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    project_id: uuid('project_id')
      .references(() => entries.id, { onDelete: 'cascade' })
      .notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__columns_owner_idx').on(table.owner_id)]
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    column_id: uuid('column_id')
      .references(() => columns.id, { onDelete: 'cascade' })
      .notNull(),
    completed: boolean('completed').default(false).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('projects__tasks_owner_idx').on(table.owner_id)]
)

export const tables = {
  categories,
  statuses,
  technologies,
  visibilities,
  entries,
  columns,
  tasks
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
