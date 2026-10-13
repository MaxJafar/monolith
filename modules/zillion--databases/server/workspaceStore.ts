import { and, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { type CanvasPage, validateCanvasPage } from '@lifeforge/blocks'
import { ClientError } from '@lifeforge/server-utils'

import { profileModules } from '../workspaceShared'
import {
  bases,
  documents,
  workspaceMembers,
  workspacePages,
  workspaces
} from './schema.drizzle'
import type { Database, Transaction } from './store'

export type Store = Database | Transaction

export async function lockConnectedOwner(db: Store, owner: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${owner + ':connected-items'},0))`
  )
}

export async function inWorkspace<T>(
  db: Store,
  id: string,
  operation: () => Promise<T>
): Promise<T> {
  const [previous] = await db.execute<{ value: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as value`
  )
  await db.execute(sql`select set_config('monolith.workspace_id',${id},true)`)
  try {
    return await operation()
  } finally {
    await db.execute(
      sql`select set_config('monolith.workspace_id',${previous?.value ?? ''},true)`
    )
  }
}

export async function workspaceAccess(
  db: Store,
  actor: string,
  id: string,
  write = false,
  ownerOnly = false
) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
  if (!workspace) throw new ClientError('Workspace not found', 404)
  const [member] =
    workspace.owner_id === actor
      ? []
      : await db
          .select()
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspace_id, id),
              eq(workspaceMembers.user_id, actor)
            )
          )
  const role = workspace.owner_id === actor ? ('owner' as const) : member?.role
  if (!role) throw new ClientError('Workspace not found', 404)
  if ((ownerOnly && role !== 'owner') || (write && role === 'viewer'))
    throw new ClientError('This workspace is read-only for your account', 403)
  return { ...workspace, role }
}

/** A verified workspace grants access to its own rows, never an owner's account. */
export async function withWorkspaceOwner<T>(
  db: Store,
  actor: string,
  owner: string,
  operation: () => Promise<T>
): Promise<T> {
  if (actor === owner) return operation()
  await db.execute(sql`select set_config('zillion.user_id', ${owner}, true)`)
  try {
    return await operation()
  } finally {
    await db.execute(sql`select set_config('zillion.user_id', ${actor}, true)`)
  }
}

