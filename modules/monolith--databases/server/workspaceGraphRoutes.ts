import {
  type GraphEdge,
  type GraphNode,
  type KnowledgeSnapshot,
  canonicalDatabaseReferences,
  contentText,
  extractReferences,
  pageKey,
  resolveReference
} from '@monolith/blocks'
import { ClientError, canonicalBodies } from '@monolith/server-utils'
import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

import endpoints from './endpoints'
import { drainNativeChanges } from './itemBridge'
import { ownerId } from './model'
import { redrawReferences } from './redrawReferences'
import {
  bases,
  fields,
  knowledgeLinks,
  links,
  recordSources,
  records,
  workspacePages
} from './schema.drizzle'
import {
  type Store,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

const node = z.object({
  id: z.string().uuid(),
  key: z.string(),
  kind: z.enum(['document', 'record', 'note', 'redraw']),
  href: z.string().optional(),
  title: z.string(),
  tags: z.array(z.string()).optional(),
  context: z.string().optional(),
  parent: z.string().nullable().optional(),
  excerpt: z.string().optional()
})
const edge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(['mention', 'relation', 'related', 'parent']),
  label: z.string()
})
const target = z.object({
  kind: z.enum(['document', 'record', 'note', 'redraw']),
  id: z.string().uuid()
})

async function assertTarget(
  db: Store,
  workspace: string,
  value: z.infer<typeof target>,
  owner: string
) {
  if (value.kind === 'redraw') {
    const resources = await redrawReferences(db, workspace, owner)

    if (resources.some(item => item.id === value.id)) return
  }

  if (value.kind === 'document') {
    const [page] = await db
      .select()
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.id, value.id),
          eq(workspacePages.workspace_id, workspace)
        )
      )

    if (page) return
  } else if (value.kind === 'record') {
    const [item] = await db
      .select({ id: records.id })
      .from(records)
      .innerJoin(bases, eq(records.base_id, bases.id))
      .where(and(eq(records.id, value.id), eq(bases.workspace_id, workspace)))

    if (item) return
  }
  throw new ClientError('Linked page is unavailable in this workspace', 404)
}

export const resources = endpoints
  .query({
    description: 'List optional addon files available for workspace mentions',
    input: { query: z.object({ workspace_id: z.string().uuid() }) },
    output: { OK: z.array(node) }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () =>
      response.ok(await redrawReferences(db, workspace.id, workspace.owner_id))
    )
  })

