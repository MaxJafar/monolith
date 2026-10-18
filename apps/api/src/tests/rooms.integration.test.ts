import type { EndpointContract } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type RoomPrivateIdentity,
  createRoomIdentity,
  decryptRoomFile,
  encryptRoomFile,
  openRoomMessage,
  roomsBase64,
  roomsBytes,
  sealRoomMessage,
  signRoomValue
} from '../../../../packages/api/src/rooms/crypto'
import * as entities from '../lib/entities'
import type { Entity } from '../lib/entities/model'
import * as attachments from '../lib/rooms/attachments'
import * as encryption from '../lib/rooms/encryption'
import type { Message, Room } from '../lib/rooms/model'
import { notifications } from '../lib/rooms/notifications'
import * as routes from '../lib/rooms/routes'

const enabled = process.env.MONOLITH_ROOMS_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''
const adminConnection = process.env.DATABASE_ADMIN_URL ?? ''

if (enabled)
  for (const uri of [connection, adminConnection]) {
    const target = new URL(uri)

    if (
      process.env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.port !== '55432' ||
      target.pathname !== '/zillion_dev'
    )
      throw Error('Rooms fixtures require the isolated loopback database')
  }

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/disabled',
  { max: 5 }
)
const admin = postgres(
  enabled ? adminConnection : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({ client })
const owner = randomUUID(),
  editor = randomUUID(),
  viewer = randomUUID(),
  outsider = randomUUID()
const workspace = randomUUID(),
  other = randomUUID(),
  base = randomUUID(),
  task = randomUUID(),
  redraw = randomUUID()

let channel = '',
  privateRoom = '',
  message = ''
type Context = Parameters<ReturnType<EndpointContract['getValue']>['callback']>[0]

const identities = new Map<string, RoomPrivateIdentity>()

async function invoke<T>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, unknown> = {}
) {
  // Exercise the same client-side sealing as the UI. Routes still receive only
  // ciphertext. Negative encryption tests opt out by passing `sealed` explicitly.
  if (
    (route === routes.send || route === routes.edit) &&
    body &&
    typeof body === 'object' &&
    !('sealed' in body) &&
    !('deleted' in body && body.deleted)
  ) {
    const value = body as Record<string, unknown>
    const [room] =
      await admin`select * from rooms__rooms where id=${query.room_id as string}`
    const [previous] =
      route === routes.edit
        ? await admin`select * from rooms__messages where id=${value.id as string}`
        : []
    const members =
      room?.kind === 'channel'
        ? [owner, editor, viewer]
        : (room?.member_ids ?? [actor])
    const recipients = [...new Set([...members, actor])]
      .map(id => identities.get(id)!)
      .filter(Boolean)
      .map(({ owner_id, agreement, signing }) => ({
        owner_id,
        agreement,
        signing
      }))
    const sealed = await sealRoomMessage(
      identities.get(actor)!,
      {
        workspace_id: query.workspace_id as string,
        room_id: query.room_id as string,
        author_id: actor,
        transaction_id:
          previous?.transaction_id ?? (value.transaction_id as string),
        thread_id:
          previous?.thread_id ??
          (typeof value.thread_id === 'string' ? value.thread_id : null),
        content_revision: (previous?.sealed?.context.content_revision ?? 0) + 1,
        references: (value.references as string[] | undefined) ?? [],
        attachment_ids: []
      },
      { body: value.body as string, attachments: [] },
      recipients
    )
    body = { ...value, body: '', sealed }
  }

  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)

    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } }
    } as unknown as Context)
  })

  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}

const scope = () => ({ workspace_id: workspace, room_id: channel })
const send = (
  actor: string,
  body: Record<string, unknown> = {},
  query = scope()
) =>
  invoke<{ id: string }>(
    routes.send,
    actor,
    {
      body: 'Hello Rooms',
      references: [],
      transaction_id: randomUUID(),
      ...body
    },
    query
  )
const timeline = (actor = owner, extra = {}, query = scope()) =>
  invoke<{
    room: Room
    messages: Message[]
    root: Message | null
    next_cursor: number | null
  }>(routes.timeline, actor, undefined, { ...query, ...extra })

