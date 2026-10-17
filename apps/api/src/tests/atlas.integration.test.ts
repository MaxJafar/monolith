import type { KnowledgeSnapshot } from '@monolith/blocks'
import type { EndpointContract } from '@monolith/server-utils'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { preview } from '../../../../modules/monolith--atlas/server/preview'
import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as data from '../../../../modules/monolith--databases/server/workspaceDatabaseRoutes'
import * as graph from '../../../../modules/monolith--databases/server/workspaceGraphRoutes'
import * as pages from '../../../../modules/monolith--databases/server/workspaceRoutes'
import { query as ragQuery } from '../lib/search'
import { map as contextMap } from '../lib/search/graph'
import { embeddingVersion } from '../lib/search/inference'
import { collectSources } from '../lib/search/sources'

const enabled = process.env.MONOLITH_WORKSPACE_INTEGRATION === '1'
for (const connection of enabled
  ? [process.env.DATABASE_URL!, process.env.DATABASE_ADMIN_URL!]
  : []) {
  const url = new URL(connection)
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/zillion_dev'
  )
    throw Error('Atlas tests require the isolated local database')
}
const client = postgres(
  enabled ? process.env.DATABASE_URL! : 'postgres://127.0.0.1:55432/disabled',
  { max: 2 }
)
const admin = postgres(
  enabled
    ? process.env.DATABASE_ADMIN_URL!
    : 'postgres://127.0.0.1:55432/disabled',
  { max: 1 }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner = randomUUID(),
  editor = randomUUID(),
  viewer = randomUUID(),
  outsider = randomUUID()
type Context = Parameters<ReturnType<EndpointContract['getValue']>['callback']>[0]
async function invoke<T = unknown>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } }
    } as unknown as Context)
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
let workspace: string,
  other: string,
  page: string,
  target: string,
  record: string
