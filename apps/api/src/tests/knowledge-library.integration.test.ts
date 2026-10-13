import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type CanvasPage,
  serializeDocument,
  validateCanvasPage
} from '@lifeforge/blocks'
import type { ForgeContract } from '@lifeforge/server-utils'

import type {
  KnowledgeLibrary,
  KnowledgeSearch
} from '../../../../modules/zillion--databases/knowledgeLibraryShared'
import * as routes from '../../../../modules/zillion--databases/server/knowledgeLibraryRoutes'
import {
  relations,
  tables
} from '../../../../modules/zillion--databases/server/schema.drizzle'

const enabled = process.env.MONOLITH_KNOWLEDGE_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''
const adminConnection = process.env.DATABASE_ADMIN_URL ?? ''

if (enabled)
  for (const uri of [connection, adminConnection]) {
    const target = new URL(uri)

    if (
      process.env.NODE_ENV === 'production' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.port !== '55432' ||
      target.pathname !== '/zillion_dev'
    )
      throw Error(
        'Knowledge library fixtures require the isolated loopback database'
      )
  }

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/disabled',
  { max: 2 }
)
const admin = postgres(
  enabled ? adminConnection : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const accounts = Array.from({ length: 4 }, () => randomUUID())
const [owner, editor, viewer, outsider] = accounts as [
  string,
  string,
  string,
  string
]
const workspace = randomUUID(),
  sibling = randomUUID(),
  pageId = randomUUID(),
  siblingPage = randomUUID(),
  baseId = randomUUID(),
  recordId = randomUUID(),
  siblingBase = randomUUID(),
  siblingRecord = randomUUID()

let collectionId: string, importedId: string, linkedId: string
type Context = Parameters<ReturnType<ForgeContract['getValue']>['callback']>[0]

async function invoke<T>(
  route: ForgeContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = { workspace_id: workspace }
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

const page = (text: string): CanvasPage => ({
  version: 1,
  title: 'Live runbook',
  icon: 'lucide:file-text',
  fullWidth: false,
  revision: 1,
  updated: null,
  blocks: [
    {
      id: randomUUID(),
      type: 'document',
      width: 'full',
      title: '',
      content: serializeDocument({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
      }),
      url: '',
      widget: ''
    }
  ]
})
beforeAll(async () => {
  if (!enabled) return
  for (const id of accounts)
    await admin`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic knowledge member')`
  for (const id of [workspace, sibling])
    await admin`insert into zillion_databases__workspaces(id,owner_id,name) values(${id},${owner},'Synthetic knowledge workspace')`
  for (const [user, role] of [
    [editor, 'editor'],
    [viewer, 'viewer']
  ])
    await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${user!},${role!})`
  for (const [id, scope, text] of [
    [pageId, workspace, 'Minecraft restarts after a backup.'],
    [siblingPage, sibling, 'Classified sibling document.']
  ])
    await admin`insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body) values(${id!},${owner},${scope!},${'/page/' + id},'Live runbook',${admin.json(page(text!))})`
  for (const [id, scope] of [
    [baseId, workspace],
    [siblingBase, sibling]
  ])
    await admin`insert into zillion_databases__bases(id,owner_id,workspace_id,name) values(${id!},${owner},${scope!},'Synthetic knowledge database')`
  for (const [id, base, text] of [
    [recordId, baseId, 'Minecraft backups are kept seven days.'],
    [siblingRecord, siblingBase, 'Classified sibling record.']
  ])
    await admin`insert into zillion_databases__records(id,owner_id,base_id,title,content,values) values(${id!},${owner},${base!},'Backup retention',${text!},'{}'::jsonb)`
})
afterAll(async () => {
  if (enabled) {
    await admin`delete from zillion_databases__workspaces where id in (${workspace},${sibling}) and owner_id=${owner}`

    for (const id of accounts) {
      await admin`delete from monolith_native_changes where owner_id=${id}`
      await admin`delete from users where id=${id}`
    }
  }
  await Promise.all([client.end(), admin.end()])
})

describe.skipIf(!enabled)(
  'Knowledge library storage, citations and workspace access',
  () => {
    it('lets an editor create a collection and import Markdown under the workspace owner', async () => {
      collectionId = (
        await invoke<{ id: string }>(routes.createCollection, editor, {
          name: 'Homelab knowledge',
          description: 'Synthetic runbooks'
        })
      ).id
      importedId = (
        await invoke<{ id: string }>(routes.addSource, editor, {
          collection_id: collectionId,
          kind: 'text',
          title: 'Recovery guide.md',
          media_type: 'text/markdown',
          content:
            '# Recovery\n\nMinecraft recovery requires the backup archive.'
        })
      ).id
      const [stored] =
        await admin`select owner_id,media_type from zillion_databases__knowledge_sources where id=${importedId}`
      expect(stored).toMatchObject({
        owner_id: owner,
        media_type: 'text/markdown'
      })
    })
    it('links canonical pages and records without copying document bodies and rejects duplicates', async () => {
      linkedId = (
        await invoke<{ id: string }>(routes.addSource, editor, {
          collection_id: collectionId,
          kind: 'page',
          source_id: pageId
        })
      ).id
      await invoke(routes.addSource, editor, {
        collection_id: collectionId,
        kind: 'record',
        source_id: recordId
      })
      const [stored] =
        await admin`select imported_content,page_id from zillion_databases__knowledge_sources where id=${linkedId}`
      expect(stored).toMatchObject({ imported_content: null, page_id: pageId })
      await expect(
        invoke(routes.addSource, editor, {
          collection_id: collectionId,
          kind: 'page',
          source_id: pageId
        })
      ).rejects.toThrow('already in this collection')
    })
    it('lets viewers retrieve exact cited evidence and read linked source metadata', async () => {
      const result = await invoke<KnowledgeSearch>(routes.search, viewer, {
        query: 'Minecraft backup'
      })
      expect(result.engine).toBe('lexical')
      expect(result.searched_sources).toBe(3)
      expect(
        result.citations.some(
          citation =>
            citation.source_id === importedId &&
            citation.text.includes('# Recovery')
        )
      ).toBe(true)
      expect(
        result.citations.some(
          citation =>
            citation.source_id === linkedId &&
            citation.href === `/page/${pageId}?workspace=${workspace}`
        )
      ).toBe(true)
      const state = await invoke<KnowledgeLibrary>(routes.snapshot, viewer)
      expect(state.role).toBe('viewer')
      expect(state.collections[0]?.source_count).toBe(3)
      expect(
        state.catalog.some(
          item => item.id === siblingPage || item.id === siblingRecord
        )
      ).toBe(false)
    })
    it('reflects canonical edits on the next query without manual reindexing', async () => {
      await admin`update zillion_databases__workspace_pages set body=${admin.json(page('Minecraft now requires a verified snapshot before reboot.'))},title='Updated live runbook',updated=now() where id=${pageId}`
      const result = await invoke<KnowledgeSearch>(routes.search, viewer, {
        query: 'verified snapshot'
      })
      expect(result.citations[0]).toMatchObject({
        source_id: linkedId,
        title: 'Updated live runbook',
        text: 'Minecraft now requires a verified snapshot before reboot.'
      })
      expect(result.answer).not.toContain('restarts after a backup')
    })
    it('distinguishes omitted scopes from empty scopes and rejects other workspace collections', async () => {
      expect(
        (
          await invoke<KnowledgeSearch>(routes.search, viewer, {
            query: 'Minecraft',
            collection_ids: []
          })
        ).searched_sources
      ).toBe(0)
      expect(
        (await invoke<KnowledgeSearch>(routes.search, viewer, { query: '???' }))
          .citations
      ).toEqual([])
      const foreign = (
        await invoke<{ id: string }>(
          routes.createCollection,
          owner,
          { name: 'Sibling collection' },
          { workspace_id: sibling }
        )
      ).id
      await expect(
        invoke(routes.search, viewer, {
          query: 'Minecraft',
          collection_ids: [foreign]
        })
      ).rejects.toThrow('collection not found')
    })
    it('blocks outsider reads, viewer writes and same-owner cross-workspace sources', async () => {
      await expect(invoke(routes.snapshot, outsider)).rejects.toThrow(
        'Workspace not found'
      )
      await expect(
        invoke(routes.createCollection, viewer, { name: 'Forbidden' })
      ).rejects.toThrow('read-only')
      await expect(
        invoke(routes.removeSource, viewer, undefined, {
          workspace_id: workspace,
          id: importedId
        })
      ).rejects.toThrow('read-only')
      await expect(
        invoke(routes.addSource, editor, {
          collection_id: collectionId,
          kind: 'page',
          source_id: siblingPage
        })
      ).rejects.toThrow('Page not found')
      await expect(
        invoke(routes.addSource, editor, {
          collection_id: collectionId,
          kind: 'record',
          source_id: siblingRecord
        })
      ).rejects.toThrow('Record not found')
    })
    it('enforces row-level policies and composite foreign keys outside route validation', async () => {
      const count = await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id',${outsider},true)`
        )
        const rows = await tx.select().from(tables.knowledgeSources)

        return rows.length
      })
      expect(count).toBe(0)
      await expect(
        db.transaction(async tx => {
          await tx.execute(
            sql`select set_config('zillion.user_id',${viewer},true)`
          )
          await tx.insert(tables.knowledgeCollections).values({
            owner_id: owner,
            workspace_id: workspace,
            name: 'Raw denied write'
          })
        })
      ).rejects.toThrow()
      await expect(
        admin`insert into zillion_databases__knowledge_sources(owner_id,workspace_id,collection_id,kind,page_id) values(${owner},${workspace},${collectionId},'page',${siblingPage})`
      ).rejects.toThrow()
      await expect(
        admin`insert into zillion_databases__knowledge_sources(owner_id,workspace_id,collection_id,kind,record_base_id,record_id) values(${owner},${workspace},${collectionId},'record',${siblingBase},${siblingRecord})`
      ).rejects.toThrow()
    })
    it('cascades deleted canonical references and preserves documents when removing collections', async () => {
      await admin`delete from zillion_databases__workspace_pages where id=${pageId}`
      expect(
        (await invoke<KnowledgeLibrary>(routes.snapshot, viewer)).sources.some(
          source => source.id === linkedId
        )
      ).toBe(false)
      await invoke(
        routes.updateCollection,
        editor,
        { name: 'Renamed knowledge', description: '' },
        { workspace_id: workspace, id: collectionId }
      )
      await invoke(routes.removeCollection, editor, undefined, {
        workspace_id: workspace,
        id: collectionId
      })
      expect(
        (await invoke<KnowledgeLibrary>(routes.snapshot, viewer)).sources
      ).toEqual([])
      expect(
        (
          await admin`select id from zillion_databases__records where id=${recordId}`
        ).length
      ).toBe(1)
    })
    it('bounds large canonical retrieval while preserving metadata and removal access', async () => {
      const id = randomUUID()
      const large = page('a'.repeat(900_000))
      large.blocks.push({
        ...large.blocks[0]!,
        id: randomUUID(),
        content: serializeDocument({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'b'.repeat(900_000) }]
            }
          ]
        })
      })
      validateCanvasPage(large)
      await admin`insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body) values(${id},${owner},${workspace},${'/page/' + id},'Large canonical fixture',${admin.json(large)})`
      const selected: string[] = []

      for (let index = 0; index < 5; index++) {
        const collection = (
          await invoke<{ id: string }>(routes.createCollection, editor, {
            name: `Bounded selection ${index}`
          })
        ).id
        selected.push(collection)
        await invoke(routes.addSource, editor, {
          collection_id: collection,
          kind: 'page',
          source_id: id
        })
      }
      await expect(
        invoke(routes.search, viewer, {
          query: 'canonical',
          collection_ids: selected
        })
      ).rejects.toThrow('retrieval size limit')
      await expect(
        invoke(routes.search, viewer, {
          query: 'canonical',
          collection_ids: [selected[0]!]
        })
      ).rejects.toThrow('retrieval size limit')
      const snapshot = await invoke<KnowledgeLibrary>(routes.snapshot, viewer)

      expect(snapshot.sources).toHaveLength(5)
      expect(snapshot.sources[0]).toMatchObject({
        title: 'Large canonical fixture',
        characters: 1_800_002,
        source_id: id
      })
      expect(snapshot.sources[0]!.chunks).toBeGreaterThan(1_800)
      expect(snapshot.sources[0]).not.toHaveProperty('content')
      await invoke(routes.removeSource, editor, undefined, {
        workspace_id: workspace,
        id: snapshot.sources[0]!.id
      })
      expect(
        (await invoke<KnowledgeLibrary>(routes.snapshot, viewer)).sources
      ).toHaveLength(4)
      expect(
        (
          await invoke<KnowledgeSearch>(routes.search, viewer, {
            query: 'canonical',
            collection_ids: []
          })
        ).searched_sources
      ).toBe(0)
    })
  }
)
