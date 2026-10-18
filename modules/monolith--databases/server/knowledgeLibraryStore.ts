import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { contentText } from '@monolith/blocks'
import { ClientError } from '@monolith/server-utils'

import {
  type KnowledgeLibrary,
  type KnowledgeSourceInput,
  knowledgeLimits,
  knowledgeSearchInput
} from '../knowledgeLibraryShared'
import { drainNativeChanges } from './itemBridge'
import {
  type RetrievalSource,
  chunkKnowledge,
  retrieveKnowledge
} from './knowledgeRetrieval'
import {
  bases,
  knowledgeCollections,
  knowledgeSources,
  records,
  workspacePages
} from './schema.drizzle'
import {
  type Store,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

export async function lockKnowledgeLibrary(db: Store, workspaceId: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${workspaceId + ':knowledge-library'},0))`
  )
}

export async function knowledgeCollection(
  db: Store,
  workspaceId: string,
  id: string
) {
  const [collection] = await db
    .select()
    .from(knowledgeCollections)
    .where(
      and(
        eq(knowledgeCollections.workspace_id, workspaceId),
        eq(knowledgeCollections.id, id)
      )
    )

  if (!collection) throw new ClientError('Knowledge collection not found', 404)

  return collection
}

async function liveSources(
  db: Store,
  actor: string,
  workspace: Awaited<ReturnType<typeof workspaceAccess>>,
  collectionIds?: string[],
  metadataOnly = false
): Promise<
  (RetrievalSource & {
    source_id: string | null
    media_type: 'text/plain' | 'text/markdown' | null
    characters: number
    chunks: number
  })[]
> {
  if (collectionIds?.length === 0) return []

  const stored = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.workspace_id, workspace.id),
        collectionIds
          ? inArray(knowledgeSources.collection_id, collectionIds)
          : undefined
      )
    )
    .orderBy(asc(knowledgeSources.created), asc(knowledgeSources.id))

  if (stored.length > knowledgeLimits.sources)
    throw new ClientError('Knowledge library source limit exceeded', 413)

  return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
    await drainNativeChanges(db, workspace.owner_id)

    if (!metadataOnly) {
      // Check serialized payload size before reading canonical bodies. The
      // resolved plain text is checked again below, including UTF-16 lengths.
      const [budget] = await db
        .select({
          characters: sql<number>`coalesce(sum(case when ${knowledgeSources.kind}='text' then char_length(${knowledgeSources.imported_content}) when ${knowledgeSources.kind}='page' then char_length(${workspacePages.body}::text) else char_length(${records.content}) end),0)::bigint`
        })
        .from(knowledgeSources)
        .leftJoin(
          workspacePages,
          and(
            eq(workspacePages.id, knowledgeSources.page_id),
            eq(workspacePages.workspace_id, workspace.id)
          )
        )
        .leftJoin(
          records,
          and(
            eq(records.id, knowledgeSources.record_id),
            eq(records.owner_id, workspace.owner_id)
          )
        )
        .where(
          and(
            eq(knowledgeSources.workspace_id, workspace.id),
            collectionIds
              ? inArray(knowledgeSources.collection_id, collectionIds)
              : undefined
          )
        )

      if (Number(budget?.characters) > knowledgeLimits.retrievalCharacters)
        throw retrievalSizeError()
    }

    const resolved: Awaited<ReturnType<typeof liveSources>> = []

    let totalCharacters = 0

    // A snapshot retains metadata only, so large canonical documents remain
    // manageable and removable even after exceeding the retrieval quota.
    // Release each small batch of canonical bodies before loading the next.
    for (let offset = 0; offset < stored.length; offset += 8) {
      const batch = stored.slice(offset, offset + 8)
      const pageIds = batch.flatMap(source =>
        source.page_id ? [source.page_id] : []
      )
      const recordIds = batch.flatMap(source =>
        source.record_id ? [source.record_id] : []
      )
      const pages = pageIds.length
        ? await db
            .select()
            .from(workspacePages)
            .where(
              and(
                eq(workspacePages.workspace_id, workspace.id),
                inArray(workspacePages.id, pageIds)
              )
            )
        : []
      const items = recordIds.length
        ? await db
            .select({ item: records, base: bases.id })
            .from(records)
            .innerJoin(bases, eq(records.base_id, bases.id))
            .where(
              and(
                eq(bases.workspace_id, workspace.id),
                eq(bases.owner_id, workspace.owner_id),
                eq(records.owner_id, workspace.owner_id),
                inArray(records.id, recordIds)
              )
            )
        : []

      for (const source of batch) {
        const page = pages.find(page => page.id === source.page_id)
        const item = items.find(row => row.item.id === source.record_id)?.item

        if (
          (source.kind === 'page' && !page) ||
          (source.kind === 'record' && !item)
        )
          continue

        const content = page
          ? page.body.blocks
              .filter(block => block.type === 'document')
              .map(block => contentText(block.content))
              .join('\n\n')
          : item
            ? contentText(item.content)
            : (source.imported_content ?? '')
        const title = page?.title ?? item?.title ?? source.title

        totalCharacters += content.length
        if (
          !metadataOnly &&
          (content.length > knowledgeLimits.characters ||
            totalCharacters > knowledgeLimits.retrievalCharacters)
        )
          throw retrievalSizeError()

        resolved.push({
          id: source.id,
          collection_id: source.collection_id,
          kind: source.kind,
          title,
          content: metadataOnly ? '' : content,
          characters: content.length,
          chunks: metadataOnly ? chunkKnowledge(content || title).length : 0,
          href: page
            ? `${page.route_key}?workspace=${workspace.id}`
            : item
              ? `/databases?workspace=${workspace.id}&base=${item.base_id}&record=${item.id}`
              : null,
          updated: (
            page?.updated ??
            item?.updated ??
            source.updated
          ).toISOString(),
          source_id: page?.id ?? item?.id ?? null,
          media_type: source.media_type
        })
      }
    }

    return resolved
  })
}

function retrievalSizeError() {
  return new ClientError(
    'Selected knowledge exceeds the retrieval size limit. Choose fewer collections or smaller sources.',
    413
  )
}

export async function snapshotKnowledgeLibrary(
  db: Store,
  actor: string,
  workspaceId: string
): Promise<KnowledgeLibrary> {
  const workspace = await workspaceAccess(db, actor, workspaceId)
  const collections = await db
    .select()
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.workspace_id, workspace.id))
    .orderBy(asc(knowledgeCollections.name), asc(knowledgeCollections.id))
  const sources = await liveSources(db, actor, workspace, undefined, true)
  const catalog = await withWorkspaceOwner(
    db,
    actor,
    workspace.owner_id,
    async () => {
      const pages = await db
        .select({
          id: workspacePages.id,
          title: workspacePages.title,
          route_key: workspacePages.route_key
        })
        .from(workspacePages)
        .where(eq(workspacePages.workspace_id, workspace.id))
        .orderBy(asc(workspacePages.title), asc(workspacePages.id))
        .limit(2_001)
      const items = await db
        .select({
          id: records.id,
          title: records.title,
          base_id: records.base_id
        })
        .from(records)
        .innerJoin(bases, eq(records.base_id, bases.id))
        .where(
          and(
            eq(bases.workspace_id, workspace.id),
            eq(bases.owner_id, workspace.owner_id),
            eq(records.owner_id, workspace.owner_id)
          )
        )
        .orderBy(asc(records.title), asc(records.id))
        .limit(2_001)

      return [
        ...pages.map(page => ({
          kind: 'page' as const,
          id: page.id,
          title: page.title,
          href: `${page.route_key}?workspace=${workspace.id}`
        })),
        ...items.map(item => ({
          kind: 'record' as const,
          id: item.id,
          title: item.title,
          href: `/databases?workspace=${workspace.id}&base=${item.base_id}&record=${item.id}`
        }))
      ]
    }
  )

  return {
    engine: 'lexical',
    role: workspace.role,
    collections: collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      source_count: sources.filter(
        source => source.collection_id === collection.id
      ).length,
      updated: collection.updated.toISOString()
    })),
    sources: sources.map(({ content: _content, ...source }) => source),
    catalog: catalog.slice(0, 2_000),
    catalog_truncated: catalog.length > 2_000
  }
}

export async function searchWorkspaceKnowledge(
  db: Store,
  actor: string,
  workspaceId: string,
  input: unknown
) {
  const request = knowledgeSearchInput.parse(input)
  const workspace = await workspaceAccess(db, actor, workspaceId)

  if (request.collection_ids)
    for (const id of new Set(request.collection_ids))
      await knowledgeCollection(db, workspace.id, id)

  const sources = await liveSources(
    db,
    actor,
    workspace,
    request.collection_ids
  )

  return retrieveKnowledge(sources, request.query, request.limit)
}

export async function addKnowledgeSource(
  db: Store,
  actor: string,
  workspaceId: string,
  input: KnowledgeSourceInput
) {
  const workspace = await workspaceAccess(db, actor, workspaceId, true)
  await lockKnowledgeLibrary(db, workspace.id)
  await knowledgeCollection(db, workspace.id, input.collection_id)
  const [current] = await db
    .select({
      count: sql<number>`count(*)::int`,
      characters: sql<number>`coalesce(sum(char_length(${knowledgeSources.imported_content})),0)::int`
    })
    .from(knowledgeSources)
    .where(eq(knowledgeSources.workspace_id, workspace.id))

  if (Number(current?.count) >= knowledgeLimits.sources)
    throw new ClientError(
      'This workspace has reached its knowledge source limit',
      409
    )
  if (
    input.kind === 'text' &&
    Number(current?.characters ?? 0) + input.content.length >
      knowledgeLimits.retrievalCharacters
  )
    throw new ClientError(
      'This workspace has reached its imported text limit',
      413
    )
  let pageId: string | null = null,
    recordId: string | null = null,
    baseId: string | null = null

  if (input.kind === 'page') {
    const [page] = await db
      .select({ id: workspacePages.id })
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.id, input.source_id),
          eq(workspacePages.workspace_id, workspace.id)
        )
      )

    if (!page) throw new ClientError('Page not found in this workspace', 404)
    pageId = page.id
  } else if (input.kind === 'record') {
    await withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [item] = await db
        .select({ id: records.id, base_id: records.base_id })
        .from(records)
        .innerJoin(bases, eq(records.base_id, bases.id))
        .where(
          and(
            eq(records.id, input.source_id),
            eq(bases.workspace_id, workspace.id),
            eq(bases.owner_id, workspace.owner_id),
            eq(records.owner_id, workspace.owner_id)
          )
        )

      if (!item)
        throw new ClientError('Record not found in this workspace', 404)
      recordId = item.id
      baseId = item.base_id
    })
  }

  const [source] = await db
    .insert(knowledgeSources)
    .values({
      owner_id: workspace.owner_id,
      workspace_id: workspace.id,
      collection_id: input.collection_id,
      kind: input.kind,
      page_id: pageId,
      record_id: recordId,
      record_base_id: baseId,
      title: input.kind === 'text' ? input.title : '',
      imported_content: input.kind === 'text' ? input.content : null,
      media_type: input.kind === 'text' ? input.media_type : null
    })
    .onConflictDoNothing()
    .returning({ id: knowledgeSources.id })

  if (!source)
    throw new ClientError('This source is already in this collection', 409)

  return source
}
