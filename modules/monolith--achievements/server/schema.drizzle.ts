import { type RelationsBuilder } from 'drizzle-orm'
import { pgEnum, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable()

export const difficultyEnum = pgEnum('difficulty', [
  'easy',
  'medium',
  'hard',
  'impossible'
])

export const achievementsCategories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 255 }).notNull()
})

export const achievementsEntries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  thoughts: text('thoughts').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  category_id: uuid('category_id').references(() => achievementsCategories.id, {
    onDelete: 'set null'
  }),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const tables = {
  categories: achievementsCategories,
  entries: achievementsEntries
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  categories: {
    entries: r.many.entries()
  },
  entries: {
    category: r.one.categories({
      from: r.entries.category_id,
      to: r.categories.id
    })
  }
})