export const relate = endpoints
  .mutation({
    description: 'Connect workspace pages and records',
    input: {
      query: z.object({ workspace_id: z.string().uuid() }),
      body: z.object({
        source: target,
        target: target,
        label: z.string().trim().min(1).max(255)
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      await assertTarget(db, workspace.id, body.source, workspace.owner_id)
      await assertTarget(db, workspace.id, body.target, workspace.owner_id)
      const [source, target] = [body.source, body.target].sort((a, b) =>
        `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)
      )

      if (source!.id === target!.id && source!.kind === target!.kind)
        throw new ClientError('Choose two different items')

      const sourceKey = `${source!.kind}:${source!.id}`,
        targetKey = `${target!.kind}:${target!.id}`
      await db
        .insert(knowledgeLinks)
        .values({
          owner_id: workspace.owner_id,
          source_key: sourceKey,
          target_key: targetKey,
          source_page_id: source!.kind === 'document' ? source!.id : null,
          source_record_id: source!.kind === 'record' ? source!.id : null,
          target_page_id: target!.kind === 'document' ? target!.id : null,
          target_record_id: target!.kind === 'record' ? target!.id : null,
          label: body.label
        })
        .onConflictDoUpdate({
          target: [
            knowledgeLinks.owner_id,
            knowledgeLinks.source_key,
            knowledgeLinks.target_key
          ],
          set: { label: body.label }
        })

      return response.noContent()
    })
  })

export const unrelate = endpoints
  .mutation({
    description: 'Remove a workspace semantic relation',
    input: {
      query: z.object({
        workspace_id: z.string().uuid(),
        id: z.string().uuid()
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [edge] = await db
        .select()
        .from(knowledgeLinks)
        .where(
          and(
            eq(knowledgeLinks.id, query.id),
            eq(knowledgeLinks.owner_id, workspace.owner_id)
          )
        )

      if (!edge) throw new ClientError('Relation not found', 404)

      for (const key of [edge.source_key, edge.target_key]) {
        const [kind, id] = key.split(':')
        await assertTarget(
          db,
          workspace.id,
          target.parse({ kind, id }),
          workspace.owner_id
        )
      }
      await db.delete(knowledgeLinks).where(eq(knowledgeLinks.id, query.id))

      return response.noContent()
    })
  })

export const snapshot = endpoints
  .query({
    description:
      'Workspace page links, projects and database relations without duplicate module items',
    input: { query: z.object({ workspace_id: z.string().uuid() }) },
    output: {
      OK: z.object({
        nodes: z.array(node),
        edges: z.array(edge),
        unresolved: z.number().int(),
        databases: z.array(
          z.object({
            id: z.string().uuid(),
            title: z.string(),
            href: z.string(),
            recordIds: z.array(z.string().uuid()),
            embeddedIn: z.array(z.string())
          })
        )
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
    const canonical = await canonicalBodies(db, workspace.id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      await drainNativeChanges(db, workspace.owner_id)
      const databases = await db
        .select()
        .from(bases)
        .where(eq(bases.workspace_id, workspace.id))
      const ids = databases.map(base => base.id)
      const pages = await db
        .select()
        .from(workspacePages)
        .where(eq(workspacePages.workspace_id, workspace.id))
      const items = ids.length
        ? await db.select().from(records).where(inArray(records.base_id, ids))
        : []
      const itemIds = items.map(item => item.id)
      const properties = ids.length
        ? await db.select().from(fields).where(inArray(fields.base_id, ids))
        : []
      const relations = itemIds.length
        ? await db
            .select()
            .from(links)
            .where(
              and(
                inArray(links.source_record_id, itemIds),
                inArray(links.target_record_id, itemIds)
              )
            )
        : []
      const sources = itemIds.length
        ? await db
            .select()
            .from(recordSources)
            .where(inArray(recordSources.record_id, itemIds))
        : []
      const nodes: (GraphNode & { content: string })[] = [
        ...(await redrawReferences(db, workspace.id, workspace.owner_id)),
        ...items.map(item => ({
          id: item.id,
          key: `record:${item.id}`,
          kind: 'record' as const,
          title:
            canonical.get(`record:${item.id}`)?.snapshot.meta.title ??
            item.title,
          tags: item.tags,
          context: databases.find(base => base.id === item.base_id)?.name ?? '',
          content: canonical.get(`record:${item.id}`)?.content ?? item.content
        })),
        ...pages
          .filter(page => page.route_key.startsWith('/page/'))
          .map(page => ({
            id: page.id,
            key: `document:${page.id}`,
            kind: 'document' as const,
            title:
              canonical.get(`page:${page.id}`)?.snapshot.meta.title ??
              page.title,
            context: workspace.name,
            parent: page.parent_id ? `document:${page.parent_id}` : null,
            content:
              canonical.get(`page:${page.id}`)?.content ??
              page.body.blocks
                .filter(block => block.type === 'document')
                .map(block => contentText(block.content))
                .join('\n')
          }))
      ]
      const catalog = new Map(nodes.map(node => [node.key, node]))
      const aliases = new Map(
        sources
          .filter(source => source.kind === 'note')
          .map(source => [
            `note:${source.native_id}`,
            `record:${source.record_id}`
          ])
      )
      const edges: GraphEdge[] = relations.map(link => ({
        id: link.id,
        source: `record:${link.source_record_id}`,
        target: `record:${link.target_record_id}`,
        kind: 'relation',
        label:
          properties.find(field => field.id === link.field_id)?.name ??
          'Relation'
      }))

      for (const item of items)
        if (item.project_id && catalog.has(`record:${item.project_id}`))
          edges.push({
            id: `project:${item.id}`,
            source: `record:${item.id}`,
            target: `record:${item.project_id}`,
            kind: 'relation',
            label: 'Project'
          })
      for (const page of pages)
        if (page.parent_id && catalog.has(`document:${page.parent_id}`))
          edges.push({
            id: `parent:${page.id}`,
            source: `document:${page.id}`,
            target: `document:${page.parent_id}`,
            kind: 'parent',
            label: 'Parent'
          })
      let unresolved = 0

      for (const current of nodes) {
        const page = pages.find(page => page.id === current.id)
        const contents = canonical.has(
          current.kind === 'document' ? `page:${current.id}` : current.key
        )
          ? [current.content]
          : page
            ? page.body.blocks
                .filter(block => block.type === 'document')
                .map(block => block.content)
            : [current.content]

        for (const content of contents)
          for (const reference of extractReferences(content)) {
            const key =
              reference.id && reference.kind
                ? `${reference.kind}:${reference.id}`
                : ''
            const target =
              catalog.get(aliases.get(key) ?? key) ??
              resolveReference(reference, nodes)

            if (!target) {
              unresolved++
              continue
            }

            const targetKey = pageKey(target)

            if (targetKey !== current.key)
              edges.push({
                id: `mention:${current.key}:${targetKey}`,
                source: current.key,
                target: targetKey,
                kind: 'mention',
                label: 'Page link'
              })
          }
      }

      const semantic = await db
        .select()
        .from(knowledgeLinks)
        .where(eq(knowledgeLinks.owner_id, workspace.owner_id))

      for (const link of semantic) {
        const source = aliases.get(link.source_key) ?? link.source_key,
          target = aliases.get(link.target_key) ?? link.target_key

        if (catalog.has(source) && catalog.has(target))
          edges.push({
            id: link.id,
            source,
            target,
            kind: 'related',
            label: link.label
          })
      }

      const embedded = new Map<string, Set<string>>()

      for (const current of nodes) {
        const document = canonical.get(
          current.kind === 'document' ? `page:${current.id}` : current.key
        )
        const references = document
          ? canonicalDatabaseReferences(document.snapshot)
          : (
              pages.find(page => page.id === current.id)?.body.blocks ?? []
            ).flatMap(block =>
              block.type === 'database' && block.database
                ? [block.database]
                : []
            )

        for (const reference of references) {
          if (
            reference.workspaceId !== workspace.id ||
            !ids.includes(reference.baseId)
          )
            continue

          const parents = embedded.get(reference.baseId) ?? new Set<string>()
          parents.add(current.key)
          embedded.set(reference.baseId, parents)
        }
      }

      const result = {
        databases: databases.map(base => ({
          id: base.id,
          title: base.name,
          href: `/databases?workspace=${workspace.id}&base=${base.id}`,
          recordIds: items
            .filter(item => item.base_id === base.id)
            .map(item => item.id),
          embeddedIn: [...(embedded.get(base.id) ?? [])]
        })),
        nodes: nodes.map(({ content, ...node }) => ({
          ...node,
          excerpt: contentText(content).slice(0, 180)
        })),
        edges: [...new Map(edges.map(edge => [edge.id, edge])).values()],
        unresolved
      } satisfies KnowledgeSnapshot

      return response.ok(result)
    })
  })
