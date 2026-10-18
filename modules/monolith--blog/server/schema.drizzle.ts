import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  check,
  index,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable('blog')

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('blog__categories_owner_idx').on(table.owner_id)]
)

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    excerpt: text('excerpt').notNull(),
    visibility: varchar('visibility', { length: 255 }).notNull(),
    category_id: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null'
    }),
    labels: varchar('labels', { length: 2000 }).notNull(),
    featured_image: varchar('featured_image', { length: 2048 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [
    index('blog__entries_owner_idx').on(table.owner_id),
    check(
      'blog__entries_visibility_check',
      sql`${table.visibility} in ('private', 'public', 'unlisted')`
    )
  ]
)

export const tables = { categories, entries }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
