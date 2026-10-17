import type { GraphNode } from '@monolith/blocks'
import { sql } from 'drizzle-orm'

import type { Store } from './workspaceStore'

/** Optional addon resources stay workspace scoped; core never imports the addon runtime. */
export async function redrawReferences(
  db: Pick<Store, 'execute'>,
  workspace: string,
  owner: string
): Promise<(GraphNode & { content: string })[]> {
  const [installed] = await db.execute<{ exists: boolean }>(
    sql`select to_regclass('public.redraw__projects') is not null as exists`
  )

  if (!installed?.exists) return []

  const rows = await db.execute<{ id: string; title: string; tags: string[] }>(
    sql`select id, title, case when jsonb_typeof(document->'tags') = 'array' then document->'tags' else '[]'::jsonb end as tags from redraw__projects where workspace_id=${workspace} and owner_id=${owner} and archived=false order by updated desc limit 5000`
  )

  return rows.map(row => ({
    id: row.id,
    key: `redraw:${row.id}`,
    kind: 'redraw',
    title: row.title,
    tags: row.tags,
    context: ['Redraw', ...row.tags.map(tag => `#${tag}`)].join(' · '),
    href: `/redraw/${row.id}?workspace=${workspace}`,
    content: ''
  }))
}
