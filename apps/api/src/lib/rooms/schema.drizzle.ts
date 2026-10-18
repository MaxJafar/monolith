import type { RelationsBuilder } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import type { RoomEnvelope } from '../../../../../packages/api/src/rooms/crypto'

export const rooms = pgTable(
  'rooms__rooms',
  {
    id: uuid('id').primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    workspace_id: uuid('workspace_id').notNull(),
    created_by: uuid('created_by').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    topic: varchar('topic', { length: 1000 }).notNull().default(''),
    kind: varchar('kind', { length: 16 }).notNull().default('channel'),
    member_ids: uuid('member_ids').array().notNull().default([]),
    direct_key: text('direct_key'),
    archived: boolean('archived').notNull().default(false),
    revision: integer('revision').notNull().default(1),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp('updated', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    uniqueIndex('rooms_identity_owner').on(t.id, t.owner_id),
    uniqueIndex('rooms_direct_identity').on(t.workspace_id, t.direct_key),
    index('rooms_workspace_updated').on(t.workspace_id, t.updated),
    check('rooms_kind', sql`${t.kind} in ('channel','private','direct')`),
    check(
      'rooms_members',
      sql`cardinality(${t.member_ids}) <= 100 and (${t.kind}='channel' or ${t.created_by}=any(${t.member_ids})) and (${t.kind}<>'direct' or cardinality(${t.member_ids})=2)`
    ),
    check('rooms_sequence', sql`${t.revision}>0`)
  ]
)

export const roomMessages = pgTable(
  'rooms__messages',
  {
    id: uuid('id').primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    room_id: uuid('room_id').notNull(),
    author_id: uuid('author_id').notNull(),
    author_name: varchar('author_name', { length: 255 }).notNull(),
    transaction_id: uuid('transaction_id').notNull(),
    seq: integer('seq').notNull(),
    thread_id: uuid('thread_id'),
    body: text('body').notNull(),
    sealed: jsonb('sealed').$type<RoomEnvelope>(),
    references: jsonb('references').$type<string[]>().notNull().default([]),
    revision: integer('revision').notNull().default(1),
    deleted: boolean('deleted').notNull().default(false),
    pinned: boolean('pinned').notNull().default(false),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    edited: timestamp('edited', { withTimezone: true })
  },
  t => [
    uniqueIndex('rooms_message_room_identity').on(t.room_id, t.id),
    uniqueIndex('rooms_message_sequence').on(t.room_id, t.seq),
    uniqueIndex('rooms_message_retry').on(
      t.room_id,
      t.author_id,
      t.transaction_id
    ),
    index('rooms_message_thread').on(t.room_id, t.thread_id, t.seq),
    foreignKey({
      name: 'rooms_message_owner',
      columns: [t.room_id, t.owner_id],
      foreignColumns: [rooms.id, rooms.owner_id]
    }).onDelete('cascade'),
    foreignKey({
      name: 'rooms_message_thread_room',
      columns: [t.room_id, t.thread_id],
      foreignColumns: [t.room_id, t.id]
    }),
    check(
      'rooms_message_size',
      sql`length(${t.body})<=16000 and jsonb_array_length(${t.references})<=20 and ${t.seq}>0 and ${t.revision}>0`
    ),
    check(
      'rooms_message_not_self_thread',
      sql`${t.thread_id} is null or ${t.thread_id}<>${t.id}`
    )
  ]
)

export const roomReactions = pgTable(
  'rooms__reactions',
  {
    owner_id: uuid('owner_id').notNull(),
    room_id: uuid('room_id').notNull(),
    message_id: uuid('message_id').notNull(),
    actor_id: uuid('actor_id').notNull(),
    emoji: varchar('emoji', { length: 32 }).notNull()
  },
  t => [
    primaryKey({ columns: [t.message_id, t.actor_id, t.emoji] }),
    foreignKey({
      name: 'rooms_reaction_message',
      columns: [t.room_id, t.message_id],
      foreignColumns: [roomMessages.room_id, roomMessages.id]
    }).onDelete('cascade')
  ]
)

export const roomReceipts = pgTable(
  'rooms__receipts',
  {
    owner_id: uuid('owner_id').notNull(),
    room_id: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    read_seq: integer('read_seq').notNull().default(0),
    muted: boolean('muted').notNull().default(false),
    updated: timestamp('updated', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    primaryKey({ columns: [t.room_id, t.owner_id] }),
    check('rooms_receipt_sequence', sql`${t.read_seq}>=0`)
  ]
)

export const roomIdentities = pgTable('rooms__identities', {
  owner_id: uuid('owner_id').primaryKey(),
  agreement: text('agreement').notNull(),
  signing: text('signing').notNull(),
  created: timestamp('created', { withTimezone: true }).notNull().defaultNow()
})

export const roomFiles = pgTable(
  'rooms__files',
  {
    id: uuid('id').primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    room_id: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    uploader_id: uuid('uploader_id').notNull(),
    message_id: uuid('message_id'),
    complete: boolean('complete').notNull().default(false),
    size: integer('size').notNull(),
    hash: varchar('hash', { length: 43 }).notNull(),
    created: timestamp('created', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    uniqueIndex('rooms_file_room_identity').on(t.room_id, t.id),
    index('rooms_file_quota').on(t.room_id, t.uploader_id, t.created),
    foreignKey({
      name: 'rooms_file_message',
      columns: [t.room_id, t.message_id],
      foreignColumns: [roomMessages.room_id, roomMessages.id]
    }).onDelete('cascade'),
    check('rooms_file_size', sql`${t.size} between 16 and 20971536`)
  ]
)

export const roomFileChunks = pgTable(
  'rooms__file_chunks',
  {
    owner_id: uuid('owner_id').notNull(),
    room_id: uuid('room_id').notNull(),
    file_id: uuid('file_id').notNull(),
    part: integer('part').notNull(),
    data: text('data').notNull()
  },
  t => [
    primaryKey({ columns: [t.file_id, t.part] }),
    foreignKey({
      name: 'rooms_chunk_file',
      columns: [t.room_id, t.file_id],
      foreignColumns: [roomFiles.room_id, roomFiles.id]
    }).onDelete('cascade'),
    check(
      'rooms_chunk_size',
      sql`${t.part} between 0 and 80 and length(${t.data})<=349526`
    )
  ]
)

export const tables = {
  rooms,
  roomMessages,
  roomReactions,
  roomReceipts,
  roomIdentities,
  roomFiles,
  roomFileChunks
}

export const relations = (_r: RelationsBuilder<typeof tables>) => ({})

const actor = "nullif(current_setting('zillion.user_id',true),'')::uuid"
const workspace = `exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id)`
const editor = `exists(select 1 from zillion_databases__workspaces w where w.id=workspace_id and (w.owner_id=${actor} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=w.id and m.user_id=${actor} and m.role='editor')))`
const visible = `${workspace} and (kind='channel' or ${actor}=any(member_ids))`
const roomRead = 'exists(select 1 from rooms__rooms r where r.id=room_id)'
const roomWrite = `exists(select 1 from rooms__rooms r where r.id=room_id and not r.archived and ${editor})`

function policy(
  table: string,
  read: string,
  insert: string,
  update = insert,
  remove = update
) {
  return `alter table ${table} enable row level security;
    alter table ${table} force row level security;
    drop policy if exists zillion_owner on ${table};
    drop policy if exists rooms_read on ${table}; drop policy if exists rooms_insert on ${table};
    drop policy if exists rooms_update on ${table}; drop policy if exists rooms_delete on ${table};
    create policy rooms_read on ${table} for select using (${read});
    create policy rooms_insert on ${table} for insert with check (${insert});
    create policy rooms_update on ${table} for update using (${update}) with check (${update});
    create policy rooms_delete on ${table} for delete using (${remove});`
}

export const databaseMigrations = [
  `do $$ begin
    if not exists(select 1 from pg_constraint where conname='rooms_workspace_owner') then
      alter table rooms__rooms add constraint rooms_workspace_owner foreign key(owner_id,workspace_id) references zillion_databases__workspaces(owner_id,id) on delete cascade;
    end if;
  end $$;`,
  policy(
    'rooms__rooms',
    visible,
    `${editor} and created_by=${actor}`,
    `${visible} and ${editor} and (created_by=${actor} or owner_id=${actor})`
  ),
  policy(
    'rooms__messages',
    roomRead,
    `${roomWrite} and author_id=${actor}`,
    `${roomWrite} and (author_id=${actor} or exists(select 1 from rooms__rooms r where r.id=room_id and (r.created_by=${actor} or r.owner_id=${actor})))`
  ),
  policy('rooms__reactions', roomRead, `${roomWrite} and actor_id=${actor}`),
  policy(
    'rooms__receipts',
    `owner_id=${actor} and ${roomRead}`,
    `owner_id=${actor} and ${roomRead}`
  ),
  policy('rooms__identities', 'true', `owner_id=${actor}`, 'false', 'false'),
  policy(
    'rooms__files',
    roomRead,
    `${roomWrite} and uploader_id=${actor}`,
    `${roomWrite} and uploader_id=${actor}`,
    `${roomWrite} and (uploader_id=${actor} or exists(select 1 from rooms__rooms r where r.id=room_id and (r.created_by=${actor} or r.owner_id=${actor})))`
  ),
  policy(
    'rooms__file_chunks',
    `${roomRead} and exists(select 1 from rooms__files f where f.id=file_id and ((f.message_id is null and f.uploader_id=${actor}) or exists(select 1 from rooms__messages m where m.id=f.message_id and not m.deleted)))`,
    `${roomWrite} and exists(select 1 from rooms__files f where f.id=file_id and f.uploader_id=${actor} and f.message_id is null and not f.complete)`
  ),
  `do $$ begin if not exists(select 1 from pg_constraint where conname='rooms_identity_user') then alter table rooms__identities add constraint rooms_identity_user foreign key(owner_id) references users(id) on delete cascade; end if; end $$;`
]
