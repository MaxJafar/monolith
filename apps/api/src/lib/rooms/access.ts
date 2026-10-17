import { ClientError } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'

import type { db as database } from '../../core/drizzle'

export type Store = Pick<typeof database, 'execute'>

export type Workspace = {
  id: string
  owner_id: string
  role: 'owner' | 'editor' | 'viewer'
  is_default: boolean
}

export type StoredRoom = {
  id: string
  workspace_id: string
  owner_id: string
  created_by: string
  name: string
  topic: string
  kind: 'channel' | 'private' | 'direct'
  member_ids: string[]
  archived: boolean
  revision: number
  last_seq: number
  updated: string
}

export async function workspaceAccess(
  db: Store,
  actor: string,
  id: string,
  write = false
) {
  const [workspace] = await db.execute<Workspace>(sql`
    select w.id,w.owner_id,w.is_default,case when w.owner_id=${actor} then 'owner' else m.role end as role
    from zillion_databases__workspaces w left join zillion_databases__workspace_members m on m.workspace_id=w.id and m.user_id=${actor}
    where w.id=${id} and (w.owner_id=${actor} or m.user_id=${actor})`)

  if (!workspace) throw new ClientError('Workspace unavailable', 404)
  if (write && workspace.role === 'viewer')
    throw new ClientError('This workspace is read-only', 403)

  return workspace
}

export async function roomAccess(
  db: Store,
  actor: string,
  workspaceId: string,
  roomId: string,
  write = false,
  manage = false
) {
  const workspace = await workspaceAccess(db, actor, workspaceId, write)

  // Serialize mutations without requiring room-metadata UPDATE permission for a sender.
  if (write)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${roomId + ':rooms'},0))`
    )

  const [room] =
    await db.execute<StoredRoom>(sql`select r.*,r.updated::text as updated,
    (select coalesce(max(m.seq),0)::int from rooms__messages m where m.room_id=r.id) as last_seq
    from rooms__rooms r where r.id=${roomId} and r.workspace_id=${workspaceId}`)

  if (!room) throw new ClientError('Room unavailable', 404)
  if (manage && room.created_by !== actor && workspace.role !== 'owner')
    throw new ClientError(
      'Only a room creator or workspace owner can manage this room',
      403
    )
  if (write && room.archived && !manage)
    throw new ClientError('This room is archived', 409)

  return { room, workspace }
}

/** Verified scope is mandatory before reading existing owner-scoped content. */
export async function asWorkspaceOwner<T>(
  db: Store,
  actor: string,
  workspace: Workspace,
  read: () => Promise<T>
) {
  await db.execute(
    sql`select set_config('zillion.user_id',${workspace.owner_id},true)`
  )

  try {
    return await read()
  } finally {
    await db.execute(sql`select set_config('zillion.user_id',${actor},true)`)
  }
}

export async function workspacePeople(
  db: Store,
  actor: string,
  workspace: Workspace
) {
  return asWorkspaceOwner(db, actor, workspace, () =>
    db.execute<{ id: string; name: string; role: string }>(sql`
    select u.id,coalesce(nullif(u.name,''),u.username) as name,
      case when u.id=${workspace.owner_id} then 'owner' else m.role end as role
    from users u left join zillion_databases__workspace_members m on m.user_id=u.id and m.workspace_id=${workspace.id}
    where u.id=${workspace.owner_id} or m.user_id is not null order by name,u.id`)
  )
}

export async function changed(db: Store, room: StoredRoom, messageId?: string) {
  // PostgreSQL delivers NOTIFY only after the request transaction commits.
  await db.execute(
    sql`select pg_notify('monolith_rooms_changed',${JSON.stringify({ workspace_id: room.workspace_id, room_id: room.id, ...(messageId ? { message_id: messageId } : {}) })})`
  )
}
