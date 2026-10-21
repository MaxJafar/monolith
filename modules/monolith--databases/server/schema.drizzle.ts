import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

import type { Appearance } from '@monolith/blocks'
import { createModuleTable } from '@monolith/drizzle'

import type { Schedule, ScheduleRow } from '../calendarShared'
import type {
  CellValue,
  FieldConfig,
  FieldKind,
  PageTemplate,
  RecordPage,
  TableType,
  ViewConfig
} from '../shared'
import type { ItemType, NativeSourceKind } from '../workspaceShared'
import { workspaceMembers, workspacePages, workspaces } from './workspaceSchema'

export { workspaces, workspaceMembers, workspacePages } from './workspaceSchema'

export { databaseMigrations } from './workspaceMigrations'

export { rpgCampaigns } from './urpgSchema'

export { workspaceHabits } from './widgetSchema'

const table = createModuleTable('zillion_databases')

export const bases = table(
  'bases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').references(() => workspaces.id, {
      onDelete: 'cascade'
    }),
    source_type: varchar('source_type', { length: 20 }).$type<ItemType>(),
    table_type: varchar('table_type', { length: 20 }).$type<TableType>(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    templates: jsonb('templates').$type<PageTemplate[]>().notNull().default([]),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  t => [
    index('zillion_bases_owner').on(t.owner_id),
    index('monolith_bases_workspace').on(t.workspace_id),
    uniqueIndex('monolith_bases_workspace_identity').on(t.workspace_id, t.id),
    uniqueIndex('monolith_bases_native_source').on(
      t.workspace_id,
      t.source_type
    )
  ]
)

export const fields = table(
  'fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    base_id: uuid('base_id')
      .notNull()
      .references(() => bases.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    kind: varchar('kind', { length: 20 }).$type<FieldKind>().notNull(),
    config: jsonb('config').$type<FieldConfig>().notNull(),
    target_base_id: uuid('target_base_id').references(() => bases.id, {
      onDelete: 'cascade'
    }),
    position: integer('position').notNull().default(0)
  },
  t => [index('zillion_fields_owner_base').on(t.owner_id, t.base_id)]
)

export const records = table(
  'records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    base_id: uuid('base_id')
      .notNull()
      .references(() => bases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    item_type: varchar('item_type', { length: 20 })
      .$type<ItemType>()
      .notNull()
      .default('page'),
    content: text('content').notNull().default(''),
    description: text('description').notNull().default(''),
    appearance: jsonb('appearance').$type<Appearance>().notNull().default({}),
    comments: jsonb('comments')
      .$type<NonNullable<RecordPage['comments']>>()
      .notNull()
      .default([]),
    created_by: uuid('created_by'),
    updated_by: uuid('updated_by'),
    done: boolean('done').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull().default('planned'),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    date: timestamp('date', { mode: 'date', withTimezone: true }),
    end_date: timestamp('end_date', { mode: 'date', withTimezone: true }),
    project_id: uuid('project_id').references((): AnyPgColumn => records.id, {
      onDelete: 'set null'
    }),
    values: jsonb('values')
      .$type<Record<string, CellValue>>()
      .notNull()
      .default({}),
    created: timestamp('created', { mode: 'date' }).defaultNow().notNull(),
    updated: timestamp('updated', { mode: 'date' }).defaultNow().notNull()
  },
  t => [
    index('zillion_records_owner_base').on(t.owner_id, t.base_id),
    index('monolith_records_item_type').on(t.base_id, t.item_type),
    uniqueIndex('monolith_records_owner_identity').on(t.owner_id, t.id),
    uniqueIndex('monolith_records_base_identity').on(t.base_id, t.id),
    check(
      'monolith_record_item_type',
      sql`${t.item_type} in ('page','task','note','project','event','post')`
    )
  ]
)

export const calendarSchedules = table(
  'calendar_schedules',
  {
    record_id: uuid('record_id')
      .primaryKey()
      .references(() => records.id, { onDelete: 'cascade' }),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    organizer_id: uuid('organizer_id').notNull(),
    revision: integer('revision').notNull().default(1),
    settings: jsonb('settings').$type<Schedule>().notNull(),
    responses: jsonb('responses')
      .$type<ScheduleRow['responses']>()
      .notNull()
      .default({}),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [index('monolith_calendar_workspace').on(t.owner_id, t.workspace_id)]
)

export const calendarNotifications = table(
  'calendar_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    record_id: uuid('record_id')
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    recipient_id: uuid('recipient_id').notNull(),
    dedupe_key: text('dedupe_key').notNull(),
    kind: varchar('kind', { length: 24 })
      .$type<'invitation' | 'changed' | 'reminder'>()
      .notNull(),
    title: text('title').notNull(),
    starts_at: timestamp('starts_at', {
      mode: 'date',
      withTimezone: true
    }).notNull(),
    read: boolean('read').notNull().default(false),
    email_status: varchar('email_status', { length: 24 })
      .$type<'disabled' | 'pending' | 'sent' | 'failed'>()
      .notNull()
      .default('disabled'),
    attempts: integer('attempts').notNull().default(0),
    email_payload: jsonb('email_payload').$type<{
      to: string
      subject: string
      text: string
      from: string
    }>(),
    next_attempt: timestamp('next_attempt', {
      mode: 'date',
      withTimezone: true
    })
      .defaultNow()
      .notNull(),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    uniqueIndex('monolith_calendar_notification_once').on(
      t.owner_id,
      t.dedupe_key
    ),
    index('monolith_calendar_recipient').on(
      t.owner_id,
      t.recipient_id,
      t.created
    )
  ]
)

