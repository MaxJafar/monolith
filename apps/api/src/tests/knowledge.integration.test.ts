import { and, defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BLOCK_PREFIX,
  type KnowledgeSnapshot,
  extractReferences,
  pageKey,
  serializeDocument
} from '@monolith/blocks'
import type { EndpointContract } from '@monolith/server-utils'

import * as docs from '../../../../modules/monolith--databases/server/documentRoutes'
import * as knowledge from '../../../../modules/monolith--databases/server/knowledgeRoutes'
import * as databases from '../../../../modules/monolith--databases/server/routes'
import {
  bases,
  documents,
  knowledgeLinks,
  links,
  records,
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as noteRoutes from '../../../../modules/monolith--notes/server/routes/entries'
import {
  entries,
  subjects,
  workspaces
} from '../../../../modules/monolith--notes/server/schema.drizzle'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''

if (enabled) {
  const target = new URL(connection)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Knowledge tests require an isolated local Monolith database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 5, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner = randomUUID(),
  otherOwner = randomUUID()
beforeAll(async () => {
  if (enabled)
    for (const id of [owner, otherOwner])
      await client`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic knowledge owner')`
})

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
type Doc = {
  id: string
  title: string
  content: string
  parent_id: string | null
  revision: number
  updated: string
}
type RecordPage = {
  id: string
  base_id: string
  title: string
  content: string
  values: Record<string, unknown>
  updated: string
}
type Field = { id: string; config: { reciprocal_field_id: string } }

async function owned<T>(
  user: string | undefined,
  action: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(
      sql`select set_config('zillion.user_id', ${user ?? ''}, true)`
    )

    return action(tx)
  })
}

async function invoke<T>(
  route: EndpointContract,
  user: string | undefined,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body),
    parsedQuery = endpoint.schema.query?.parse(query)
  const result = await owned(user, tx =>
    endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: { locals: { userId: user } }
    } as unknown as Context)
  )

  return (
    result.payload == null
      ? undefined
      : JSON.parse(JSON.stringify(result.payload))
  ) as T
}

const create = (
  title: string,
  content = '',
  parent_id: string | null = null,
  user = owner
) => invoke<Doc>(docs.create, user, { title, content, parent_id })
const graph = (user = owner) =>
  invoke<KnowledgeSnapshot>(knowledge.snapshot, user)
const blocks = (text: string) =>
  serializeDocument({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  })
const save = (doc: Doc, input: Partial<Doc> = {}, user = owner) =>
  invoke<Doc>(
    docs.update,
    user,
    {
      title: doc.title,
      content: doc.content,
      parent_id: doc.parent_id,
      ...input,
      expected_revision: doc.revision
    },
    { id: doc.id }
  )

afterAll(async () => {
  if (enabled)
    for (const user of [owner, otherOwner])
      await owned(user, async tx => {
        await tx.delete(documents).where(eq(documents.owner_id, user))
        await tx.delete(bases).where(eq(bases.owner_id, user))
        await tx.delete(workspaces).where(eq(workspaces.owner_id, user))
        await tx.execute(
          sql`delete from monolith_native_changes where owner_id=${user}`
        )
        await tx.execute(sql`delete from users where id=${user}`)
      })
  await client.end()
})

