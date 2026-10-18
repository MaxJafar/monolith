import { createMonolith } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'
import type { Server } from 'socket.io'
import z from 'zod'

import { db } from '../../core/drizzle'
import { type Store, roomAccess } from './access'

type Scope = { workspace_id: string; room_id: string }

const notification = z.object({
  workspace_id: z.uuid(),
  room_id: z.uuid(),
  message_id: z.uuid(),
  seq: z.number()
})

export async function unreadNotifications(
  store: Store,
  actor: string,
  roomId?: string
) {
  return Array.from(
    await store.execute<z.infer<typeof notification>>(sql`
    select r.workspace_id,r.id as room_id,m.id as message_id,m.seq from rooms__rooms r
    join lateral(select id,seq from rooms__messages where room_id=r.id and not deleted and author_id<>${actor} order by seq desc limit 1) m on true
    left join rooms__receipts s on s.room_id=r.id and s.owner_id=${actor}
    where not r.archived and not coalesce(s.muted,false) and m.seq>coalesce(s.read_seq,0)
    ${roomId ? sql`and r.id=${roomId}` : sql``} order by r.updated desc,r.id limit 50`)
  )
}

export const notifications = createMonolith({ moduleId: 'rooms' })
  .query({
    description:
      'Catch up on unread room notifications using the platform connection only',
    input: {},
    output: { OK: z.array(notification) }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(await unreadNotifications(db, res.locals.userId))
  )

export async function deliverRoomNotification(
  io: Server,
  scope: Scope,
  call?: { actor: string; id: string }
) {
  // Content never appears in notification payloads. RLS and membership are checked
  // at delivery, including notifications for rooms the socket is not watching.
  await Promise.all(
    [...io.sockets.sockets.values()].map(async socket => {
      if (
        !socket.connected ||
        !socket.data.userId ||
        socket.data.expiresAt <= Date.now() ||
        socket.data.userId === call?.actor
      )
        return

      try {
        const payload = await db.transaction(async tx => {
          await tx.execute(
            sql`select set_config('zillion.user_id',${socket.data.userId},true)`
          )
          await roomAccess(
            tx,
            socket.data.userId,
            scope.workspace_id,
            scope.room_id
          )
          if (!call)
            return (
              await unreadNotifications(tx, socket.data.userId, scope.room_id)
            )[0]

          const [receipt] = await tx.execute<{ muted: boolean }>(
            sql`select muted from rooms__receipts where room_id=${scope.room_id} and owner_id=${socket.data.userId}`
          )

          if (!receipt?.muted) return { ...scope, call_id: call.id }
        })

        // The socket can disconnect while permission queries are in flight.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (payload && socket.connected)
          socket.emit('rooms:notification', payload)
      } catch {
        /* Revoked and expired accounts receive no alert. */
      }
    })
  )
}
