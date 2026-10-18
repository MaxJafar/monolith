import {
  type GraphEdge,
  type GraphNode,
  type KnowledgeSnapshot,
  type PageTarget,
  assertContent,
  contentText,
  extractReferences,
  pageKey,
  resolveReference,
  stabilizeReferences
} from '@monolith/blocks'
import { ClientError, canonicalBodies } from '@monolith/server-utils'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { entries, subjects } from '../../monolith--notes/server/schema.drizzle'
import { redrawReferences } from './redrawReferences'
import {
  bases,
  documents,
  fields,
  knowledgeLinks,
  links,
  recordSources,
  records,
  workspacePages
} from './schema.drizzle'
import type { Database, Transaction } from './store'

export async function pageCatalog(
  db: Pick<Database, 'select'>,
  owner: string
): Promise<(GraphNode & { content: string; aliasOf?: string })[]> {
  const fullDb = db as Database
  const [scope] = await fullDb.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )
  const canonical = await canonicalBodies(fullDb, scope?.id || undefined)

  if (scope?.id) {
    const databases = await db
      .select()
      .from(bases)
      .where(and(eq(bases.workspace_id, scope.id), eq(bases.owner_id, owner)))
    const items = databases.length
      ? await db
          .select()
          .from(records)
          .where(
            inArray(
              records.base_id,
              databases.map(base => base.id)
            )
          )
      : []
    const pages = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.workspace_id, scope.id))
    const sources = items.length
      ? await db
          .select()
          .from(recordSources)
          .where(
            and(
              inArray(
                recordSources.record_id,
                items.map(item => item.id)
              ),
              eq(recordSources.kind, 'note')
            )
          )
      : []

    return [
      ...(await redrawReferences(fullDb, scope.id, owner)),
      ...items.map(item => ({
        id: item.id,
        key: `record:${item.id}`,
        kind: 'record' as const,
        title: item.title,
        context: databases.find(base => base.id === item.base_id)?.name ?? '',
        content: canonical.get(`record:${item.id}`)?.content ?? item.content
      })),
      ...pages.map(page => ({
        id: page.id,
        key: `document:${page.id}`,
        kind: 'document' as const,
        title: page.title,
        context: 'Pages',
        content:
          canonical.get(`page:${page.id}`)?.content ??
          page.body.blocks
            .filter(block => block.type === 'document')
            .map(block => contentText(block.content))
            .join('\n')
      })),
      ...sources.map(source => {
        const item = items.find(item => item.id === source.record_id)!

        return {
          id: source.native_id,
          key: `note:${source.native_id}`,
          kind: 'note' as const,
          title: item.title,
          context: 'Notes',
          content: canonical.get(`record:${item.id}`)?.content ?? item.content,
          aliasOf: `record:${item.id}`
        }
      })
    ]
  }

  const [docs, pages, notes, databases, folders] = await Promise.all([
    db.select().from(documents).where(eq(documents.owner_id, owner)),
    db.select().from(records).where(eq(records.owner_id, owner)),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.owner_id, owner), eq(entries.type, 'note'))),
    db.select().from(bases).where(eq(bases.owner_id, owner)),
    db.select().from(subjects).where(eq(subjects.owner_id, owner))
  ])
  const nodes: (GraphNode & { content: string })[] = [
    ...docs.map(doc => ({
      id: doc.id,
      key: `document:${doc.id}`,
      kind: 'document' as const,
      title: doc.title,
      context: 'Documents',
      parent: doc.parent_id ? `document:${doc.parent_id}` : null,
      content: doc.content
    })),
    ...pages.map(page => ({
      id: page.id,
      key: `record:${page.id}`,
      kind: 'record' as const,
      title: page.title,
      context: databases.find(base => base.id === page.base_id)?.name ?? '',
      content: page.content
    })),
    ...notes.map(note => ({
      id: note.id,
      key: `note:${note.id}`,
      kind: 'note' as const,
      title: note.name,
      context:
        folders.find(subject => subject.id === note.subject_id)?.title ?? '',
      content: note.content
    }))
  ]

  return nodes.map(node => ({
    ...node,
    content: canonical.get(node.key)?.content ?? node.content
  }))
}