export const recordSources = table(
  'record_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    record_id: uuid('record_id')
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 20 }).$type<NativeSourceKind>().notNull(),
    native_id: uuid('native_id').notNull()
  },
  t => [
    uniqueIndex('monolith_source_identity').on(t.owner_id, t.kind, t.native_id),
    uniqueIndex('monolith_record_source_kind').on(t.record_id, t.kind),
    index('monolith_record_sources_record').on(t.record_id),
    check(
      'monolith_source_kind',
      sql`${t.kind} in ('todo','project-task','project','note','event','post')`
    )
  ]
)

export const views = table(
  'views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    base_id: uuid('base_id')
      .notNull()
      .references(() => bases.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    mode: varchar('mode', { length: 20 })
      .$type<
        | 'table'
        | 'kanban'
        | 'calendar'
        | 'gallery'
        | 'list'
        | 'chart'
        | 'dashboard'
        | 'timeline'
      >()
      .notNull(),
    group_field_id: uuid('group_field_id').references(() => fields.id, {
      onDelete: 'set null'
    }),
    config: jsonb('config').$type<ViewConfig>().notNull()
  },
  t => [index('zillion_views_owner_base').on(t.owner_id, t.base_id)]
)

export const links = table(
  'links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    field_id: uuid('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    source_record_id: uuid('source_record_id')
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' }),
    target_record_id: uuid('target_record_id')
      .notNull()
      .references(() => records.id, { onDelete: 'cascade' })
  },
  t => [
    uniqueIndex('zillion_links_unique').on(
      t.field_id,
      t.source_record_id,
      t.target_record_id
    ),
    index('zillion_links_owner').on(t.owner_id)
  ]
)

export const documents = table(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull().default(''),
    parent_id: uuid('parent_id').references((): AnyPgColumn => documents.id, {
      onDelete: 'set null'
    }),
    revision: integer('revision').notNull().default(1),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updated: timestamp('updated', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    index('zillion_documents_owner_parent').on(t.owner_id, t.parent_id),
    check(
      'zillion_document_no_self',
      sql`${t.parent_id} is null or ${t.parent_id} <> ${t.id}`
    )
  ]
)

// Typed endpoints keep semantic links subject to real foreign-key cascades.
export const knowledgeLinks = table(
  'knowledge_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    source_key: varchar('source_key', { length: 50 }).notNull(),
    target_key: varchar('target_key', { length: 50 }).notNull(),
    source_document_id: uuid('source_document_id').references(
      () => documents.id,
      { onDelete: 'cascade' }
    ),
    source_page_id: uuid('source_page_id').references(() => workspacePages.id, {
      onDelete: 'cascade'
    }),
    source_record_id: uuid('source_record_id').references(() => records.id, {
      onDelete: 'cascade'
    }),
    source_note_id: uuid('source_note_id'),
    target_document_id: uuid('target_document_id').references(
      () => documents.id,
      { onDelete: 'cascade' }
    ),
    target_page_id: uuid('target_page_id').references(() => workspacePages.id, {
      onDelete: 'cascade'
    }),
    target_record_id: uuid('target_record_id').references(() => records.id, {
      onDelete: 'cascade'
    }),
    target_note_id: uuid('target_note_id'),
    label: varchar('label', { length: 255 }).notNull().default('Related'),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    uniqueIndex('zillion_knowledge_links_unique').on(
      t.owner_id,
      t.source_key,
      t.target_key
    ),
    index('zillion_knowledge_links_owner').on(t.owner_id),
    check(
      'zillion_knowledge_source_one',
      sql`num_nonnulls(${t.source_document_id}, ${t.source_page_id}, ${t.source_record_id}, ${t.source_note_id}) = 1`
    ),
    check(
      'zillion_knowledge_target_one',
      sql`num_nonnulls(${t.target_document_id}, ${t.target_page_id}, ${t.target_record_id}, ${t.target_note_id}) = 1`
    ),
    check(
      'zillion_knowledge_canonical',
      sql`${t.source_key} < ${t.target_key}`
    ),
    check(
      'zillion_knowledge_keys',
      sql`
    ${t.source_key} = coalesce('document:' || ${t.source_document_id}::text, 'document:' || ${t.source_page_id}::text, 'record:' || ${t.source_record_id}::text, 'note:' || ${t.source_note_id}::text)
    and ${t.target_key} = coalesce('document:' || ${t.target_document_id}::text, 'document:' || ${t.target_page_id}::text, 'record:' || ${t.target_record_id}::text, 'note:' || ${t.target_note_id}::text)
  `
    )
  ]
)