beforeAll(async () => {
  if (!enabled) return
  for (const id of [owner, editor, viewer, outsider])
    await admin`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic Atlas member')`
  workspace = (
    await invoke<{ id: string }>(pages.create, owner, {
      name: 'Atlas test',
      profile: 'collaborative',
      enabled_modules: ['databases', 'atlas']
    })
  ).id
  other = (
    await invoke<{ id: string }>(pages.create, outsider, {
      name: 'Private test',
      profile: 'collaborative',
      enabled_modules: ['databases', 'atlas']
    })
  ).id
  for (const [id, role] of [
    [editor, 'editor'],
    [viewer, 'viewer']
  ])
    await invoke(
      pages.setMember,
      owner,
      { email: id + '@example.invalid', role },
      { workspace_id: workspace }
    )
  page = (
    await invoke<{ id: string }>(
      pages.createPage,
      editor,
      { title: 'Research', parent_id: null },
      { workspace_id: workspace }
    )
  ).id
  target = (
    await invoke<{ id: string }>(
      pages.createPage,
      owner,
      { title: 'Launch', parent_id: null },
      { workspace_id: workspace }
    )
  ).id
  const base = await invoke<{ id: string }>(
    data.createBase,
    owner,
    { name: 'Ideas' },
    { workspace_id: workspace }
  )
  record = (
    await invoke<{ id: string }>(
      data.createRecord,
      owner,
      {
        base_id: base.id,
        title: 'A connected idea',
        content: 'A useful idea',
        tags: ['idea']
      },
      { workspace_id: workspace }
    )
  ).id
})
afterAll(async () => {
  if (enabled)
    for (const id of [owner, editor, viewer, outsider])
      await admin`delete from users where id=${id}`
  await Promise.all([client.end(), admin.end()])
})
describe.skipIf(!enabled)('Atlas canonical knowledge and permissions', () => {
  it('reads real pages and tagged database items for a viewer', async () => {
    const state = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      viewer,
      undefined,
      { workspace_id: workspace }
    )
    expect(state.nodes.find(node => node.id === record)).toMatchObject({
      title: 'A connected idea',
      tags: ['idea']
    })
    expect(state.nodes.find(node => node.id === page)?.kind).toBe('document')
    const result = await invoke<{ text: string; href: string }>(
      preview,
      viewer,
      undefined,
      { workspace_id: workspace, kind: 'record', id: record }
    )
    expect(result.text).toBe('A useful idea')
    expect(result.href).toContain(`record=${record}`)
    expect(result.href).toContain(`workspace=${workspace}`)
  })
  it('denies outsiders and cross-workspace preview identifiers', async () => {
    await expect(
      invoke(graph.snapshot, outsider, undefined, { workspace_id: workspace })
    ).rejects.toThrow()
    await expect(
      invoke(preview, outsider, undefined, {
        workspace_id: workspace,
        kind: 'document',
        id: page
      })
    ).rejects.toThrow()
    await expect(
      invoke(preview, outsider, undefined, {
        workspace_id: other,
        kind: 'record',
        id: record
      })
    ).rejects.toThrow()
    await expect(
      invoke(preview, outsider, undefined, {
        workspace_id: other,
        kind: 'document',
        id: page
      })
    ).rejects.toThrow()
  })
  it('allows an editor to relate pages, without duplicating the reverse connection', async () => {
    const body = {
      source: { kind: 'document', id: page },
      target: { kind: 'record', id: record },
      label: 'Inspires'
    }
    await invoke(graph.relate, editor, body, { workspace_id: workspace })
    await invoke(
      graph.relate,
      editor,
      { ...body, source: body.target, target: body.source },
      { workspace_id: workspace }
    )
    const state = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      viewer,
      undefined,
      { workspace_id: workspace }
    )
    expect(state.edges.filter(edge => edge.kind === 'related')).toHaveLength(1)
    expect(state.edges.find(edge => edge.kind === 'related')?.label).toBe(
      'Inspires'
    )
  })
  it('prevents viewer writes and linking across workspace boundaries', async () => {
    const body = {
      source: { kind: 'document', id: page },
      target: { kind: 'document', id: target },
      label: 'Related'
    }
    await expect(
      invoke(graph.relate, viewer, body, { workspace_id: workspace })
    ).rejects.toThrow()
    await expect(
      invoke(
        pages.createPage,
        viewer,
        { title: 'No write', parent_id: null },
        { workspace_id: workspace }
      )
    ).rejects.toThrow()
    await expect(
      invoke(graph.relate, outsider, body, { workspace_id: other })
    ).rejects.toThrow()
  })
  it('uses the canonical block body for previews and backlinks, including for a shared viewer', async () => {
    const before = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      viewer,
      undefined,
      { workspace_id: workspace }
    )
    const database = before.databases!.find(base => base.title === 'Ideas')!
    const snapshot = {
      type: 'page',
      meta: { id: page, title: 'Research — current title' },
      blocks: {
        id: 'root',
        flavour: 'affine:page',
        props: {},
        children: [
          {
            id: 'db',
            flavour: 'monolith:linked-database',
            props: { workspaceId: workspace, baseId: database.id },
            children: []
          },
          {
            id: 'foreign-db',
            flavour: 'monolith:linked-database',
            props: { workspaceId: other, baseId: database.id },
            children: []
          },
          {
            id: 'p',
            flavour: 'affine:paragraph',
            props: {
              text: {
                '$blocksuite:internal:text$': true,
                delta: [
                  { insert: 'Current editor body ' },
                  { insert: 'Launch', attributes: { link: `/page/${target}` } }
                ]
              }
            },
            children: []
          }
        ]
      }
    }
    await admin`insert into monolith_editor_documents(workspace_id,owner_id,source_kind,source_id,snapshot,original,original_sha256) values(${workspace},${owner},'page',${page},${admin.json(snapshot)},'{}','fixture')`
    const result = await invoke<{ text: string; title: string }>(
      preview,
      viewer,
      undefined,
      {
        workspace_id: workspace,
        kind: 'document',
        id: page
      }
    )
    expect(result.text).toBe('Current editor body Launch')
    expect(result.title).toBe('Research — current title')
    const state = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      viewer,
      undefined,
      { workspace_id: workspace }
    )
    expect(
      state.databases?.find(base => base.id === database.id)
    ).toMatchObject({
      recordIds: [record],
      embeddedIn: [`document:${page}`]
    })
    expect(state.nodes.find(node => node.id === page)?.title).toBe(result.title)
    expect(
      state.edges.some(
        edge =>
          edge.kind === 'mention' &&
          edge.source === `document:${page}` &&
          edge.target === `document:${target}`
      )
    ).toBe(true)
  })
  it('bounds long previews without executing embedded HTML', async () => {
    await admin`update zillion_databases__records set content=${'<script>unsafe()</script> ' + 'x'.repeat(21000)} where id=${record}`
    const result = await invoke<{ text: string; truncated: boolean }>(
      preview,
      viewer,
      undefined,
      { workspace_id: workspace, kind: 'record', id: record }
    )
    expect(result.text).toHaveLength(20000)
    expect(result.truncated).toBe(true)
  })
  it('removes only a semantic connection and retains both source pages', async () => {
    const before = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      editor,
      undefined,
      { workspace_id: workspace }
    )
    const edge = before.edges.find(edge => edge.kind === 'related')!
    await expect(
      invoke(graph.unrelate, viewer, undefined, {
        workspace_id: workspace,
        id: edge.id
      })
    ).rejects.toThrow()
    await invoke(graph.unrelate, editor, undefined, {
      workspace_id: workspace,
      id: edge.id
    })
    const after = await invoke<KnowledgeSnapshot>(
      graph.snapshot,
      viewer,
      undefined,
      { workspace_id: workspace }
    )
    expect(after.edges.some(value => value.id === edge.id)).toBe(false)
    expect(after.nodes.map(node => node.key)).toEqual(
      before.nodes.map(node => node.key)
    )
    expect(after.edges.some(value => value.kind === 'mention')).toBe(true)
  })
  it('shares canonical tags with RAG retrieval and denies cross-workspace context discovery', async () => {
    await admin`update zillion_databases__records set content='Photovoltaic research for solar energy resilience.', tags=${admin.json(['solar-atlas-evidence'])} where id=${record}`
    const result = await invoke<
      KnowledgeSnapshot<
        'document' | 'record' | 'note' | 'tag' | 'topic' | 'source'
      >
    >(contextMap, viewer, undefined, { workspace_id: workspace })
    expect(
      result.nodes.find(node => node.key === `record:${record}`)?.tags
    ).toContain('solar-atlas-evidence')
    expect(
      result.nodes.some(
        node => node.kind === 'tag' && node.title === 'solar-atlas-evidence'
      )
    ).toBe(true)
    await expect(
      invoke(contextMap, outsider, undefined, { workspace_id: workspace })
    ).rejects.toThrow()
    const privateGraph = await invoke<KnowledgeSnapshot>(
      contextMap,
      outsider,
      undefined,
      { workspace_id: other }
    )
    expect(
      privateGraph.nodes.some(node => node.id === record || node.id === page)
    ).toBe(false)
    const evidence = await invoke<{
      hits: { source_id: string; graph_key: string; text: string }[]
    }>(ragQuery, viewer, {
      workspace_id: workspace,
      query: 'solar-atlas-evidence',
      mode: 'keyword',
      answer: false
    })
    expect(
      evidence.hits.some(
        hit =>
          hit.source_id === `record:${record}` &&
          hit.graph_key === `record:${record}` &&
          hit.text.includes('solar-atlas-evidence')
      )
    ).toBe(true)
  })
  it('ignores stale embeddings after source edits and never reads another member’s index', async () => {
    const source = await db.transaction(async tx => {
      await tx.execute(sql`select set_config('zillion.user_id',${viewer},true)`)
      return (
        await collectSources(tx, viewer, { workspace_id: workspace })
      ).find(source => source.id === `record:${record}`)!
    })
    const model = embeddingVersion()
    await admin`insert into search__documents(owner_id,source_id,fingerprint,model,content,inferred,warning,chunk_count) values(${viewer},${source.id},${source.fingerprint},${model},${source.text},false,'',1)`
    await admin`insert into search__chunks(owner_id,source_id,ordinal,fingerprint,model,vector) values(${viewer},${source.id},0,${source.fingerprint},${model},${admin.json(Array(768).fill(0.5))})`
    type Coverage = { coverage: { embedded: number } }
    expect(
      (
        await invoke<Coverage>(contextMap, viewer, undefined, {
          workspace_id: workspace
        })
      ).coverage.embedded
    ).toBe(1)
    expect(
      (
        await invoke<Coverage>(contextMap, editor, undefined, {
          workspace_id: workspace
        })
      ).coverage.embedded
    ).toBe(0)
    await admin`update zillion_databases__records set content='Updated photovoltaic research with a different conclusion.' where id=${record}`
    expect(
      (
        await invoke<Coverage>(contextMap, viewer, undefined, {
          workspace_id: workspace
        })
      ).coverage.embedded
    ).toBe(0)
  })
})
