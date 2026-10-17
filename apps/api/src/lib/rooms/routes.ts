import { ClientError, createMonolith } from '@monolith/server-utils'
import { type SQL, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import { entityKey } from '../entities/model'
import { findEntities } from '../entities/registry'
import {
  type Store,
  type StoredRoom,
  changed,
  roomAccess,
  workspaceAccess,
  workspacePeople
} from './access'
import { attachFiles } from './attachments'
import { sealedDto, validateSealed } from './encryption'
import {
  type Message,
  emojis,
  messageDto,
  messageInput,
  roomDto,
  roomQuery,
  workspaceQuery
} from './model'

const endpoints = createMonolith({ moduleId: 'rooms' })
const identity = z.object({ id: z.uuid() })
const conflict = () =>
  new ClientError('This item changed elsewhere. Reload before saving.', 409)

export async function listRooms(
  db: Store,
  actor: string,
  workspaceId: string,
  id?: string
) {
  const workspace = await workspaceAccess(db, actor, workspaceId)
  const rows = await db.execute<
    StoredRoom & { unread: number; mentions: number; muted: boolean }
  >(sql`
    select r.id,r.owner_id,r.workspace_id,r.created_by,r.name,r.topic,r.kind,r.member_ids,r.archived,r.revision,
      greatest(r.updated,coalesce((select max(m.created) from rooms__messages m where m.room_id=r.id),r.updated))::text as updated,
      (select coalesce(max(m.seq),0)::int from rooms__messages m where m.room_id=r.id) as last_seq,
      (select count(*)::int from rooms__messages m where m.room_id=r.id and not m.deleted and m.author_id<>${actor} and m.seq>coalesce(s.read_seq,0)) as unread,
      (select count(*)::int from rooms__messages m where m.room_id=r.id and not m.deleted and m.author_id<>${actor} and m.seq>coalesce(s.read_seq,0) and m."references" ? ${'user:' + actor}) as mentions,
      coalesce(s.muted,false) as muted
    from rooms__rooms r left join rooms__receipts s on s.room_id=r.id and s.owner_id=${actor}
    where r.workspace_id=${workspaceId} ${id ? sql`and r.id=${id}` : sql``}
    order by r.archived,updated desc,r.id limit 501`)

  if (rows.length > 500)
    throw new ClientError('Room directory limit reached', 413)

  return rows.map(row =>
    roomDto.parse({
      ...row,
      can_write: workspace.role !== 'viewer' && !row.archived,
      can_manage:
        workspace.role !== 'viewer' &&
        (row.created_by === actor || workspace.role === 'owner')
    })
  )
}

export const list = endpoints
  .query({
    description:
      'Core room directory with account-specific unread and mention counts',
    input: { query: workspaceQuery },
    output: { OK: z.array(roomDto) }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(await listRooms(db, res.locals.userId, query.workspace_id))
  )

export const people = endpoints
  .query({
    description: 'List participants eligible for this workspace',
    input: { query: workspaceQuery },
    output: {
      OK: z.array(
        z.object({ id: z.uuid(), name: z.string(), role: z.string() })
      )
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const workspace = await workspaceAccess(
      db,
      res.locals.userId,
      query.workspace_id
    )

    return response.ok(await workspacePeople(db, res.locals.userId, workspace))
  })

export const create = endpoints
  .mutation({
    description:
      'Create a channel, private room or direct conversation inside a workspace',
    input: {
      body: workspaceQuery.extend({
        id: z.uuid(),
        name: z.string().trim().min(1).max(100),
        topic: z.string().trim().max(1000).default(''),
        kind: z.enum(['channel', 'private', 'direct']),
        member_ids: z.array(z.uuid()).max(99).default([])
      })
    },
    output: { OK: identity }
  })
  .callback(async ({ db, res, body, response }) => {
    const actor = res.locals.userId as string
    const workspace = await workspaceAccess(db, actor, body.workspace_id, true)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':room-create'},0))`
    )
    const [existing] = await db.execute<{ id: string; created_by: string }>(
      sql`select id,created_by from rooms__rooms where id=${body.id} and workspace_id=${workspace.id}`
    )

    if (existing) {
      if (existing.created_by !== actor) throw conflict()

      return response.ok({ id: existing.id })
    }

    const members = [...new Set([actor, ...body.member_ids])].sort()

    if (body.kind === 'direct' && members.length !== 2)
      throw new ClientError('Choose one other person for a direct conversation')

    const available = new Set(
      (await workspacePeople(db, actor, workspace)).map(person => person.id)
    )

    if (members.some(id => !available.has(id)))
      throw new ClientError('Participants must belong to this workspace')

    const key = body.kind === 'direct' ? members.join(':') : null

    if (key) {
      const [existingDirect] = await db.execute<{ id: string }>(
        sql`select id from rooms__rooms where workspace_id=${workspace.id} and direct_key=${key}`
      )

      if (existingDirect) return response.ok(existingDirect)
    }
    await db.execute(sql`insert into rooms__rooms(id,owner_id,workspace_id,created_by,name,topic,kind,member_ids,direct_key)
    values(${body.id},${workspace.owner_id},${workspace.id},${actor},${body.name},${body.topic},${body.kind},${sql.param(body.kind === 'channel' ? [] : members)}::uuid[],${key})`)
    const { room } = await roomAccess(db, actor, workspace.id, body.id)
    await changed(db, room)

    return response.ok({ id: body.id })
  })

export const update = endpoints
  .mutation({
    description: 'Manage a room with a revision guard',
    input: {
      query: roomQuery,
      body: z.object({
        expected_revision: z.number().int().positive(),
        name: z.string().trim().min(1).max(100),
        topic: z.string().trim().max(1000),
        archived: z.boolean(),
        member_ids: z.array(z.uuid()).max(100)
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = res.locals.userId as string
    const { room, workspace } = await roomAccess(
      db,
      actor,
      query.workspace_id,
      query.room_id,
      true,
      true
    )

    if (room.revision !== body.expected_revision) throw conflict()

    const members = [...new Set([room.created_by, ...body.member_ids])].sort()

    if (
      room.kind === 'direct' &&
      members.join(':') !== [...room.member_ids].sort().join(':')
    )
      throw new ClientError('Direct conversation participants cannot change')

    const available = new Set(
      (await workspacePeople(db, actor, workspace)).map(person => person.id)
    )

    // Existing memberships are inert after workspace revocation. Retaining them
    // must not prevent an authorized manager from archiving or editing the room.
    if (
      room.kind !== 'channel' &&
      members.some(id => !available.has(id) && !room.member_ids.includes(id))
    )
      throw new ClientError('Participants must belong to this workspace')
    await db.execute(sql`update rooms__rooms set name=${body.name},topic=${body.topic},archived=${body.archived},
    member_ids=${sql.param(room.kind === 'channel' ? [] : members)}::uuid[],revision=revision+1,updated=now() where id=${room.id}`)
    await changed(db, room)

    return response.ok(true)
  })

type StoredMessage = Omit<Message, 'references' | 'reactions' | 'replies'> & {
  references: string[]
  replies: number
  reactions: Message['reactions']
}

const selection = sql`m.id,m.room_id,m.author_id,m.author_name,m.seq,m.thread_id,m.transaction_id,m.sealed,m.body,m."references",m.revision,m.deleted,m.pinned,m.created::text as created,m.edited::text as edited,
  (select count(*)::int from rooms__messages reply where reply.room_id=m.room_id and reply.thread_id=m.id and not reply.deleted) as replies`

async function hydrate(
  db: Store,
  actor: string,
  workspaceId: string,
  rows: StoredMessage[]
) {
  if (!rows.length) return []

  const keys = [
    ...new Set(rows.flatMap(row => (row.deleted ? [] : row.references)))
  ]
  const entities = new Map(
    (keys.length
      ? await findEntities(db, actor, workspaceId, '', keys)
      : []
    ).map(entity => [entity.key, entity])
  )
  const reactions = await db.execute<{
    message_id: string
    emoji: string
    count: number
    mine: boolean
  }>(sql`
    select message_id,emoji,count(*)::int as count,bool_or(actor_id=${actor}) as mine from rooms__reactions
    where message_id=any(${sql.param(rows.map(row => row.id))}::uuid[]) group by message_id,emoji order by emoji`)

  return rows.map(row =>
    messageDto.parse({
      ...row,
      body: row.deleted ? '' : row.body,
      sealed: row.deleted ? null : row.sealed,
      references: row.deleted
        ? []
        : row.references.map(key => entities.get(key)!),
      reactions: row.deleted
        ? []
        : reactions
            .filter(reaction => reaction.message_id === row.id)
            .map(({ emoji, count, mine }) => ({ emoji, count, mine }))
    })
  )
}

export const timeline = endpoints
  .query({
    description: 'Read a stable, paginated room timeline or thread',
    input: {
      query: roomQuery.extend({
        before: z.coerce.number().int().positive().optional(),
        thread_id: z.uuid().optional(),
        message_id: z.uuid().optional(),
        q: z.string().max(200).default(''),
        all_threads: z.enum(['true', 'false']).default('false'),
        pinned: z.enum(['true', 'false']).default('false')
      })
    },
    output: {
      OK: z.object({
        room: roomDto,
        messages: z.array(messageDto),
        next_cursor: z.number().nullable(),
        root: messageDto.nullable(),
        focus: messageDto.nullable()
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = res.locals.userId as string
    await roomAccess(db, actor, query.workspace_id, query.room_id)
    let root: Message | null = null
    let focus: Message | null = null

    if (query.message_id) {
      const rows = await db.execute<StoredMessage>(
        sql`select ${selection} from rooms__messages m where m.room_id=${query.room_id} and m.id=${query.message_id}`
      )

      if (!rows.length) throw new ClientError('Message unavailable', 404)
      focus = (await hydrate(db, actor, query.workspace_id, rows))[0]!
    }

    if (query.thread_id) {
      const rows = await db.execute<StoredMessage>(
        sql`select ${selection} from rooms__messages m where m.room_id=${query.room_id} and m.id=${query.thread_id} and m.thread_id is null`
      )

      if (!rows.length) throw new ClientError('Thread unavailable', 404)
      root = (await hydrate(db, actor, query.workspace_id, rows))[0]!
    }

    const filters: SQL[] = [sql`m.room_id=${query.room_id}`]

    if (query.thread_id) filters.push(sql`m.thread_id=${query.thread_id}`)
    else if (
      !query.q &&
      query.pinned !== 'true' &&
      query.all_threads !== 'true'
    )
      filters.push(sql`m.thread_id is null`)
    if (query.before) filters.push(sql`m.seq<${query.before}`)
    if (query.pinned === 'true') filters.push(sql`m.pinned and not m.deleted`)
    if (query.q)
      filters.push(
        sql`not m.deleted and m.body ilike ${'%' + query.q.replace(/[\\%_]/g, '\\$&') + '%'}`
      )

    const rows = await db.execute<StoredMessage>(
      sql`select ${selection} from rooms__messages m where ${sql.join(filters, sql` and `)} order by m.seq desc limit 51`
    )
    const page = rows.slice(0, 50)

    return response.ok({
      room: (await listRooms(db, actor, query.workspace_id, query.room_id))[0]!,
      messages: (await hydrate(db, actor, query.workspace_id, page)).reverse(),
      next_cursor: rows.length > 50 ? page.at(-1)!.seq : null,
      root,
      focus
    })
  })

export const send = endpoints
  .mutation({
    description: 'Send a retry-safe message with verified workspace mentions',
    input: {
      query: roomQuery,
      body: messageInput.safeExtend({
        transaction_id: z.uuid(),
        thread_id: z.uuid().nullable().default(null)
      })
    },
    output: { OK: identity }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = res.locals.userId as string
    const { room } = await roomAccess(
      db,
      actor,
      query.workspace_id,
      query.room_id,
      true
    )
    const [previous] = await db.execute<{ id: string }>(
      sql`select id from rooms__messages where room_id=${room.id} and author_id=${actor} and transaction_id=${body.transaction_id}`
    )

    if (previous) return response.ok(previous)

    if (body.thread_id) {
      const [root] = await db.execute<{ id: string }>(
        sql`select id from rooms__messages where room_id=${room.id} and id=${body.thread_id} and thread_id is null`
      )

      if (!root) throw new ClientError('Thread unavailable', 404)
    }

    const references = [...new Set(body.references)]

    if (body.body)
      throw new ClientError('Message text must be encrypted on the client')
    await validateSealed(db, actor, query.workspace_id, room.id, body.sealed, {
      transaction_id: body.transaction_id,
      thread_id: body.thread_id,
      references,
      content_revision: 1
    })

    if (
      references.length &&
      (await findEntities(db, actor, query.workspace_id, '', references)).some(
        entity => !entity.available
      )
    )
      throw new ClientError(
        'A mentioned item is no longer available in this workspace',
        409
      )

    const [user] = await db.execute<{ name: string }>(
      sql`select coalesce(nullif(name,''),username) as name from users where id=${actor}`
    )

    if (!user) throw new ClientError('Account unavailable', 401)

    const id = randomUUID()
    await db.execute(sql`insert into rooms__messages(id,owner_id,room_id,author_id,author_name,transaction_id,seq,thread_id,body,"references",sealed)
    values(${id},${room.owner_id},${room.id},${actor},${user.name},${body.transaction_id},${room.last_seq + 1},${body.thread_id},'',${JSON.stringify(references)}::jsonb,${JSON.stringify(body.sealed)}::jsonb)`)
    await attachFiles(
      db,
      actor,
      room.id,
      id,
      body.sealed!.context.attachment_ids
    )
    await changed(db, room, id)

    return response.ok({ id })
  })

export const edit = endpoints
  .mutation({
    description: 'Edit or redact a message without losing its thread identity',
    input: {
      query: roomQuery,
      body: z.object({
        id: z.uuid(),
        expected_revision: z.number().int().positive(),
        body: z.string().trim().max(16000),
        sealed: sealedDto.optional(),
        references: z.array(entityKey).max(20),
        deleted: z.boolean().default(false)
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = res.locals.userId as string
    const { room, workspace } = await roomAccess(
      db,
      actor,
      query.workspace_id,
      query.room_id,
      true
    )
    const [message] = await db.execute<StoredMessage>(
      sql`select ${selection} from rooms__messages m where m.room_id=${room.id} and m.id=${body.id}`
    )

    if (!message) throw new ClientError('Message unavailable', 404)
    if (
      message.author_id !== actor &&
      !(
        body.deleted &&
        (room.created_by === actor || workspace.role === 'owner')
      )
    )
      throw new ClientError('You cannot edit this message', 403)
    if (message.revision !== body.expected_revision || message.deleted)
      throw conflict()

    const references = [...new Set(body.references)]

    if (!body.deleted) {
      if (body.body)
        throw new ClientError('Message text must be encrypted on the client')
      await validateSealed(
        db,
        actor,
        query.workspace_id,
        room.id,
        body.sealed,
        {
          transaction_id: message.transaction_id,
          thread_id: message.thread_id,
          references,
          content_revision: (message.sealed?.context.content_revision ?? 0) + 1
        }
      )
      await attachFiles(
        db,
        actor,
        room.id,
        body.id,
        body.sealed!.context.attachment_ids
      )
      if (
        references.length &&
        (
          await findEntities(db, actor, query.workspace_id, '', references)
        ).some(entity => !entity.available)
      )
        throw new ClientError('A mentioned item is unavailable', 409)
    }
    await db.execute(sql`update rooms__messages set body='',sealed=${body.deleted ? null : JSON.stringify(body.sealed)}::jsonb,"references"=${JSON.stringify(body.deleted ? [] : references)}::jsonb,
    deleted=${body.deleted},pinned=case when ${body.deleted} then false else pinned end,revision=revision+1,edited=now() where id=${body.id} and room_id=${room.id}`)
    await db.execute(
      sql`delete from rooms__files where room_id=${room.id} and message_id=${body.id} and not(id=any(${sql.param(body.deleted ? [] : body.sealed!.context.attachment_ids)}::uuid[]))`
    )
    // Redaction hides historical reactions through the message DTO; authors may remove their own reactions.
    await changed(db, room)

    return response.ok(true)
  })

export const react = endpoints
  .mutation({
    description: 'Idempotently add or remove your reaction',
    input: {
      query: roomQuery,
      body: z.object({
        id: z.uuid(),
        emoji: z.enum(emojis),
        active: z.boolean()
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = res.locals.userId as string
    const { room } = await roomAccess(
      db,
      actor,
      query.workspace_id,
      query.room_id,
      true
    )
    const [message] = await db.execute(
      sql`select id from rooms__messages where room_id=${room.id} and id=${body.id} and not deleted`
    )

    if (!message) throw new ClientError('Message unavailable', 404)
    if (body.active)
      await db.execute(
        sql`insert into rooms__reactions(owner_id,room_id,message_id,actor_id,emoji) values(${room.owner_id},${room.id},${body.id},${actor},${body.emoji}) on conflict do nothing`
      )
    else
      await db.execute(
        sql`delete from rooms__reactions where room_id=${room.id} and message_id=${body.id} and actor_id=${actor} and emoji=${body.emoji}`
      )
    await changed(db, room)

    return response.ok(true)
  })

export const pin = endpoints
  .mutation({
    description: 'Pin or unpin a message for the room',
    input: {
      query: roomQuery,
      body: z.object({
        id: z.uuid(),
        pinned: z.boolean(),
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const { room } = await roomAccess(
      db,
      res.locals.userId,
      query.workspace_id,
      query.room_id,
      true,
      true
    )
    const rows = await db.execute(
      sql`update rooms__messages set pinned=${body.pinned},revision=revision+1 where room_id=${room.id} and id=${body.id} and revision=${body.expected_revision} and not deleted returning id`
    )

    if (!rows.length) throw conflict()
    await changed(db, room)

    return response.ok(true)
  })

export const receipt = endpoints
  .mutation({
    description:
      'Advance your read position monotonically and set room notifications',
    input: {
      query: roomQuery,
      body: z.object({
        read_seq: z.number().int().nonnegative().optional(),
        muted: z.boolean().optional()
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = res.locals.userId as string
    const { room } = await roomAccess(
      db,
      actor,
      query.workspace_id,
      query.room_id
    )

    if ((body.read_seq ?? 0) > room.last_seq)
      throw new ClientError('Read position is ahead of the room', 400)
    await db.execute(sql`insert into rooms__receipts(owner_id,room_id,read_seq,muted) values(${actor},${room.id},${body.read_seq ?? 0},${body.muted ?? false})
    on conflict(room_id,owner_id) do update set read_seq=greatest(rooms__receipts.read_seq,excluded.read_seq),
      muted=${body.muted === undefined ? sql`rooms__receipts.muted` : sql`${body.muted}`},updated=now()`)

    return response.ok(true)
  })

export const mentions = endpoints
  .query({
    description:
      'Find the latest 50 room discussions mentioning a canonical workspace item',
    input: { query: workspaceQuery.extend({ entity: entityKey }) },
    output: { OK: z.array(messageDto.extend({ room_name: z.string() })) }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = res.locals.userId as string
    await workspaceAccess(db, actor, query.workspace_id)
    const [entity] = await findEntities(db, actor, query.workspace_id, '', [
      query.entity
    ])

    if (!entity?.available) throw new ClientError('Item unavailable', 404)

    const rows = await db.execute<
      StoredMessage & { room_name: string }
    >(sql`select ${selection},r.name as room_name from rooms__messages m join rooms__rooms r on r.id=m.room_id
    where r.workspace_id=${query.workspace_id} and not m.deleted and m."references" ? ${query.entity} order by m.created desc,m.id desc limit 50`)
    const messages = await hydrate(db, actor, query.workspace_id, rows)

    return response.ok(
      messages.map((message, i) => ({
        ...message,
        room_name: rows[i]!.room_name
      }))
    )
  })
