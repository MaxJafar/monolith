import { ClientError, createMonolith } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'
import { createHmac, randomUUID } from 'node:crypto'
import type { Server, Socket } from 'socket.io'
import z from 'zod'

import {
  type RoomIdentity,
  verifyRoomValue
} from '../../../../../packages/api/src/rooms/crypto'
import { db } from '../../core/drizzle'
import { roomAccess } from './access'
import { encoded } from './encryption'
import { roomQuery } from './scope'

type Scope = z.infer<typeof roomQuery>
type Peer = {
  socket_id: string
  actor_id: string
  name: string
  identity: RoomIdentity
}
type Call = {
  id: string
  scope: Scope
  peers: Map<string, Peer>
  video: boolean
}

const calls = new Map<string, Call>()
const endpoints = createMonolith({ moduleId: 'rooms' })

export function roomIceServers(actor: string) {
  const urls = (process.env.ROOMS_TURN_URLS ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)

  if (!urls.length) return []
  if (
    urls.length > 4 ||
    urls.some(
      url => !/^turns?:[a-zA-Z0-9.\-[\]:]+(?:\?transport=(udp|tcp))?$/.test(url)
    ) ||
    !process.env.ROOMS_TURN_SECRET ||
    process.env.ROOMS_TURN_SECRET.length < 32
  )
    throw new ClientError(
      'The platform TURN relay configuration is invalid',
      503
    )

  const username = `${Math.floor(Date.now() / 1000) + 3600}:${actor}`

  return [
    {
      urls,
      username,
      credential: createHmac('sha1', process.env.ROOMS_TURN_SECRET)
        .update(username)
        .digest('base64')
    }
  ]
}