describe.skipIf(!enabled)('documents and second-brain relationships', () => {
  it('saves stable references in notes and rejects competing note revisions', async () => {
    const target = await create('Note link destination')
    const subjectId = await owned(owner, async tx => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          owner_id: owner,
          name: 'Note revision test',
          icon: 'tabler:note'
        })
        .returning()
      const [subject] = await tx
        .insert(subjects)
        .values({
          owner_id: owner,
          workspace_id: workspace!.id,
          title: 'Note revisions',
          description: '',
          icon: ''
        })
        .returning()

      return subject!.id
    })
    const input = {
      name: 'Revision note',
      type: 'note',
      content: blocks('[[Note link destination]]'),
      subject_id: subjectId,
      parent_id: null
    }
    const note = await invoke<{ id: string; updated: string; content: string }>(
      noteRoutes.create,
      owner,
      input
    )
    expect(extractReferences(note.content)[0]).toMatchObject({
      kind: 'document',
      id: target.id
    })
    const outcomes = await Promise.allSettled(
      ['First edit', 'Competing edit'].map(name =>
        invoke(
          noteRoutes.update,
          owner,
          { ...input, name, expected_updated: note.updated },
          { id: note.id }
        )
      )
    )
    expect(
      outcomes.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    const rejected = outcomes.find(
      result => result.status === 'rejected'
    ) as PromiseRejectedResult
    expect(String(rejected.reason)).toContain('changed elsewhere')
    const rows = await invoke<
      Array<{ id: string; name: string; content: string; updated: string }>
    >(noteRoutes.list, owner)
    const persisted = rows.find(row => row.id === note.id)!
    expect(['First edit', 'Competing edit']).toContain(persisted.name)
    expect(persisted.updated).not.toBe(note.updated)
    expect(extractReferences(persisted.content)[0]?.id).toBe(target.id)
  })
  it('saves blocks and stable wiki links, deriving backlinks after target renames', async () => {
    const target = await create('Unique launch plan')
    const source = await create(
      'Source document',
      blocks('See [[Unique launch plan]] and [[Missing]]')
    )
    expect(source.content.startsWith(BLOCK_PREFIX)).toBe(true)
    expect(extractReferences(source.content)[0]).toMatchObject({
      kind: 'document',
      id: target.id
    })
    let snapshot = await graph()
    expect(
      snapshot.edges.filter(
        edge =>
          edge.source === `document:${source.id}` &&
          edge.target === `document:${target.id}` &&
          edge.kind === 'mention'
      )
    ).toHaveLength(1)
    await save(target, { title: 'Renamed launch plan' })
    snapshot = await graph()
    expect(snapshot.nodes.find(node => node.id === target.id)?.title).toBe(
      'Renamed launch plan'
    )
    expect(
      snapshot.edges.some(
        edge =>
          edge.target === `document:${target.id}` &&
          edge.source === `document:${source.id}`
      )
    ).toBe(true)
    expect(snapshot.unresolved).toBeGreaterThan(0)
  })
  it('never resolves ambiguous titles or foreign owners into a graph', async () => {
    const a = await create('Duplicate title'),
      b = await create('Duplicate title')
    const privateDoc = await create('Foreign secret', '', null, otherOwner)
    const source = await create(
      'Ambiguous references',
      blocks('[[Duplicate title]] [[Foreign secret]]')
    )
    const snapshot = await graph()
    expect(snapshot.nodes.some(node => node.id === privateDoc.id)).toBe(false)
    expect(
      snapshot.edges.some(
        edge =>
          edge.source === `document:${source.id}` &&
          [a.id, b.id, privateDoc.id].some(id => edge.target.endsWith(id))
      )
    ).toBe(false)
    await expect(save(privateDoc, { title: 'Stolen' })).rejects.toThrow(
      'not found'
    )
    await expect(invoke(docs.list, undefined)).rejects.toThrow(
      'Authentication required'
    )
    const invisible = await owned(otherOwner, tx =>
      tx.select().from(documents).where(eq(documents.id, source.id))
    )
    expect(invisible).toEqual([])
  })
  it('validates document structure and denies new foreign page IDs without losing existing data', async () => {
    const original = await create('Keep me', 'Preserved plain text')
    const foreign = await create('Private target', '', null, otherOwner)
    const bad = serializeDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'pageLink',
              attrs: {
                kind: 'document',
                targetId: foreign.id,
                label: 'Private target'
              }
            }
          ]
        }
      ]
    })
    await expect(save(original, { content: bad })).rejects.toThrow(
      'unavailable'
    )
    await expect(
      save(original, {
        content:
          BLOCK_PREFIX +
          JSON.stringify({ type: 'doc', content: [{ type: 'iframe' }] })
      })
    ).rejects.toThrow('Invalid')
    const stored = await invoke<Doc[]>(docs.list, owner)
    expect(stored.find(doc => doc.id === original.id)).toEqual(original)
  })
  it('serializes competing saves and rejects stale deletion', async () => {
    const doc = await create('Concurrent document')
    const results = await Promise.allSettled([
      save(doc, { content: blocks('First editor') }),
      save(doc, { content: blocks('Second editor') })
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(
      1
    )
    await expect(
      invoke(
        docs.remove,
        owner,
        { expected_revision: doc.revision },
        { id: doc.id }
      )
    ).rejects.toThrow('changed elsewhere')
    const current = (await invoke<Doc[]>(docs.list, owner)).find(
      row => row.id === doc.id
    )!
    expect(current.revision).toBe(doc.revision + 1)
  })
  it('rejects hierarchy cycles and keeps children when deleting a parent', async () => {
    const parent = await create('Parent'),
      child = await create('Child', '', parent.id)
    await expect(save(parent, { parent_id: child.id })).rejects.toThrow(
      'contain itself'
    )
    await expect(create('Bad parent', '', randomUUID())).rejects.toThrow(
      'not found'
    )
    await invoke(
      docs.remove,
      owner,
      { expected_revision: parent.revision },
      { id: parent.id }
    )
    const kept = (await invoke<Doc[]>(docs.list, owner)).find(
      doc => doc.id === child.id
    )!
    expect(kept.parent_id).toBeNull()
    expect(kept.revision).toBe(child.revision + 1)
    await expect(save(child)).rejects.toThrow('changed elsewhere')
  })
  it('prevents simultaneous opposite hierarchy updates from introducing a cycle', async () => {
    const a = await create('Tree A'),
      b = await create('Tree B')
    const results = await Promise.allSettled([
      save(a, { parent_id: b.id }),
      save(b, { parent_id: a.id })
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(
      1
    )
  })
  it('connects notes, records and documents symmetrically and cascades manual edges', async () => {
    const doc = await create('Cross-module document')
    const base = await invoke<{ id: string }>(databases.createBase, owner, {
      name: 'Knowledge test base'
    })
    const record = await invoke<RecordPage>(databases.createRecord, owner, {
      base_id: base.id,
      title: 'Cross-module record'
    })
    const note = await owned(owner, async tx => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ owner_id: owner, name: 'Graph notes', icon: 'tabler:note' })
        .returning()
      const [subject] = await tx
        .insert(subjects)
        .values({
          owner_id: owner,
          workspace_id: workspace!.id,
          title: 'Test subject',
          description: '',
          icon: ''
        })
        .returning()
      const [entry] = await tx
        .insert(entries)
        .values({
          owner_id: owner,
          subject_id: subject!.id,
          name: 'Graph note',
          type: 'note',
          content: blocks('[[Cross-module document]]')
        })
        .returning()

      return entry!
    })
    const source = { kind: 'document' as const, id: doc.id },
      target = { kind: 'record' as const, id: record.id }
    await Promise.all([
      invoke(knowledge.relate, owner, { source, target, label: 'Supports' }),
      invoke(knowledge.relate, owner, {
        source: target,
        target: source,
        label: 'Supports'
      })
    ])
    let snapshot = await graph()
    expect(
      snapshot.edges.filter(
        edge =>
          edge.kind === 'related' &&
          [edge.source, edge.target].includes(pageKey(source)) &&
          [edge.source, edge.target].includes(pageKey(target))
      )
    ).toHaveLength(1)
    expect(
      snapshot.edges.some(
        edge =>
          edge.kind === 'mention' &&
          edge.source === `note:${note.id}` &&
          edge.target === pageKey(source)
      )
    ).toBe(true)
    await invoke(
      docs.remove,
      owner,
      { expected_revision: doc.revision },
      { id: doc.id }
    )
    snapshot = await graph()
    expect(
      snapshot.edges.some(
        edge =>
          edge.source === pageKey(source) || edge.target === pageKey(source)
      )
    ).toBe(false)
    expect(
      await owned(owner, tx =>
        tx
          .select()
          .from(knowledgeLinks)
          .where(eq(knowledgeLinks.source_document_id, doc.id))
      )
    ).toEqual([])
  })
  it('retains deleted inline reference text as unavailable and permits editing the surviving page', async () => {
    const target = await create('Soon removed'),
      source = await create('Surviving page', blocks('[[Soon removed]]'))
    await invoke(
      docs.remove,
      owner,
      { expected_revision: target.revision },
      { id: target.id }
    )
    const saved = await save(source, { title: 'Edited survivor' })
    expect(saved.content).toBe(source.content)
    expect(
      (await graph()).edges.some(
        edge => edge.target === `document:${target.id}`
      )
    ).toBe(false)
  })
  it('rejects foreign semantic targets and self-links', async () => {
    const mine = await create('Owned idea'),
      foreign = await create('Private idea', '', null, otherOwner)
    await expect(
      invoke(knowledge.relate, owner, {
        source: { kind: 'document', id: mine.id },
        target: { kind: 'document', id: foreign.id }
      })
    ).rejects.toThrow('not found')
    await expect(
      invoke(knowledge.relate, owner, {
        source: { kind: 'document', id: mine.id },
        target: { kind: 'document', id: mine.id }
      })
    ).rejects.toThrow('itself')
  })
  it('protects reciprocal relations against stale editors and shows each pair once in the graph', async () => {
    const base = await invoke<{ id: string }>(databases.createBase, owner, {
      name: 'Relation conflict test'
    })
    const field = await invoke<Field>(databases.createField, owner, {
      base_id: base.id,
      target_base_id: base.id,
      name: 'Related',
      kind: 'relation'
    })
    const rows: RecordPage[] = []

    for (const title of ['A', 'B', 'C'])
      rows.push(
        await invoke<RecordPage>(databases.createRecord, owner, {
          base_id: base.id,
          title
        })
      )

    const [a, b, c] = rows as [RecordPage, RecordPage, RecordPage]
    await invoke(databases.setLinks, owner, {
      field_id: field.id,
      record_id: a.id,
      target_ids: [b.id],
      expected_ids: []
    })
    await invoke(databases.setLinks, owner, {
      field_id: field.config.reciprocal_field_id,
      record_id: c.id,
      target_ids: [a.id],
      expected_ids: []
    })
    await expect(
      invoke(databases.setLinks, owner, {
        field_id: field.id,
        record_id: a.id,
        target_ids: [],
        expected_ids: [b.id]
      })
    ).rejects.toThrow('changed elsewhere')
    const persisted = await owned(owner, tx =>
      tx
        .select()
        .from(links)
        .where(
          and(eq(links.field_id, field.id), eq(links.source_record_id, a.id))
        )
    )
    expect(persisted.map(edge => edge.target_record_id).sort()).toEqual(
      [b.id, c.id].sort()
    )
    expect(
      (await graph()).edges.filter(
        edge =>
          edge.kind === 'relation' &&
          [edge.source, edge.target].includes(`record:${a.id}`)
      )
    ).toHaveLength(2)
  })
  it('rejects stale record content saves without changing properties or blocks', async () => {
    const base = await invoke<{ id: string }>(databases.createBase, owner, {
      name: 'Record conflict test'
    })
    const record = await invoke<RecordPage>(databases.createRecord, owner, {
      base_id: base.id,
      title: 'Record'
    })
    const body = {
      title: record.title,
      content: blocks('Latest'),
      values: {},
      expected_updated: record.updated
    }
    const updated = await invoke<RecordPage>(
      databases.updateRecord,
      owner,
      body,
      { id: record.id }
    )
    await expect(
      invoke(
        databases.updateRecord,
        owner,
        { ...body, content: blocks('Stale') },
        { id: record.id }
      )
    ).rejects.toThrow('changed elsewhere')
    const [stored] = await owned(owner, tx =>
      tx.select().from(records).where(eq(records.id, record.id))
    )
    expect(stored!.content).toBe(updated.content)
  })
})
