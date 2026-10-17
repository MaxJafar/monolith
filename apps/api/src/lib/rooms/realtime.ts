import { sql } from 'drizzle-orm'
import type { Server, Socket } from 'socket.io'
import z from 'zod'

import { db, listenRoomChanges } from '../../core/drizzle'
import { roomAccess } from './access'
import { setupRoomCalls } from './calls'
import { roomQuery } from './model'
import { deliverRoomNotification } from './notifications'

type Scope = z.infer<typeof roomQuery>

const channel = (id: string) => `rooms:${id}`

async function authorized(socket: Socket, scope: Scope, write = false) {
  if (
    !socket.connected ||
    !socket.data.userId ||
    socket.data.expiresAt <= Date.now()
  )
    return false

  try {
    await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id',${socket.data.userId},true)`
      )
      await roomAccess(
        tx,
        socket.data.userId,
        scope.workspace_id,
        scope.room_id,
        write
      )
    })

    return true
  } catch {
    return false
  }
}

export function setupRoomsRealtime(io: Server) {
  setupRoomCalls(io, (scope, actor, id) =>
    deliverRoomNotification(io, scope, { actor, id })
  )

  async function deliver(
    scope: Scope,
    event: string,
    payload: unknown,
    sender?: string
  ) {
    // Check permissions on every delivery. A removed member must not retain a live subscription.
    for (const id of io.sockets.adapter.rooms.get(channel(scope.room_id)) ??
      []) {
      const socket = io.sockets.sockets.get(id)

      if (!socket || socket.id === sender) continue

      if (await authorized(socket, scope)) socket.emit(event, payload)
      else {
        await socket.leave(channel(scope.room_id))
        socket.emit('rooms:revoked', scope)
      }
    }
  }
  void listenRoomChanges(payload => {
    try {
      const scope = roomQuery.parse(JSON.parse(payload))
      void deliver(scope, 'rooms:changed', scope).catch(() => {})
      if (JSON.parse(payload).message_id)
        void deliverRoomNotification(io, scope).catch(() => {})
    } catch {
      /* Ignore malformed external notifications. HTTP polling still reconciles. */
    }
  }).catch(error =>
    console.error('Rooms notifications unavailable; clients will poll', error)
  )

  io.on('connection', socket => {
    let lastTyping = 0
    let lastWatch = 0
    let watchVersion = 0
    socket.on(
      'rooms:watch',
      async (value: unknown, reply?: (value: { ok: boolean }) => void) => {
        const parsed = roomQuery.safeParse(value)

        if (!parsed.success || Date.now() - lastWatch < 250) {
          if (typeof reply === 'function') reply({ ok: false })

          return
        }
        lastWatch = Date.now()
        const version = ++watchVersion

        for (const room of socket.rooms)
          if (room.startsWith('rooms:')) await socket.leave(room)

        const ok = await authorized(socket, parsed.data)

        if (ok && version === watchVersion)
          await socket.join(channel(parsed.data.room_id))
        if (typeof reply === 'function') reply({ ok })
      }
    )
    socket.on('rooms:unwatch', () => {
      watchVersion++
      for (const room of socket.rooms)
        if (room.startsWith('rooms:')) void socket.leave(room)
    })
    socket.on('rooms:typing', async (value: unknown) => {
      const parsed = roomQuery.safeParse(value)

      if (
        !parsed.success ||
        Date.now() - lastTyping < 2500 ||
        !socket.rooms.has(channel(parsed.data.room_id))
      )
        return
      lastTyping = Date.now()
      if (!(await authorized(socket, parsed.data, true))) return
      await deliver(
        parsed.data,
        'rooms:typing',
        { ...parsed.data, actor_id: socket.data.userId },
        socket.id
      )
    })
  })
}
