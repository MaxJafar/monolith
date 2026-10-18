import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable('flashcards')

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 255 }).notNull(),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('flashcards__tags_owner_idx').on(table.owner_id)]
)

export const decks = pgTable(
  'decks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    tag_id: uuid('tag_id').references(() => tags.id, { onDelete: 'set null' }),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [index('flashcards__decks_owner_idx').on(table.owner_id)]
)

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    deck_id: uuid('deck_id')
      .references(() => decks.id, { onDelete: 'cascade' })
      .notNull(),
    reviews: integer('reviews').default(0).notNull(),
    correct: integer('correct').default(0).notNull(),
    next_review: timestamp('next_review', { mode: 'date' }),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  table => [
    index('flashcards__cards_owner_idx').on(table.owner_id),
    check(
      'flashcards__cards_reviews_check',
      sql`${table.reviews} >= 0 and ${table.correct} >= 0 and ${table.correct} <= ${table.reviews}`
    )
  ]
)

export const tables = { tags, decks, cards }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})