export const knowledgeCollections = table(
  'knowledge_collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updated: timestamp('updated', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    foreignKey({
      name: 'monolith_knowledge_collection_owner',
      columns: [t.owner_id, t.workspace_id],
      foreignColumns: [workspaces.owner_id, workspaces.id]
    }).onDelete('cascade'),
    uniqueIndex('monolith_knowledge_collection_scope').on(t.workspace_id, t.id),
    index('monolith_knowledge_collection_owner_index').on(
      t.owner_id,
      t.workspace_id
    )
  ]
)

/** Links retain canonical documents; only imported text has a content copy. */
export const knowledgeSources = table(
  'knowledge_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    collection_id: uuid('collection_id').notNull(),
    kind: varchar('kind', { length: 12 })
      .$type<'page' | 'record' | 'text'>()
      .notNull(),
    page_id: uuid('page_id'),
    record_base_id: uuid('record_base_id'),
    record_id: uuid('record_id'),
    title: varchar('title', { length: 255 }).notNull().default(''),
    imported_content: text('imported_content'),
    media_type: varchar('media_type', { length: 24 }).$type<
      'text/plain' | 'text/markdown'
    >(),
    created: timestamp('created', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updated: timestamp('updated', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
  },
  t => [
    foreignKey({
      name: 'monolith_knowledge_source_owner',
      columns: [t.owner_id, t.workspace_id],
      foreignColumns: [workspaces.owner_id, workspaces.id]
    }).onDelete('cascade'),
    foreignKey({
      name: 'monolith_knowledge_source_collection',
      columns: [t.workspace_id, t.collection_id],
      foreignColumns: [
        knowledgeCollections.workspace_id,
        knowledgeCollections.id
      ]
    }).onDelete('cascade'),
    foreignKey({
      name: 'monolith_knowledge_source_page',
      columns: [t.workspace_id, t.page_id],
      foreignColumns: [workspacePages.workspace_id, workspacePages.id]
    }).onDelete('cascade'),
    foreignKey({
      name: 'monolith_knowledge_source_base',
      columns: [t.workspace_id, t.record_base_id],
      foreignColumns: [bases.workspace_id, bases.id]
    }).onDelete('cascade'),
    foreignKey({
      name: 'monolith_knowledge_source_record',
      columns: [t.record_base_id, t.record_id],
      foreignColumns: [records.base_id, records.id]
    }).onDelete('cascade'),
    foreignKey({
      name: 'monolith_knowledge_source_record_owner',
      columns: [t.owner_id, t.record_id],
      foreignColumns: [records.owner_id, records.id]
    }).onDelete('cascade'),
    index('monolith_knowledge_sources_workspace').on(
      t.workspace_id,
      t.collection_id
    ),
    index('monolith_knowledge_sources_owner').on(t.owner_id),
    index('monolith_knowledge_sources_page').on(t.workspace_id, t.page_id),
    index('monolith_knowledge_sources_record').on(
      t.record_base_id,
      t.record_id
    ),
    uniqueIndex('monolith_knowledge_source_page_unique').on(
      t.collection_id,
      t.page_id
    ),
    uniqueIndex('monolith_knowledge_source_record_unique').on(
      t.collection_id,
      t.record_id
    ),
    check(
      'monolith_knowledge_source_shape',
      sql`
      (${t.kind}='page' and ${t.page_id} is not null and ${t.record_id} is null and ${t.record_base_id} is null and ${t.imported_content} is null and ${t.media_type} is null)
      or (${t.kind}='record' and ${t.page_id} is null and ${t.record_id} is not null and ${t.record_base_id} is not null and ${t.imported_content} is null and ${t.media_type} is null)
      or (${t.kind}='text' and ${t.page_id} is null and ${t.record_id} is null and ${t.record_base_id} is null and ${t.imported_content} is not null and ${t.media_type} is not null and ${t.media_type} in ('text/plain','text/markdown') and char_length(${t.imported_content}) between 1 and 200000)
    `
    )
  ]
)

export const tables = {
  calendarSchedules,
  calendarNotifications,
  workspaces,
  workspaceMembers,
  workspacePages,
  bases,
  fields,
  records,
  recordSources,
  views,
  links,
  documents,
  knowledgeLinks,
  knowledgeCollections,
  knowledgeSources
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({
  workspaces: {},
  workspaceMembers: {},
  workspacePages: {},
  bases: {},
  fields: {},
  records: {},
  recordSources: {},
  views: {},
  links: {},
  documents: {},
  knowledgeLinks: {},
  knowledgeCollections: {},
  knowledgeSources: {}
})