export const callState = endpoints
  .query({
    description:
      'Read the active core call and your short-lived platform relay credentials',
    input: { query: roomQuery },
    output: {
      OK: z.object({
        active: z.boolean(),
        participants: z.number(),
        video: z.boolean(),
        limit: z.number(),
        iceServers: z.array(
          z.object({
            urls: z.array(z.string()),
            username: z.string(),
            credential: z.string()
          })
        )
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    await roomAccess(db, res.locals.userId, query.workspace_id, query.room_id)
    const call = calls.get(query.room_id)

    return response.ok({
      active: !!call,
      participants: call?.peers.size ?? 0,
      video: call?.video ?? false,
      limit: 8,
      iceServers: roomIceServers(res.locals.userId)
    })
  })

async function authorize(socket: Socket, scope: Scope) {
  if (
    !socket.connected ||
    !socket.data.userId ||
    socket.data.expiresAt <= Date.now()
  )
    throw Error('Authentication expired')

  return db.transaction(async tx => {
    const actor = socket.data.userId as string
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    await roomAccess(tx, actor, scope.workspace_id, scope.room_id, true)
    const [identity] = await tx.execute<RoomIdentity>(
      sql`select owner_id,agreement,signing from rooms__identities where owner_id=${actor}`
    )
    const [user] = await tx.execute<{ name: string }>(
      sql`select coalesce(nullif(name,''),username) as name from users where id=${actor}`
    )

    if (!identity || !user)
      throw Error('Set up Rooms encryption before joining calls')

    return { socket_id: socket.id, actor_id: actor, name: user.name, identity }
  })
}

export function setupRoomCalls(
  io: Server,
  alert: (scope: Scope, actor: string, callId: string) => Promise<void>
) {
  function leave(socket: Socket) {
    const roomId = socket.data.roomsCall as string | undefined
    delete socket.data.roomsCall
    delete socket.data.roomsCallRequest
    const call = roomId ? calls.get(roomId) : undefined

    if (!call) return
    call.peers.delete(socket.id)
    for (const id of call.peers.keys())
      io.sockets.sockets
        .get(id)
        ?.emit('rooms:call:left', { call_id: call.id, socket_id: socket.id })
    if (!call.peers.size) calls.delete(roomId!)
  }
  io.on('connection', socket => {
    let joining = false
    let lastJoin = 0
    let packets = 0
    let windowStart = Date.now()

    const seen = new Set<string>()
    socket.on(
      'rooms:call:join',
      async (value: unknown, reply?: (value: unknown) => void) => {
        if (typeof reply !== 'function') return

        const parsed = roomQuery
          .extend({
            video: z.boolean(),
            timestamp: z.number(),
            nonce: z.uuid(),
            proof: encoded(86)
          })
          .safeParse(value)

        if (!parsed.success || joining || Date.now() - lastJoin < 1000)
          return reply({ error: 'Call request unavailable' })
        joining = true
        lastJoin = Date.now()

        try {
          const { proof, ...request } = parsed.data
          const peer = await authorize(socket, parsed.data)

          if (
            Math.abs(Date.now() - request.timestamp) > 60000 ||
            !(await verifyRoomValue(
              peer.identity,
              {
                purpose: 'monolith/rooms/call/join/v1',
                socket_id: socket.id,
                ...request
              },
              proof
            ))
          )
            throw Error('Invalid call identity proof')
          if (!socket.connected) return

          const scope = {
            workspace_id: request.workspace_id,
            room_id: request.room_id
          }
          const existing = calls.get(scope.room_id)

          if (existing?.peers.has(socket.id)) {
            socket.data.roomsCallRequest = request.nonce

            return reply({
              call_id: existing.id,
              peers: [...existing.peers.values()].filter(
                p => p.socket_id !== socket.id
              )
            })
          }
          if (
            existing &&
            (existing.peers.size >= 8 ||
              [...existing.peers.values()].some(
                p => p.actor_id === peer.actor_id
              ))
          )
            throw Error(
              'Call is full or you have already joined on another device'
            )
          leave(socket)
          const call = existing ?? {
            id: randomUUID(),
            scope,
            peers: new Map(),
            video: request.video
          }
          const peers = [...call.peers.values()]
          call.peers.set(socket.id, peer)
          calls.set(scope.room_id, call)
          socket.data.roomsCall = scope.room_id
          socket.data.roomsCallRequest = request.nonce
          seen.clear()
          reply({ call_id: call.id, peers })
          for (const other of peers)
            io.sockets.sockets
              .get(other.socket_id)
              ?.emit('rooms:call:joined', { call_id: call.id, peer })
          if (!existing)
            void alert(scope, peer.actor_id, call.id).catch(() => {})
        } catch (error) {
          reply({
            error:
              error instanceof Error ? error.message : 'Unable to join call'
          })
        } finally {
          joining = false
        }
      }
    )
    const signal = z
      .object({
        call_id: z.uuid(),
        to: z.string().min(1).max(100),
        nonce: z.uuid(),
        timestamp: z.number(),
        payload: z.string().min(1).max(64000),
        signature: encoded(86)
      })
      .strict()
    socket.on(
      'rooms:call:signal',
      async (value: unknown, reply?: (value: unknown) => void) => {
        const done = (error?: string) => {
          if (typeof reply === 'function')
            reply(error ? { error } : { ok: true })
        }

        if (Date.now() - windowStart > 10000) {
          packets = 0
          windowStart = Date.now()
        }
        if (++packets > 160) return done('Too many call signals')

        const parsed = signal.safeParse(value)

        if (!parsed.success) return done('Invalid call signal')

        const call = calls.get(socket.data.roomsCall)
        const target = io.sockets.sockets.get(parsed.data.to)

        if (
          !call ||
          call.id !== parsed.data.call_id ||
          !target ||
          !call.peers.has(target.id) ||
          target.id === socket.id ||
          seen.has(parsed.data.nonce) ||
          Math.abs(Date.now() - parsed.data.timestamp) > 60000
        )
          return done('Call participant unavailable')

        try {
          const sender = await authorize(socket, call.scope)

          try {
            await authorize(target, call.scope)
          } catch {
            target.emit('rooms:call:ended', {
              call_id: call.id,
              reason: 'Call access expired'
            })
            leave(target)

            return done('Call participant unavailable')
          }

          const { signature, ...data } = parsed.data
          const signed = {
            purpose: 'monolith/rooms/call/signal/v1',
            ...call.scope,
            from: socket.id,
            actor_id: sender.actor_id,
            ...data
          }

          if (!(await verifyRoomValue(sender.identity, signed, signature)))
            return done('Invalid signal signature')
          if (
            calls.get(call.scope.room_id) !== call ||
            !call.peers.has(socket.id) ||
            !call.peers.has(target.id)
          )
            return done('Call ended')
          seen.add(data.nonce)
          if (seen.size > 1024) seen.delete(seen.values().next().value!)
          target.emit('rooms:call:signal', { ...signed, signature })
          done()
        } catch {
          leave(socket)
          done('Call access expired')
        }
      }
    )
    socket.on('rooms:call:leave', (value: unknown) => {
      if (
        value &&
        typeof value === 'object' &&
        'nonce' in value &&
        value.nonce === socket.data.roomsCallRequest
      )
        leave(socket)
    })
    socket.on('disconnect', () => leave(socket))
    let checking = false

    const timer = setInterval(async () => {
      const call = calls.get(socket.data.roomsCall)

      if (!call || checking) return
      checking = true

      try {
        await authorize(socket, call.scope)
      } catch {
        socket.emit('rooms:call:ended', {
          call_id: call.id,
          reason: 'Call access expired'
        })
        leave(socket)
      } finally {
        checking = false
      }
    }, 5000)
    timer.unref()
    socket.on('disconnect', () => clearInterval(timer))
  })
}