beforeAll(async () => {
  if (!enabled) return
  for (const id of [owner, editor, viewer, outsider])
    await admin`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},${'Rooms fixture ' + id.slice(0, 6)})`

  for (const id of [owner, editor, viewer, outsider]) {
    const key = await createRoomIdentity(id, 'Rooms fixture recovery password')
    identities.set(id, key)
    const identity = {
      owner_id: id,
      agreement: key.agreement,
      signing: key.signing
    }
    await invoke(encryption.registerIdentity, id, {
      identity,
      proof: await signRoomValue(key, {
        purpose: 'monolith/rooms/enroll/v1',
        identity
      })
    })
  }
  await admin`insert into zillion_databases__workspaces(id,owner_id,name) values(${workspace},${owner},'Rooms verification'),(${other},${outsider},'Other workspace')`
  await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${editor},'editor'),(${owner},${workspace},${viewer},'viewer')`
  await admin`insert into zillion_databases__bases(id,owner_id,workspace_id,name) values(${base},${owner},${workspace},'Rooms test database')`
  await admin`insert into zillion_databases__records(id,owner_id,base_id,title,item_type) values(${task},${owner},${base},'Rooms test task','task')`
  await admin`insert into redraw__projects(id,owner_id,workspace_id,title,document) values(${redraw},${owner},${workspace},'Rooms test design','{}'::jsonb)`
})
afterAll(async () => {
  if (enabled) {
    await admin`delete from zillion_databases__workspaces where id in (${workspace},${other})`
    for (const id of [owner, editor, viewer, outsider])
      await admin`delete from users where id=${id}`
  }
  await Promise.all([client.end(), admin.end()])
})

describe.skipIf(!enabled)('Native core Rooms', () => {
  it('creates core channels idempotently without enabling an addon', async () => {
    const input = {
      id: randomUUID(),
      workspace_id: workspace,
      name: 'General',
      kind: 'channel'
    }
    channel = (await invoke<{ id: string }>(routes.create, owner, input)).id
    expect((await invoke<{ id: string }>(routes.create, owner, input)).id).toBe(
      channel
    )
    expect(
      (
        await invoke<Room[]>(routes.list, editor, undefined, {
          workspace_id: workspace
        })
      )[0]?.id
    ).toBe(channel)
    await expect(
      invoke(routes.list, outsider, undefined, { workspace_id: workspace })
    ).rejects.toThrow()
    await expect(
      invoke(routes.create, viewer, { ...input, id: randomUUID() })
    ).rejects.toThrow('read-only')
  })
  it('enforces private membership and same-workspace direct conversations', async () => {
    privateRoom = (
      await invoke<{ id: string }>(routes.create, editor, {
        id: randomUUID(),
        workspace_id: workspace,
        name: 'Private design',
        kind: 'private',
        member_ids: [viewer]
      })
    ).id
    expect(
      (
        await invoke<Room[]>(routes.list, owner, undefined, {
          workspace_id: workspace
        })
      ).some(room => room.id === privateRoom)
    ).toBe(false)
    await expect(
      timeline(owner, {}, { workspace_id: workspace, room_id: privateRoom })
    ).rejects.toThrow()
    const first = await invoke<{ id: string }>(routes.create, owner, {
      id: randomUUID(),
      workspace_id: workspace,
      name: 'Direct',
      kind: 'direct',
      member_ids: [editor]
    })
    const second = await invoke<{ id: string }>(routes.create, editor, {
      id: randomUUID(),
      workspace_id: workspace,
      name: 'Direct retry',
      kind: 'direct',
      member_ids: [owner]
    })
    expect(second.id).toBe(first.id)
    await expect(
      invoke(routes.create, owner, {
        id: randomUUID(),
        workspace_id: workspace,
        name: 'Forbidden',
        kind: 'private',
        member_ids: [outsider]
      })
    ).rejects.toThrow()
  })
  it('serializes concurrent send retries and rejects viewer writes', async () => {
    const transaction_id = randomUUID()
    const sent = await Promise.all([
      send(editor, { transaction_id }),
      send(editor, { transaction_id })
    ])
    expect(sent[0].id).toBe(sent[1].id)
    message = sent[0].id
    expect((await timeline()).messages).toHaveLength(1)
    await expect(send(viewer)).rejects.toThrow('read-only')
    await expect(send(outsider)).rejects.toThrow()
  })
  it('resolves ReDraw, tasks, databases and people through current workspace identities', async () => {
    const keys = [
      `redraw:${redraw}`,
      `record:${task}`,
      `database:${base}`,
      `user:${editor}`
    ]
    const found = await invoke<Entity[]>(entities.resolve, editor, {
      workspace_id: workspace,
      keys
    })
    expect(found.every(entity => entity.available)).toBe(true)
    expect(found[0]?.href).toContain(`project=${redraw}`)
    expect(found[1]?.href).toContain(`record=${task}`)
    await send(owner, { references: keys })
    await expect(
      send(owner, { references: [`room:${privateRoom}`] })
    ).rejects.toThrow('no longer available')
    await expect(
      invoke(entities.resolve, outsider, { workspace_id: workspace, keys })
    ).rejects.toThrow()
    const otherKeys = await invoke<Entity[]>(entities.resolve, outsider, {
      workspace_id: other,
      keys
    })
    expect(otherKeys.every(entity => !entity.available)).toBe(true)
  })
  it('threads retain their root and reject roots from other rooms', async () => {
    const reply = await send(owner, {
      thread_id: message,
      body: 'Thread reply'
    })
    const thread = await timeline(owner, { thread_id: message })
    expect(thread.root?.id).toBe(message)
    expect(thread.messages.map(m => m.id)).toContain(reply.id)
    expect(
      (await timeline()).messages.find(m => m.id === message)?.replies
    ).toBe(1)
    await expect(
      send(
        editor,
        { thread_id: message },
        { workspace_id: workspace, room_id: privateRoom }
      )
    ).rejects.toThrow('Thread unavailable')
    await expect(send(owner, { thread_id: reply.id })).rejects.toThrow(
      'Thread unavailable'
    )
  })
  it('edits use revision guards, reactions are idempotent, and moderation is authorized', async () => {
    await invoke(
      routes.edit,
      editor,
      {
        id: message,
        expected_revision: 1,
        body: 'Edited once',
        references: []
      },
      scope()
    )
    await expect(
      invoke(
        routes.edit,
        editor,
        {
          id: message,
          expected_revision: 1,
          body: 'Stale overwrite',
          references: []
        },
        scope()
      )
    ).rejects.toThrow('changed elsewhere')
    await expect(
      invoke(
        routes.edit,
        owner,
        {
          id: message,
          expected_revision: 2,
          body: 'Not my message',
          references: []
        },
        scope()
      )
    ).rejects.toThrow('cannot edit')
    for (let i = 0; i < 2; i++)
      await invoke(
        routes.react,
        owner,
        { id: message, emoji: '👍', active: true },
        scope()
      )
    expect(
      (await timeline()).messages.find(m => m.id === message)?.reactions[0]
        ?.count
    ).toBe(1)
    await expect(
      invoke(
        routes.pin,
        editor,
        { id: message, expected_revision: 2, pinned: true },
        scope()
      )
    ).rejects.toThrow()
    await invoke(
      routes.pin,
      owner,
      { id: message, expected_revision: 2, pinned: true },
      scope()
    )
    expect((await timeline(owner, { pinned: 'true' })).messages[0]?.id).toBe(
      message
    )
  })
  it('read positions never regress and unread mentions are account-specific', async () => {
    const rooms = await invoke<Room[]>(routes.list, editor, undefined, {
      workspace_id: workspace
    })
    const room = rooms.find(r => r.id === channel)!
    expect(room.mentions).toBe(1)
    await invoke(
      routes.receipt,
      editor,
      { read_seq: room.last_seq, muted: true },
      scope()
    )
    await invoke(routes.receipt, editor, { read_seq: 0 }, scope())
    const next = (
      await invoke<Room[]>(routes.list, editor, undefined, {
        workspace_id: workspace
      })
    ).find(r => r.id === channel)!
    expect(next.unread).toBe(0)
    expect(next.muted).toBe(true)
    await expect(
      invoke(routes.receipt, editor, { read_seq: room.last_seq + 1 }, scope())
    ).rejects.toThrow('ahead')
  })
  it('resolves renamed references and hides deleted targets rather than preserving stale private titles', async () => {
    await admin`update redraw__projects set title='Renamed Rooms design' where id=${redraw}`
    let ref = (await timeline()).messages
      .flatMap(m => m.references)
      .find(r => r.key === `redraw:${redraw}`)
    expect(ref?.title).toBe('Renamed Rooms design')
    await admin`delete from redraw__projects where id=${redraw}`
    ref = (await timeline()).messages
      .flatMap(m => m.references)
      .find(r => r.key === `redraw:${redraw}`)
    expect(ref).toMatchObject({ available: false, title: '', href: null })
  })
  it('redacts content and references while preserving reply history', async () => {
    const current = (await timeline()).messages.find(m => m.id === message)!
    await invoke(
      routes.edit,
      owner,
      {
        id: message,
        expected_revision: current.revision,
        deleted: true,
        body: '',
        references: []
      },
      scope()
    )
    const thread = await timeline(owner, { thread_id: message })
    expect(thread.root).toMatchObject({
      deleted: true,
      body: '',
      references: [],
      reactions: [],
      pinned: false
    })
    expect(thread.messages).toHaveLength(1)
  })
  it('enforces isolation through RLS even outside route validation', async () => {
    await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id',${outsider},true)`
      )
      expect(
        (
          await tx.execute(
            sql`select * from rooms__rooms where workspace_id=${workspace}`
          )
        ).length
      ).toBe(0)
      expect(
        (
          await tx.execute(
            sql`select * from rooms__messages where room_id=${channel}`
          )
        ).length
      ).toBe(0)
    })
    await expect(
      db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id',${viewer},true)`
        )
        await tx.execute(
          sql`insert into rooms__messages(id,owner_id,room_id,author_id,author_name,transaction_id,seq,body) values(${randomUUID()},${owner},${channel},${viewer},'Forged',${randomUUID()},999,'Forbidden')`
        )
      })
    ).rejects.toThrow()
  })
  it('connects item routes and backlinks without exposing private discussions', async () => {
    const ref = `record:${task}`
    const shared = await send(owner, {
      body: 'Shared task conversation',
      references: [ref]
    })
    await send(
      editor,
      { body: 'Private task conversation', references: [ref] },
      { workspace_id: workspace, room_id: privateRoom }
    )
    const context = await invoke<Entity | null>(
      entities.context,
      owner,
      undefined,
      {
        workspace_id: workspace,
        path: `/databases?base=${base}&record=${task}`
      }
    )
    expect(context?.key).toBe(ref)
    for (const path of [
      '//example.invalid/databases',
      '/\\example.invalid/databases',
      'https://example.invalid'
    ])
      expect(
        await invoke(entities.context, owner, undefined, {
          workspace_id: workspace,
          path
        })
      ).toBeNull()

    const mentions = await invoke<(Message & { room_name: string })[]>(
      routes.mentions,
      owner,
      undefined,
      { workspace_id: workspace, entity: ref }
    )
    expect(mentions.some(m => m.id === shared.id)).toBe(true)
    expect(mentions.some(m => m.room_id === privateRoom)).toBe(false)
  })
  it('keeps pagination stable, resolves older permalinks, and scopes message lookup to the room', async () => {
    const old = await send(owner, { body: 'Old linked message' })

    for (let i = 0; i < 53; i++) await send(owner, { body: `Pagination ${i}` })

    const first = await timeline()
    expect(first.messages).toHaveLength(50)
    expect(first.next_cursor).not.toBeNull()
    const next = await timeline(owner, { before: first.next_cursor })
    expect(
      next.messages.some(m => first.messages.some(n => n.id === m.id))
    ).toBe(false)
    const focused = await invoke<{ focus: Message }>(
      routes.timeline,
      owner,
      undefined,
      { ...scope(), message_id: old.id }
    )
    expect(focused.focus.id).toBe(old.id)
    await expect(
      timeline(
        editor,
        { message_id: old.id },
        { workspace_id: workspace, room_id: privateRoom }
      )
    ).rejects.toThrow('Message unavailable')
  })
  it('stores only ciphertext, authenticates the sender, and rejects plaintext downgrade', async () => {
    await expect(send(owner, { sealed: undefined })).rejects.toThrow(
      'encrypted'
    )
    const id = (
      await send(owner, { body: 'Secret only the participants can read' })
    ).id
    const [row] =
      await admin`select body,sealed from rooms__messages where id=${id}`
    expect(row!.body).toBe('')
    expect(JSON.stringify(row!.sealed)).not.toContain('Secret only')
    expect(
      (
        await openRoomMessage(
          identities.get(viewer)!,
          row!.sealed,
          identities.get(owner)!
        )
      ).body
    ).toBe('Secret only the participants can read')
    await expect(
      openRoomMessage(
        identities.get(outsider)!,
        row!.sealed,
        identities.get(owner)!
      )
    ).rejects.toThrow()
    const roster = await invoke<{
      identities: { owner_id: string; agreement: string; signing: string }[]
    }>(encryption.keys, owner, undefined, scope())
    const transaction = randomUUID()
    const context = {
      ...scope(),
      author_id: owner,
      transaction_id: transaction,
      thread_id: null,
      content_revision: 1,
      references: [],
      attachment_ids: []
    }
    const forged = await sealRoomMessage(
      identities.get(owner)!,
      context,
      { body: 'incomplete recipient roster', attachments: [] },
      roster.identities.filter(p => p.owner_id !== viewer)
    )
    await expect(
      send(owner, { body: '', transaction_id: transaction, sealed: forged })
    ).rejects.toThrow('participants changed')
    const valid = await sealRoomMessage(
      identities.get(owner)!,
      context,
      { body: 'signed content', attachments: [] },
      roster.identities
    )
    valid.ciphertext = 'AAAA'
    await expect(
      send(owner, { body: '', transaction_id: transaction, sealed: valid })
    ).rejects.toThrow('signature')
    await expect(
      invoke(encryption.keys, outsider, undefined, scope())
    ).rejects.toThrow()
  })
  it('keeps encrypted uploads private until committed, verifies chunks, and removes redacted blobs', async () => {
    const id = randomUUID()
    const bytes = new Uint8Array(attachments.CHUNK_BYTES + 19).fill(71)
    const encrypted = await encryptRoomFile(
      id,
      bytes.buffer,
      'private-design.bin',
      'application/octet-stream'
    )
    const query = { ...scope(), id }
    const begin = {
      id,
      size: encrypted.encrypted.length,
      hash: encrypted.file.hash
    }
    await expect(
      invoke(attachments.beginUpload, viewer, begin, scope())
    ).rejects.toThrow('read-only')
    await invoke(attachments.beginUpload, owner, begin, scope())
    await expect(
      invoke(attachments.finishUpload, owner, undefined, query)
    ).rejects.toThrow('integrity')

    for (
      let offset = 0;
      offset < encrypted.encrypted.length;
      offset += attachments.CHUNK_BYTES
    ) {
      const chunk = {
        part: offset / attachments.CHUNK_BYTES,
        data: roomsBase64(
          encrypted.encrypted.subarray(offset, offset + attachments.CHUNK_BYTES)
        )
      }
      await invoke(attachments.putChunk, owner, chunk, query)
      await invoke(attachments.putChunk, owner, chunk, query)
    }
    await invoke(attachments.finishUpload, owner, undefined, query)
    await expect(
      invoke(attachments.getChunk, editor, undefined, { ...query, part: 0 })
    ).rejects.toThrow('unavailable')
    const transaction = randomUUID()
    const roster = await invoke<{
      identities: { owner_id: string; agreement: string; signing: string }[]
    }>(encryption.keys, owner, undefined, scope())
    const sealed = await sealRoomMessage(
      identities.get(owner)!,
      {
        ...scope(),
        author_id: owner,
        transaction_id: transaction,
        thread_id: null,
        content_revision: 1,
        references: [],
        attachment_ids: [id]
      },
      { body: '', attachments: [encrypted.file] },
      roster.identities
    )
    const sent = await send(owner, {
      body: '',
      transaction_id: transaction,
      sealed
    })
    const downloaded = new Uint8Array(encrypted.encrypted.length)

    for (
      let offset = 0;
      offset < downloaded.length;
      offset += attachments.CHUNK_BYTES
    ) {
      const part = await invoke<{ data: string }>(
        attachments.getChunk,
        viewer,
        undefined,
        { ...query, part: offset / attachments.CHUNK_BYTES }
      )
      downloaded.set(roomsBytes(part.data), offset)
    }
    expect(
      new Uint8Array(await decryptRoomFile(encrypted.file, downloaded))
    ).toEqual(bytes)
    await expect(
      invoke(attachments.getChunk, outsider, undefined, { ...query, part: 0 })
    ).rejects.toThrow()
    await expect(
      invoke(
        attachments.putChunk,
        owner,
        {
          part: 0,
          data: roomsBase64(
            encrypted.encrypted.subarray(0, attachments.CHUNK_BYTES)
          )
        },
        query
      )
    ).rejects.toThrow('committed')
    await invoke(
      routes.edit,
      owner,
      {
        id: sent.id,
        expected_revision: 1,
        body: '',
        references: [],
        deleted: true
      },
      scope()
    )
    await expect(
      invoke(attachments.getChunk, owner, undefined, { ...query, part: 0 })
    ).rejects.toThrow('unavailable')
    expect(
      (await admin`select * from rooms__file_chunks where file_id=${id}`).length
    ).toBe(0)
  })
  it('delivers unread catch-up without content and respects room mute and access', async () => {
    await send(owner, {
      body: 'A notification that must never contain plaintext'
    })
    const inbox = await invoke<{ room_id: string }[]>(notifications, viewer)
    expect(inbox.some(item => item.room_id === channel)).toBe(true)
    expect(JSON.stringify(inbox)).not.toContain('plaintext')
    expect(
      (await invoke<{ room_id: string }[]>(notifications, editor)).some(
        item => item.room_id === channel
      )
    ).toBe(false)
    expect(
      (await invoke<{ room_id: string }[]>(notifications, outsider)).some(
        item => item.room_id === channel
      )
    ).toBe(false)
  })
  it('archives and restores rooms and immediately enforces private-member removal', async () => {
    const room = (
      await invoke<Room[]>(routes.list, owner, undefined, {
        workspace_id: workspace
      })
    ).find(r => r.id === channel)!
    const change = {
      name: room.name,
      topic: room.topic,
      member_ids: room.member_ids,
      expected_revision: room.revision,
      archived: true
    }
    await invoke(routes.update, owner, change, scope())
    await expect(send(owner)).rejects.toThrow('archived')
    expect((await timeline()).room.can_write).toBe(false)
    await invoke(
      routes.update,
      owner,
      { ...change, expected_revision: room.revision + 1, archived: false },
      scope()
    )
    await send(owner, { body: 'Restored conversation' })
    const privateScope = { workspace_id: workspace, room_id: privateRoom }
    const privateInfo = (await timeline(editor, {}, privateScope)).room
    await invoke(
      routes.update,
      editor,
      {
        name: privateInfo.name,
        topic: privateInfo.topic,
        member_ids: [editor],
        expected_revision: privateInfo.revision,
        archived: false
      },
      privateScope
    )
    await expect(timeline(viewer, {}, privateScope)).rejects.toThrow(
      'Room unavailable'
    )
  })
  it('revoking workspace membership immediately revokes timeline and entity access', async () => {
    const formerCreatorRoom = await invoke<{ id: string }>(
      routes.create,
      editor,
      {
        id: randomUUID(),
        workspace_id: workspace,
        name: 'Handoff',
        kind: 'channel'
      }
    )

    await admin`delete from zillion_databases__workspace_members where workspace_id=${workspace} and user_id=${editor}`
    await expect(timeline(editor)).rejects.toThrow()
    await expect(send(editor)).rejects.toThrow()
    await expect(
      invoke(entities.resolve, editor, {
        workspace_id: workspace,
        keys: [`record:${task}`]
      })
    ).rejects.toThrow()
    await invoke(
      routes.update,
      owner,
      {
        name: 'Archived handoff',
        topic: '',
        expected_revision: 1,
        archived: true,
        member_ids: []
      },
      { workspace_id: workspace, room_id: formerCreatorRoom.id }
    )
    expect(
      (
        await timeline(
          owner,
          {},
          { workspace_id: workspace, room_id: formerCreatorRoom.id }
        )
      ).room.archived
    ).toBe(true)
  })
})