export async function defaultWorkspace(db: Store, actor: string) {
  await lockConnectedOwner(db, actor)
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${actor + ':workspace'},0))`
  )
  const [existing] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.owner_id, actor), eq(workspaces.is_default, true)))
  if (existing) {
    // Add documents introduced before this migration without replacing newer canvases.
    await backfillDocuments(db, existing.id, actor)
    return existing
  }
  const [workspace] = await db
    .insert(workspaces)
    .values({
      owner_id: actor,
      name: 'Personal',
      enabled_modules: profileModules('personal'),
      is_default: true
    })
    .returning()
  if (!workspace) throw Error('Workspace creation failed')
  await db
    .update(bases)
    .set({ workspace_id: workspace.id })
    .where(and(eq(bases.owner_id, actor), sql`${bases.workspace_id} is null`))
  const [user] = await db.execute<{ pages: Record<string, CanvasPage> }>(sql`
    select workspace_pages as pages from users where id=${actor}
  `)
  for (const [key, page] of Object.entries(user?.pages ?? {})) {
    validateCanvasPage(page)
    const match = /^\/page\/([a-f0-9-]{36})$/i.exec(key)
    await db
      .insert(workspacePages)
      .values({
        id: match?.[1] ?? randomUUID(),
        owner_id: actor,
        workspace_id: workspace.id,
        route_key: key,
        title: page.title,
        icon: page.icon,
        body: { ...page, revision: Math.max(1, page.revision) },
        revision: Math.max(1, page.revision)
      })
      .onConflictDoNothing()
  }
  await backfillDocuments(db, workspace.id, actor)
  return workspace
}

async function backfillDocuments(
  db: Store,
  workspaceId: string,
  actor: string
) {
  const missing = await db
    .select({ doc: documents })
    .from(documents)
    .leftJoin(workspacePages, eq(workspacePages.id, documents.id))
    .where(
      and(eq(documents.owner_id, actor), sql`${workspacePages.id} is null`)
    )
  for (const { doc } of missing)
    await importLegacyDocument(db, workspaceId, actor, {
      ...doc,
      parent_id: null
    })
  for (const { doc } of missing)
    if (doc.parent_id) {
      const [parent] = await db
        .select({ id: workspacePages.id })
        .from(workspacePages)
        .where(
          and(
            eq(workspacePages.id, doc.parent_id),
            eq(workspacePages.workspace_id, workspaceId)
          )
        )
      if (parent) {
        await validateParent(db, workspaceId, doc.id, parent.id)
        await db
          .update(workspacePages)
          .set({ parent_id: parent.id })
          .where(eq(workspacePages.id, doc.id))
      }
    }
}

export async function importLegacyDocument(
  db: Store,
  workspaceId: string,
  actor: string,
  doc: {
    id: string
    title: string
    content: string
    revision: number
    updated: Date
    parent_id: string | null
  }
) {
  const [current] = await db
    .select()
    .from(workspacePages)
    .where(
      and(
        eq(workspacePages.id, doc.id),
        eq(workspacePages.workspace_id, workspaceId)
      )
    )
  const block = {
    id: randomUUID(),
    type: 'document' as const,
    width: 'full' as const,
    title: '',
    content: doc.content,
    url: '',
    widget: ''
  }
  const body: CanvasPage = current?.body ?? {
    version: 1,
    title: doc.title,
    icon: 'lucide:file-text',
    fullWidth: false,
    revision: doc.revision,
    updated: doc.updated.toISOString(),
    blocks: [block]
  }
  const index = body.blocks.findIndex(item => item.type === 'document')
  const blocks = current
    ? index < 0
      ? [...body.blocks, block]
      : body.blocks.map((item, i) =>
          i === index ? { ...item, content: doc.content } : item
        )
    : body.blocks
  const revision = current ? current.revision + 1 : Math.max(1, doc.revision)
  const [parent] = doc.parent_id
    ? await db
        .select({ id: workspacePages.id })
        .from(workspacePages)
        .where(
          and(
            eq(workspacePages.id, doc.parent_id),
            eq(workspacePages.workspace_id, workspaceId)
          )
        )
    : []
  const parentId = parent?.id ?? null
  await validateParent(db, workspaceId, doc.id, parentId)
  const next = {
    ...body,
    title: doc.title,
    revision,
    updated: doc.updated.toISOString(),
    blocks
  }
  if (current)
    await db
      .update(workspacePages)
      .set({
        title: doc.title,
        body: next,
        revision,
        parent_id: parentId,
        updated: doc.updated
      })
      .where(eq(workspacePages.id, doc.id))
  else
    await db
      .insert(workspacePages)
      .values({
        id: doc.id,
        owner_id: actor,
        workspace_id: workspaceId,
        route_key: `/page/${doc.id}`,
        title: doc.title,
        body: next,
        revision,
        parent_id: parentId
      })
      .onConflictDoNothing()
}

export async function validateParent(
  db: Store,
  workspace: string,
  pageId: string,
  parentId: string | null
) {
  if (!parentId) return
  const seen = new Set([pageId])
  let current: string | null = parentId
  while (current) {
    if (seen.has(current))
      throw new ClientError('Pages cannot contain themselves', 409)
    seen.add(current)
    const [parent] = await db
      .select({ parent: workspacePages.parent_id })
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.id, current),
          eq(workspacePages.workspace_id, workspace)
        )
      )
    if (!parent)
      throw new ClientError('Parent page not found in this workspace', 404)
    current = parent.parent
  }
}
