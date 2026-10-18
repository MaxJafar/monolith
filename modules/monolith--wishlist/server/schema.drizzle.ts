import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable('wishlist')

export const lists = pgTable(
  'lists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('wishlist__lists_owner_idx').on(table.owner_id)]
)

export const entries = pgTable(
  'entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    price: doublePrecision('price').default(0).notNull(),
    list_id: uuid('list_id')
      .references(() => lists.id, { onDelete: 'cascade' })
      .notNull(),
    image: varchar('image', { length: 2048 }).notNull(),
    bought: boolean('bought').default(false).notNull(),
    bought_at: timestamp('bought_at', { mode: 'date' }),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [
    index('wishlist__entries_owner_idx').on(table.owner_id),
    check('wishlist__entries_price_check', sql`${table.price} >= 0`)
  ]
)

export const tables = { lists, entries }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
