import { ClientError, createMonolith } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'
import z from 'zod'

import {
  type RoomIdentity,
  roomFingerprint,
  roomsCanonical,
  verifyRoomValue
} from '../../../../../packages/api/src/rooms/crypto'
import { type Store, roomAccess, workspacePeople } from './access'
import { roomQuery } from './scope'

export const encoded = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+$/)

export const identityDto = z
  .object({
    owner_id: z.uuid(),
    agreement: encoded(200),
    signing: encoded(200)
  })
  .strict()

export const sealedDto = z
  .object({
    version: z.literal(1),
    context: z
      .object({
        workspace_id: z.uuid(),
        room_id: z.uuid(),
        author_id: z.uuid(),
        transaction_id: z.uuid(),
        thread_id: z.uuid().nullable(),
        content_revision: z.number().int().positive(),
        references: z.array(z.string().max(160)).max(20),
        attachment_ids: z.array(z.uuid()).max(4)
      })
      .strict(),
    sender: encoded(43),
    ephemeral: encoded(200),
    iv: encoded(16),
    ciphertext: encoded(110000),
    recipients: z
      .array(
        z
          .object({
            user_id: z.uuid(),
            fingerprint: encoded(43),
            iv: encoded(16),
            key: encoded(64)
          })
          .strict()
      )
      .min(1)
      .max(100),
    signature: encoded(86)
  })
  .strict()

const endpoints = createMonolith({ moduleId: 'rooms' })

export async function encryptionRoster(
  db: Store,
  actor: string,
  workspaceId: string,
  roomId: string
) {
  const { room, workspace } = await roomAccess(db, actor, workspaceId, roomId)
  const people = (await workspacePeople(db, actor, workspace)).filter(
    p => room.kind === 'channel' || room.member_ids.includes(p.id)
  )

  if (people.length > 100)
    throw new ClientError('Encrypted rooms support up to 100 participants', 413)

  const identities = await db.execute<RoomIdentity>(
    sql`select owner_id,agreement,signing from rooms__identities where owner_id=any(${sql.param(people.map(p => p.id))}::uuid[])`
  )

  return {
    identities: Array.from(identities),
    missing: people
      .filter(p => !identities.some(i => i.owner_id === p.id))
      .map(p => ({ id: p.id, name: p.name }))
  }
}

export const myIdentity = endpoints
  .query({
    description: 'Read your immutable Rooms public identity',
    input: {},
    output: { OK: identityDto.nullable() }
  })
  .callback(async ({ db, res, response }) => {
    const [identity] = await db.execute<RoomIdentity>(
      sql`select owner_id,agreement,signing from rooms__identities where owner_id=${res.locals.userId}`
    )

    return response.ok(identity ?? null)
  })

export const registerIdentity = endpoints
  .mutation({
    description:
      'Enroll a client-generated public encryption identity; private keys stay on the client',
    input: { body: z.object({ identity: identityDto, proof: encoded(86) }) },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, body, response }) => {
    const actor = res.locals.userId as string

    if (
      body.identity.owner_id !== actor ||
      !(await verifyRoomValue(
        body.identity,
        { purpose: 'monolith/rooms/enroll/v1', identity: body.identity },
        body.proof
      ))
    )
      throw new ClientError('Invalid identity proof', 403)

    try {
      await crypto.subtle.importKey(
        'spki',
        Buffer.from(body.identity.agreement, 'base64url'),
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      )
    } catch {
      throw new ClientError('Invalid encryption public key')
    }
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${actor + ':rooms-identity'},0))`
    )
    const [existing] = await db.execute<RoomIdentity>(
      sql`select owner_id,agreement,signing from rooms__identities where owner_id=${actor}`
    )

    if (existing && roomsCanonical(existing) !== roomsCanonical(body.identity))
      throw new ClientError(
        'Restore your existing Rooms recovery file on this device',
        409
      )
    if (!existing)
      await db.execute(
        sql`insert into rooms__identities(owner_id,agreement,signing) values(${actor},${body.identity.agreement},${body.identity.signing})`
      )

    return response.ok(true)
  })

export const keys = endpoints
  .query({
    description: 'Public keys of current room members and historical senders',
    input: { query: roomQuery },
    output: {
      OK: z.object({
        identities: z.array(identityDto),
        historical: z.array(identityDto),
        missing: z.array(z.object({ id: z.uuid(), name: z.string() }))
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const roster = await encryptionRoster(
      db,
      res.locals.userId,
      query.workspace_id,
      query.room_id
    )
    const historical = await db.execute<RoomIdentity>(
      sql`select owner_id,agreement,signing from rooms__identities where owner_id in (select distinct author_id from rooms__messages where room_id=${query.room_id})`
    )

    return response.ok({ ...roster, historical: Array.from(historical) })
  })

export async function validateSealed(
  db: Store,
  actor: string,
  workspaceId: string,
  roomId: string,
  sealed: z.infer<typeof sealedDto> | undefined,
  expected: {
    transaction_id: string
    thread_id: string | null
    references: string[]
    content_revision: number
  }
) {
  if (!sealed)
    throw new ClientError(
      'Rooms requires end-to-end encryption. Set up your encryption identity first.',
      409
    )

  const c = sealed.context

  if (
    c.author_id !== actor ||
    c.workspace_id !== workspaceId ||
    c.room_id !== roomId ||
    c.transaction_id !== expected.transaction_id ||
    c.thread_id !== expected.thread_id ||
    c.content_revision !== expected.content_revision ||
    roomsCanonical(c.references) !== roomsCanonical(expected.references) ||
    new Set(c.attachment_ids).size !== c.attachment_ids.length
  )
    throw new ClientError(
      'Encrypted message context does not match this request'
    )

  const roster = await encryptionRoster(db, actor, workspaceId, roomId)

  if (roster.missing.length)
    throw new ClientError(
      'Every room participant must set up Rooms encryption before sending',
      409
    )

  const current = await Promise.all(
    roster.identities.map(async i => ({
      user_id: i.owner_id,
      fingerprint: await roomFingerprint(i)
    }))
  )

  if (
    sealed.recipients.length !== current.length ||
    new Set(sealed.recipients.map(r => r.user_id)).size !== current.length ||
    current.some(
      r =>
        !sealed.recipients.some(
          p => p.user_id === r.user_id && p.fingerprint === r.fingerprint
        )
    )
  )
    throw new ClientError(
      'Room participants changed. Refresh the encryption keys and retry.',
      409
    )

  const sender = roster.identities.find(i => i.owner_id === actor)
  const { signature, ...unsigned } = sealed

  if (
    !sender ||
    sealed.sender !== (await roomFingerprint(sender)) ||
    !(await verifyRoomValue(sender, unsigned, signature))
  )
    throw new ClientError('Invalid encrypted message signature', 403)
}
