import { type SQL, sql } from 'drizzle-orm'

import {
  type Store,
  asWorkspaceOwner,
  workspaceAccess,
  workspacePeople
} from '../rooms/access'
import { adapters } from '../search/sources'
import { type Entity, isInternalPath } from './model'

/** Core identity registry: only explicit content adapters can participate. Never enumerate arbitrary tables. */
export async function findEntities(
  db: Store,
  actor: string,
  workspaceId: string,
  query = '',
  keys?: string[]
) {
  const workspace = await workspaceAccess(db, actor, workspaceId)
  const available = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema='public'`
  )
  const tables = new Set(available.map(row => row.table_name))
  const results: Entity[] = []
  const q = '%' + query.replace(/[\\%_]/g, '\\$&') + '%'
  const keysFilter = (key: SQL) =>
    keys ? sql`${key}=any(${sql.param(keys)}::text[])` : sql`true`
  const limit = keys ? Math.max(keys.length, 1) : 20
  const people = await workspacePeople(db, actor, workspace)

  for (const person of people) {
    const key = `user:${person.id}`

    if (
      keys
        ? keys.includes(key)
        : person.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    )
      results.push({
        key,
        title: person.name,
        kind: 'person',
        href: null,
        available: true
      })
  }
  await asWorkspaceOwner(db, actor, workspace, async () => {
    const canonical = tables.has('monolith_editor_documents')
    const canonicalJoin = (kind: string, id: SQL) =>
      canonical
        ? sql`left join monolith_editor_documents c on c.workspace_id=${workspace.id} and c.source_kind=${kind} and c.source_id=${id} and not c.deleted`
        : sql``
    const title = (fallback: SQL) =>
      canonical
        ? sql`coalesce(nullif(c.snapshot->'meta'->>'title',''),${fallback})`
        : fallback
    const selections: SQL[] = [
      sql`select 'page:'||p.id as key,'page' as kind,${title(sql`p.title`)} as title,
        p.route_key||'?workspace='||p.workspace_id as href
        from zillion_databases__workspace_pages p ${canonicalJoin('page', sql`p.id`)} where p.workspace_id=${workspace.id} and p.owner_id=${workspace.owner_id}`,
      sql`select 'record:'||r.id as key,r.item_type as kind,${title(sql`r.title`)} as title,
        '/databases?workspace='||b.workspace_id||'&base='||b.id||'&record='||r.id as href
        from zillion_databases__records r join zillion_databases__bases b on b.id=r.base_id and b.owner_id=r.owner_id
        ${canonicalJoin('record', sql`r.id`)} where b.workspace_id=${workspace.id} and b.owner_id=${workspace.owner_id}`,
      sql`select 'database:'||b.id as key,'database' as kind,b.name as title,'/databases?workspace='||b.workspace_id||'&base='||b.id as href
        from zillion_databases__bases b where b.workspace_id=${workspace.id} and b.owner_id=${workspace.owner_id}`
    ]

    if (tables.has('redraw__projects'))
      selections.push(sql`
      select 'redraw:'||p.id as key,'redraw' as kind,p.title,'/redraw?workspace='||p.workspace_id||'&project='||p.id as href
      from redraw__projects p where p.workspace_id=${workspace.id} and p.owner_id=${workspace.owner_id}`)
    if (tables.has('zillion_databases__knowledge_sources'))
      selections.push(sql`
      select 'knowledge:'||s.id as key,'knowledge' as kind,s.title,'/databases?workspace='||s.workspace_id||'&knowledge='||s.collection_id as href
      from zillion_databases__knowledge_sources s where s.workspace_id=${workspace.id} and s.owner_id=${workspace.owner_id}`)

    const rows = await db.execute<Omit<Entity, 'available'>>(sql`
      select * from (${sql.join(selections, sql` union all `)}) entities
      where ${keysFilter(sql`key`)} and title ilike ${q} order by lower(title),key limit ${limit}`)
    results.push(...rows.map(row => ({ ...row, available: true })))

    // Account-scoped addon objects belong only to their owner's default workspace.
    // Shared members use canonical workspace records, never the owner's private addons.
    if (workspace.is_default && workspace.owner_id === actor) {
      for (const adapter of adapters) {
        if (!tables.has(adapter.table)) continue

        const prefix = 'native-' + adapter.table

        if (keys && !keys.some(key => key.startsWith(prefix + ':'))) continue

        const rows = await db.execute<{ id: string; title: string }>(sql`
          select ${sql.identifier(adapter.key ?? 'id')} as id,${sql.identifier(adapter.title)}::text as title
          from ${sql.identifier(adapter.table)} where owner_id=${actor}
            and ${keysFilter(sql`${prefix + ':'}||${sql.identifier(adapter.key ?? 'id')}`)}
            and ${sql.identifier(adapter.title)}::text ilike ${q}
          order by ${sql.identifier(adapter.title)}::text,id limit ${limit}`)
        results.push(
          ...rows.map(row => ({
            key: `${prefix}:${row.id}`,
            kind: adapter.module,
            title: row.title,
            href: `/${adapter.module}?searchItem=${row.id}&workspace=${workspace.id}`,
            available: true
          }))
        )
      }
    }
  })
  const rooms = await db.execute<{
    id: string
    name: string
  }>(sql`select id,name from rooms__rooms
    where workspace_id=${workspace.id} and name ilike ${q} and ${keysFilter(sql`'room:'||id`)} order by name,id limit ${limit}`)
  results.push(
    ...rooms.map(room => ({
      key: `room:${room.id}`,
      kind: 'room',
      title: room.name,
      href: `/rooms?workspace=${workspace.id}&room=${room.id}`,
      available: true
    }))
  )
  const unique = [
    ...new Map(
      results.map(entity => [
        entity.key,
        {
          ...entity,
          href: entity.href && isInternalPath(entity.href) ? entity.href : null
        }
      ])
    ).values()
  ]

  if (keys) {
    const found = new Map(unique.map(entity => [entity.key, entity]))

    return keys.map(
      key =>
        found.get(key) ?? {
          key,
          kind: 'unavailable',
          title: '',
          href: null,
          available: false
        }
    )
  }

  return unique
    .sort(
      (a, b) => a.title.localeCompare(b.title) || a.key.localeCompare(b.key)
    )
    .slice(0, 40)
}
