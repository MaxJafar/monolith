import { type SQL, sql } from 'drizzle-orm'

import { type CanonicalSnapshot, serializeCanonical } from '@monolith/blocks'

type Executor = { execute: (query: SQL) => PromiseLike<unknown> }
export type CanonicalBody = {
  workspaceId: string
  kind: 'page' | 'record' | 'note'
  id: string
  snapshot: CanonicalSnapshot
  content: string
  revision: number
  updatedAt: string
}

/** Read through the caller's restricted transaction and RLS identity. No owner
 * switching or privileged connection is performed by this helper. */
export async function canonicalBodies(
  db: Executor,
  workspaceId?: string
): Promise<Map<string, CanonicalBody>> {
  const available = (await db.execute(
    sql`select to_regclass('public.monolith_editor_documents') is not null as available`
  )) as { available: boolean }[]
  if (!available[0]?.available) return new Map()
  const rows =
    (await db.execute(sql`select d.workspace_id,d.source_kind,d.source_id,d.snapshot,d.revision,d.updated_at,a.alias_kind,a.alias_id
    from monolith_editor_documents d left join monolith_editor_aliases a
    on a.workspace_id=d.workspace_id and a.source_kind=d.source_kind and a.source_id=d.source_id
    where not d.deleted ${workspaceId ? sql`and d.workspace_id=${workspaceId}::uuid` : sql``}
    limit 10001`)) as {
      workspace_id: string
      source_kind: CanonicalBody['kind']
      source_id: string
      snapshot: CanonicalSnapshot
      revision: string | number
      updated_at: string
      alias_kind?: string
      alias_id?: string
    }[]
  if (rows.length > 10000)
    throw new Error('Narrow the workspace scope to read canonical documents')
  const result = new Map<string, CanonicalBody>()
  for (const row of rows) {
    const value = {
      workspaceId: row.workspace_id,
      kind: row.source_kind,
      id: row.source_id,
      snapshot: row.snapshot,
      content: serializeCanonical(row.snapshot),
      revision: Number(row.revision),
      updatedAt: row.updated_at
    }
    result.set(`${row.source_kind}:${row.source_id}`, value)
    if (row.source_kind === 'page')
      result.set(`document:${row.source_id}`, value)
    if (row.alias_kind && row.alias_id)
      result.set(`${row.alias_kind}:${row.alias_id}`, value)
  }
  return result
}
