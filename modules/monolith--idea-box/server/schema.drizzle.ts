import { type RelationsBuilder } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@monolith/drizzle'

const pgTable = createModuleTable()

export const ideaBoxEntryTypeEnum = pgEnum('idea_box_entry_type', [
  'text',
  'image',
  'link'
])

export const ideaBoxContainers = pgTable('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default(''),
  cover: text('cover').notNull().default(''),
  pinned: boolean('pinned').notNull().default(false),
  hidden: boolean('hidden').notNull().default(false)
})

export const ideaBoxFolders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  container: uuid('container').references(() => ideaBoxContainers.id, {
    onDelete: 'cascade'
  }),
  name: text('name').notNull().default(''),
  color: text('color').notNull().default(''),
  icon: text('icon').notNull().default(''),
  parent: uuid('parent').references((): AnyPgColumn => ideaBoxFolders.id, {
    onDelete: 'cascade'
  })
})

export const ideaBoxEntries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: ideaBoxEntryTypeEnum('type').notNull().default('text'),
  container: uuid('container')
    .notNull()
    .references(() => ideaBoxContainers.id, { onDelete: 'cascade' }),
  folder: uuid('folder').references(() => ideaBoxFolders.id, {
    onDelete: 'cascade'
  }),
  pinned: boolean('pinned').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
  updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
})

export const ideaBoxTags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().default(''),
  icon: text('icon').notNull().default(''),
  color: text('color').notNull().default(''),
  container: uuid('container').references(() => ideaBoxContainers.id, {
    onDelete: 'cascade'
  })
})

export const ideaBoxEntriesText = pgTable('entries_text', {
  id: uuid('id').defaultRandom().primaryKey(),
  base_entry: uuid('base_entry')
    .notNull()
    .references(() => ideaBoxEntries.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default('')
})

export const ideaBoxEntriesLink = pgTable('entries_link', {
  id: uuid('id').defaultRandom().primaryKey(),
  base_entry: uuid('base_entry')
    .notNull()
    .references(() => ideaBoxEntries.id, { onDelete: 'cascade' }),
  link: text('link').notNull().default('')
})

export const ideaBoxEntriesImage = pgTable('entries_image', {
  id: uuid('id').defaultRandom().primaryKey(),
  base_entry: uuid('base_entry')
    .notNull()
    .references(() => ideaBoxEntries.id, { onDelete: 'cascade' }),
  image: text('image').notNull().default('')
})

export const tables = {
  containers: ideaBoxContainers,
  folders: ideaBoxFolders,
  entries: ideaBoxEntries,
  tags: ideaBoxTags,
  entries_text: ideaBoxEntriesText,
  entries_link: ideaBoxEntriesLink,
  entries_image: ideaBoxEntriesImage
}

export const relations = (r: RelationsBuilder<typeof tables>) => ({
  folders: {
    container_info: r.one.containers({
      from: r.folders.container,
      to: r.containers.id
    }),
    parent_info: r.one.folders({
      from: r.folders.parent,
      to: r.folders.id
    })
  },
  entries: {
    container_info: r.one.containers({
      from: r.entries.container,
      to: r.containers.id
    }),
    folder_info: r.one.folders({
      from: r.entries.folder,
      to: r.folders.id
    })
  },
  tags: {
    container_info: r.one.containers({
      from: r.tags.container,
      to: r.containers.id
    })
  },
  entries_text: {
    base_entry_info: r.one.entries({
      from: r.entries_text.base_entry,
      to: r.entries.id
    })
  },
  entries_link: {
    base_entry_info: r.one.entries({
      from: r.entries_link.base_entry,
      to: r.entries.id
    })
  },
  entries_image: {
    base_entry_info: r.one.entries({
      from: r.entries_image.base_entry,
      to: r.entries.id
    })
  }
})