export async function prepareContent(
  db: Pick<Database, 'select'>,
  owner: string,
  value: string,
  previous = ''
) {
  try {
    assertContent(value)
  } catch (error) {
    throw new ClientError(
      error instanceof Error ? error.message : 'Invalid document'
    )
  }

  const catalog = await pageCatalog(db, owner)
  const old = new Set(
    extractReferences(previous)
      .filter(ref => ref.id && ref.kind)
      .map(ref => `${ref.kind}:${ref.id}`)
  )

  for (const ref of extractReferences(value)) {
    if (
      ref.id &&
      ref.kind &&
      !resolveReference(ref, catalog) &&
      !old.has(`${ref.kind}:${ref.id}`)
    )
      throw new ClientError('Linked page is unavailable', 404)
  }

  return stabilizeReferences(
    value,
    catalog.filter(page => !page.aliasOf)
  )
}

export async function knowledgeSnapshot(
  db: Database | Transaction,
  owner: string
): Promise<KnowledgeSnapshot> {
  const [catalog, relational, definitions, semantic] = await Promise.all([
    pageCatalog(db, owner),
    db.select().from(links).where(eq(links.owner_id, owner)),
    db.select().from(fields).where(eq(fields.owner_id, owner)),
    db.select().from(knowledgeLinks).where(eq(knowledgeLinks.owner_id, owner))
  ])
  const available = new Set(catalog.map(page => page.key))
  const edges: GraphEdge[] = []

  let unresolved = 0

  const seen = new Set<string>()

  function add(edge: GraphEdge) {
    if (
      !available.has(edge.source) ||
      !available.has(edge.target) ||
      edge.source === edge.target ||
      seen.has(edge.id)
    )
      return
    seen.add(edge.id)
    edges.push(edge)
  }

  for (const source of catalog) {
    if (source.parent)
      add({
        id: `parent:${source.key}`,
        source: source.key,
        target: source.parent,
        kind: 'parent',
        label: 'Parent'
      })

    for (const ref of extractReferences(source.content)) {
      const target = resolveReference(ref, catalog)

      if (!target) {
        unresolved++
        continue
      }
      add({
        id: `mention:${source.key}:${pageKey(target)}`,
        source: source.key,
        target: pageKey(target),
        kind: 'mention',
        label: 'Mentions'
      })
    }
  }

  for (const edge of relational) {
    const field = definitions.find(field => field.id === edge.field_id)

    if (
      !field?.config.reciprocal_field_id ||
      field.id > field.config.reciprocal_field_id
    )
      continue
    add({
      id: `relation:${edge.id}`,
      source: `record:${edge.source_record_id}`,
      target: `record:${edge.target_record_id}`,
      kind: 'relation',
      label: field.name
    })
  }
  for (const edge of semantic)
    add({
      id: `related:${edge.id}`,
      source: edge.source_key,
      target: edge.target_key,
      kind: 'related',
      label: edge.label
    })

  return {
    nodes: catalog.map(({ content, ...page }) => ({
      ...page,
      excerpt: contentText(content).slice(0, 200)
    })),
    edges,
    unresolved
  }
}

export async function lockPage(
  db: Transaction,
  owner: string,
  page: Pick<PageTarget, 'kind' | 'id'>
) {
  const [scope] = await db.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )

  if (page.kind === 'redraw') {
    if (
      !scope?.id ||
      !(await redrawReferences(db, scope.id, owner)).some(
        item => item.id === page.id
      )
    )
      throw new ClientError('Redraw file not found', 404)

    return
  }

  if (scope?.id && page.kind === 'document') {
    const [row] = await db
      .select({ id: workspacePages.id })
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.id, page.id),
          eq(workspacePages.workspace_id, scope.id)
        )
      )
      .for('key share')

    if (!row) throw new ClientError('Page not found', 404)

    return
  }

  const target =
    page.kind === 'document'
      ? documents
      : page.kind === 'record'
        ? records
        : entries
  const [row] = await db
    .select({ id: target.id })
    .from(target)
    .where(
      and(
        eq(target.owner_id, owner),
        eq(target.id, page.id),
        ...(page.kind === 'note' ? [eq(entries.type, 'note')] : [])
      )
    )
    .for('key share')

  if (!row) throw new ClientError('Page not found', 404)
}
