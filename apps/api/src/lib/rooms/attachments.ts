import { ClientError, createMonolith } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import z from 'zod'

import { type Store, roomAccess } from './access'
import { encoded } from './encryption'
import { roomQuery } from './scope'

const endpoints = createMonolith({ moduleId: 'rooms' })

export const CHUNK_BYTES = 256 * 1024

const MAX_BYTES = 20 * 1024 * 1024 + 16
const query = roomQuery.extend({ id: z.uuid() })

type StoredFile = {
  id: string
  uploader_id: string
  message_id: string | null
  size: number
  hash: string
  complete: boolean
}

async function fileAccess(
  db: Store,
  actor: string,
  scope: z.infer<typeof query>,
  write = false
) {
  const { room } = await roomAccess(
    db,
    actor,
    scope.workspace_id,
    scope.room_id,
    write
  )
  const [file] =
    await db.execute<StoredFile>(sql`select * from rooms__files f where f.room_id=${room.id} and f.id=${scope.id}
    and ((f.message_id is null and f.uploader_id=${actor}) or exists(select 1 from rooms__messages m where m.id=f.message_id and not m.deleted))`)

  if (!file) throw new ClientError('Attachment unavailable', 404)
  if (write && (file.uploader_id !== actor || file.message_id))
    throw new ClientError('This attachment is already committed', 409)

  return { room, file }
}

export const beginUpload = endpoints
  .mutation({
    description:
      'Reserve a bounded encrypted upload; file names and keys stay on clients',
    input: {
      query: roomQuery,
      body: z.object({
        id: z.uuid(),
        size: z.number().int().min(16).max(MAX_BYTES),
        hash: encoded(43)
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
    const [old] = await db.execute<StoredFile>(
      sql`select * from rooms__files where id=${body.id} and room_id=${room.id}`
    )

    if (old) {
      if (
        old.uploader_id !== actor ||
        old.size !== body.size ||
        old.hash !== body.hash
      )
        throw new ClientError('Upload identity conflict', 409)

      return response.ok(true)
    }
    // Abandoned reservations are bounded and cleaned when their owner next uploads.
    await db.execute(
      sql`delete from rooms__files where room_id=${room.id} and uploader_id=${actor} and message_id is null and created<now()-interval '24 hours'`
    )
    const [quota] = await db.execute<{ total: string }>(
      sql`select coalesce(sum(size),0)::text as total from rooms__files where room_id=${room.id} and uploader_id=${actor}`
    )

    if (Number(quota?.total) + body.size > 512 * 1024 * 1024)
      throw new ClientError(
        'Your attachment limit for this room is 512 MiB',
        413
      )
    await db.execute(
      sql`insert into rooms__files(id,owner_id,room_id,uploader_id,size,hash) values(${body.id},${room.owner_id},${room.id},${actor},${body.size},${body.hash})`
    )

    return response.ok(true)
  })

export const putChunk = endpoints
  .mutation({
    description: 'Retry-safe upload of one encrypted attachment chunk',
    input: {
      query,
      body: z.object({
        part: z.number().int().min(0).max(80),
        data: encoded(349526)
      })
    },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const { room, file } = await fileAccess(db, res.locals.userId, query, true)
    const bytes = Buffer.from(body.data, 'base64url')

    if (
      bytes.toString('base64url') !== body.data ||
      bytes.length !==
        Math.min(CHUNK_BYTES, file.size - body.part * CHUNK_BYTES) ||
      bytes.length < 1
    )
      throw new ClientError('Invalid attachment chunk')

    const [existing] = await db.execute<{ data: string }>(
      sql`select data from rooms__file_chunks where file_id=${file.id} and part=${body.part}`
    )

    if (existing) {
      if (existing.data !== body.data)
        throw new ClientError('Attachment chunks are immutable', 409)

      return response.ok(true)
    }
    if (file.complete) throw new ClientError('Upload is already complete', 409)
    await db.execute(
      sql`insert into rooms__file_chunks(owner_id,room_id,file_id,part,data) values(${room.owner_id},${room.id},${file.id},${body.part},${body.data})`
    )

    return response.ok(true)
  })

export const finishUpload = endpoints
  .mutation({
    description:
      'Verify ciphertext size and digest before an upload can be attached',
    input: { query },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, response }) => {
    const { file } = await fileAccess(db, res.locals.userId, query, true)

    if (!file.complete) {
      const chunks = await db.execute<{ part: number; data: string }>(
        sql`select part,data from rooms__file_chunks where file_id=${file.id} order by part`
      )
      const hash = createHash('sha256')

      let total = 0

      for (const [i, chunk] of chunks.entries()) {
        if (chunk.part !== i) throw new ClientError('Upload is incomplete', 409)

        const bytes = Buffer.from(chunk.data, 'base64url')
        total += bytes.length
        hash.update(bytes)
      }
      if (total !== file.size || hash.digest('base64url') !== file.hash)
        throw new ClientError('Attachment integrity check failed', 409)
      await db.execute(
        sql`update rooms__files set complete=true where id=${file.id}`
      )
    }

    return response.ok(true)
  })

export const getChunk = endpoints
  .query({
    description:
      'Read ciphertext only after checking current room and message access',
    input: {
      query: query.extend({ part: z.coerce.number().int().min(0).max(80) })
    },
    output: {
      OK: z.object({ data: z.string(), size: z.number(), hash: z.string() })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const { file } = await fileAccess(db, res.locals.userId, query)

    if (!file.complete) throw new ClientError('Upload is incomplete', 409)

    const [chunk] = await db.execute<{ data: string }>(
      sql`select data from rooms__file_chunks where file_id=${file.id} and part=${query.part}`
    )

    if (!chunk) throw new ClientError('Attachment chunk unavailable', 404)

    return response.ok({ data: chunk.data, size: file.size, hash: file.hash })
  })

export const discardUpload = endpoints
  .mutation({
    description: 'Discard your uncommitted encrypted upload',
    input: { query },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, query, response }) => {
    await roomAccess(
      db,
      res.locals.userId,
      query.workspace_id,
      query.room_id,
      true
    )
    await db.execute(
      sql`delete from rooms__files where id=${query.id} and room_id=${query.room_id} and uploader_id=${res.locals.userId} and message_id is null`
    )

    return response.ok(true)
  })

export async function attachFiles(
  db: Store,
  actor: string,
  roomId: string,
  messageId: string,
  ids: string[]
) {
  if (!ids.length) return

  const files = await db.execute<StoredFile>(
    sql`select * from rooms__files where room_id=${roomId} and id=any(${sql.param(ids)}::uuid[])`
  )

  if (
    files.length !== ids.length ||
    files.some(
      f =>
        f.uploader_id !== actor ||
        !f.complete ||
        (f.message_id && f.message_id !== messageId)
    )
  )
    throw new ClientError('An attachment is incomplete or unavailable', 409)
  await db.execute(
    sql`update rooms__files set message_id=${messageId} where room_id=${roomId} and id=any(${sql.param(ids)}::uuid[])`
  )
}
