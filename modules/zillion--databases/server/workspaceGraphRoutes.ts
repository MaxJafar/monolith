import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

import {
  type GraphEdge,
  type GraphNode,
  type KnowledgeSnapshot,
  contentText,
  extractReferences,
  pageKey,
  resolveReference
} from '@lifeforge/blocks'
import { ClientError } from '@lifeforge/server-utils'

import forge from './forge'
import { drainNativeChanges } from './itemBridge'
import { ownerId } from './model'
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
  kind: z.enum(['document', 'record', 'note']),
  title: z.string(),
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
  kind: z.enum(['document', 'record', 'note']),
  id: z.string().uuid()
})
async function assertTarget(
  db: Store,
  workspace: string,
  value: z.infer<typeof target>
) {
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

export const relate = forge
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
      await assertTarget(db, workspace.id, body.source)
      await assertTarget(db, workspace.id, body.target)
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

export const unrelate = forge
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
        await assertTarget(db, workspace.id, target.parse({ kind, id }))
      }
      await db.delete(knowledgeLinks).where(eq(knowledgeLinks.id, query.id))
      return response.noContent()
    })
  })

export const snapshot = forge
  .query({
    description:
      'Workspace page links, projects and database relations without duplicate module items',
    input: { query: z.object({ workspace_id: z.string().uuid() }) },
    output: {
      OK: z.object({
        nodes: z.array(node),
        edges: z.array(edge),
        unresolved: z.number().int()
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
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
        ...items.map(item => ({
          id: item.id,
          key: `record:${item.id}`,
          kind: 'record' as const,
          title: item.title,
          context: databases.find(base => base.id === item.base_id)?.name ?? '',
          content: item.content
        })),
        ...pages
          .filter(page => page.route_key.startsWith('/page/'))
          .map(page => ({
            id: page.id,
            key: `document:${page.id}`,
            kind: 'document' as const,
            title: page.title,
            context: workspace.name,
            parent: page.parent_id ? `document:${page.parent_id}` : null,
            content: page.body.blocks
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
        const contents = page
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
      const result: KnowledgeSnapshot = {
        nodes: nodes.map(({ content, ...node }) => ({
          ...node,
          excerpt: contentText(content).slice(0, 180)
        })),
        edges: [...new Map(edges.map(edge => [edge.id, edge])).values()],
        unresolved
      }
      return response.ok(result)
    })
  })
