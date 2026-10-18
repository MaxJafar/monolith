import { and, defineRelations, eq, inArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import * as routes from '../../../../modules/monolith--databases/server/routes'
import {
  bases,
  links,
  records,
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import {
  type Base,
  type Field,
  type RecordPage,
  type SavedView,
  type Snapshot,
  applyView
} from '../../../../modules/monolith--databases/shared'

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]

const owner = randomUUID(),
  otherOwner = randomUUID()
const connection = process.env.DATABASE_URL || ''
const enabled = process.env.ZILLION_INTEGRATION === '1'

if (enabled) {
  if (!connection)
    throw new Error('An explicit isolated database URL is required')

  const target = new URL(connection)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Integration tests only use isolated local Monolith databases on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 5, prepare: false }
)
const schema = defineRelations(tables, relations)
const db = drizzle({ client, relations: schema })

async function invoke<T>(
  route: EndpointContract,
  user: string | undefined,
  body?: unknown,
  query: Record<string, string> = {},
  database = db
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body)
  const parsedQuery = endpoint.schema.query?.parse(query)
  const result = await database.transaction(async tx => {
    await tx.execute(
      sql`select set_config('zillion.user_id', ${user ?? ''}, true)`
    )

    return endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: { locals: { userId: user } }
    } as unknown as Context)
  })

  return (
    result.payload == null
      ? undefined
      : JSON.parse(JSON.stringify(result.payload))
  ) as T
}

async function newBase(name = 'Test database', user = owner) {
  return invoke<Base>(routes.createBase, user, { name })
}

async function newRecord(
  base: Base,
  title = 'Record',
  values: RecordPage['values'] = {},
  user = owner
) {
  return invoke<RecordPage>(routes.createRecord, user, {
    base_id: base.id,
    title,
    content: 'Persistent page content',
    values
  })
}

async function newField(
  base: Base,
  kind: Field['kind'],
  input: Record<string, unknown> = {},
  user = owner
) {
  return invoke<Field>(routes.createField, user, {
    base_id: base.id,
    name: kind,
    kind,
    ...input
  })
}

async function snapshot(user = owner) {
  return invoke<Snapshot>(routes.snapshot, user)
}

async function scopedState(...baseIds: string[]) {
  const state = await snapshot()
  const scopedRecords = state.records.filter(record =>
    baseIds.includes(record.base_id)
  )
  const recordIds = new Set(scopedRecords.map(record => record.id))
  const sortById = <T extends { id: string }>(rows: T[]) =>
    rows.sort((a, b) => a.id.localeCompare(b.id))

  return {
    bases: sortById(state.bases.filter(base => baseIds.includes(base.id))),
    fields: sortById(
      state.fields.filter(field => baseIds.includes(field.base_id))
    ),
    records: sortById(scopedRecords),
    views: sortById(state.views.filter(view => baseIds.includes(view.base_id))),
    links: sortById(
      state.links.filter(
        link =>
          recordIds.has(link.source_record_id) ||
          recordIds.has(link.target_record_id)
      )
    )
  }
}

describe.skipIf(!enabled)('Monolith persisted databases', () => {
  beforeAll(async () => {
    for (const id of [owner, otherOwner])
      await client`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic database owner')`
  })
  afterAll(async () => {
    for (const user of [owner, otherOwner])
      await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id', ${user}, true)`
        )
        await tx.delete(bases).where(eq(bases.owner_id, user))
        await tx.execute(sql`delete from users where id=${user}`)
      })
    await client.end()
  })

  it('validates every primitive type and preserves page content across a new connection', async () => {
    const base = await newBase()
    const text = await newField(base, 'text'),
      number = await newField(base, 'number'),
      date = await newField(base, 'date'),
      checkbox = await newField(base, 'checkbox')
    const select = await newField(base, 'select', {
        options: ['Todo', 'Done']
      }),
      multi = await newField(base, 'multi-select', { options: ['A', 'B'] })
    const values = {
      [text.id]: 'Hello',
      [number.id]: 42.5,
      [date.id]: '2026-10-12',
      [checkbox.id]: true,
      [select.id]: 'Todo',
      [multi.id]: ['A', 'B']
    }
    const record = await newRecord(base, 'A complete page', values)

    for (const invalid of [
      { [number.id]: '42' },
      { [date.id]: '2026-02-30' },
      { [checkbox.id]: 'true' },
      { [select.id]: 'Missing' },
      { [multi.id]: ['A', 'A'] },
      { [text.id]: 5 },
      { [randomUUID()]: 'unknown' }
    ]) {
      await expect(
        invoke(
          routes.updateRecord,
          owner,
          { title: record.title, content: 'Should roll back', values: invalid },
          { id: record.id }
        )
      ).rejects.toThrow()
    }

    const reopenedClient = postgres(connection, { max: 1, prepare: false })

    try {
      const reopenedDb = drizzle({ client: reopenedClient, relations: schema })
      const persisted = await invoke<Snapshot>(
        routes.snapshot,
        owner,
        undefined,
        {},
        reopenedDb
      )
      expect(persisted.records.find(row => row.id === record.id)).toMatchObject(
        { title: 'A complete page', content: 'Persistent page content', values }
      )
    } finally {
      await reopenedClient.end()
    }
    await expect(
      invoke(
        routes.updateField,
        owner,
        { name: 'Status', options: ['Done'] },
        { id: select.id }
      )
    ).rejects.toThrow('Invalid value')
    expect(
      (await snapshot()).fields.find(field => field.id === select.id)?.config
        .options
    ).toEqual(['Todo', 'Done'])
  })

  it('maintains reciprocal edges, rejects cardinality conflicts and removes incident links', async () => {
    const sourceBase = await newBase('Sources'),
      targetBase = await newBase('Targets')
    const field = await newField(sourceBase, 'relation', {
      target_base_id: targetBase.id,
      reverse_name: 'Sources',
      cardinality: 'many',
      reverse_cardinality: 'one'
    })
    const a = await newRecord(sourceBase, 'A'),
      b = await newRecord(sourceBase, 'B'),
      x = await newRecord(targetBase, 'X'),
      y = await newRecord(targetBase, 'Y')
    await invoke(routes.setLinks, owner, {
      field_id: field.id,
      record_id: a.id,
      target_ids: [x.id, y.id]
    })
    let state = await snapshot()
    expect(state.links.filter(link => link.field_id === field.id)).toHaveLength(
      2
    )
    expect(
      state.links.filter(
        link =>
          link.field_id === field.config.reciprocal_field_id &&
          link.target_record_id === a.id
      )
    ).toHaveLength(2)
    await expect(
      invoke(routes.setLinks, owner, {
        field_id: field.id,
        record_id: b.id,
        target_ids: [x.id]
      })
    ).rejects.toThrow('already linked')
    await expect(
      invoke(routes.setLinks, owner, {
        field_id: field.id,
        record_id: a.id,
        target_ids: [x.id, x.id]
      })
    ).rejects.toThrow('Duplicate')
    await expect(
      invoke(routes.setLinks, owner, {
        field_id: field.id,
        record_id: a.id,
        target_ids: [b.id]
      })
    ).rejects.toThrow('another database')
    await expect(
      invoke(
        routes.updateRecord,
        owner,
        { title: a.title, values: { [field.id]: [x.id] } },
        { id: a.id }
      )
    ).rejects.toThrow('links endpoint')
    await invoke(routes.setLinks, owner, {
      field_id: field.config.reciprocal_field_id,
      record_id: x.id,
      target_ids: []
    })
    state = await snapshot()
    expect(
      state.links
        .filter(
          link => link.field_id === field.id && link.source_record_id === a.id
        )
        .map(link => link.target_record_id)
    ).toEqual([y.id])
    await invoke(routes.removeRecord, owner, undefined, { id: y.id })
    state = await snapshot()
    expect(
      state.links.some(link =>
        [link.source_record_id, link.target_record_id].includes(y.id)
      )
    ).toBe(false)
    expect(state.records.find(row => row.id === a.id)?.content).toBe(
      'Persistent page content'
    )
  })

  it('enforces authenticated ownership through routes and PostgreSQL row policies', async () => {
    const mine = await newBase('Private'),
      theirs = await newBase('Other', otherOwner)
    const privateRecord = await newRecord(mine)
    const foreignRecord = await newRecord(theirs, 'Foreign', {}, otherOwner)
    expect(
      (await snapshot(otherOwner)).bases.some(base => base.id === mine.id)
    ).toBe(false)
    await expect(
      invoke(routes.updateBase, otherOwner, { name: 'Stolen' }, { id: mine.id })
    ).rejects.toThrow('not found')
    await expect(
      invoke(routes.removeRecord, otherOwner, undefined, {
        id: privateRecord.id
      })
    ).rejects.toThrow('not found')
    await expect(
      newField(mine, 'relation', { target_base_id: theirs.id })
    ).rejects.toThrow('not found')
    const relation = await newField(mine, 'relation', {
      target_base_id: mine.id
    })
    await expect(
      invoke(routes.setLinks, owner, {
        field_id: relation.id,
        record_id: privateRecord.id,
        target_ids: [foreignRecord.id]
      })
    ).rejects.toThrow('not found')
    await expect(invoke(routes.snapshot, undefined)).rejects.toThrow(
      'Authentication required'
    )
    const invisible = await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id', ${otherOwner}, true)`
      )

      return tx.select().from(records).where(eq(records.id, privateRecord.id))
    })
    expect(invisible).toEqual([])
  })

  it('persists table/Kanban filters and sorts and cleans deleted field references', async () => {
    const base = await newBase('Views'),
      number = await newField(base, 'number'),
      status = await newField(base, 'select', { options: ['Todo', 'Done'] })
    const a = await newRecord(base, 'Low', {
        [number.id]: 1,
        [status.id]: 'Todo'
      }),
      b = await newRecord(base, 'High', {
        [number.id]: 20,
        [status.id]: 'Todo'
      })
    await newRecord(base, 'Done', { [number.id]: 30, [status.id]: 'Done' })
    const view = await invoke<SavedView>(routes.createView, owner, {
      base_id: base.id,
      name: 'Work board',
      mode: 'kanban',
      group_field_id: status.id,
      config: {
        filters: [
          { field_id: status.id, operator: 'equals', value: 'Todo' },
          { field_id: number.id, operator: 'greater', value: 0 }
        ],
        sorts: [{ field_id: number.id, direction: 'desc' }],
        hidden_fields: [number.id]
      }
    })
    const state = await snapshot()
    const saved = state.views.find(current => current.id === view.id)
    expect(saved).toEqual(view)
    expect(
      applyView(
        state.records.filter(record => record.base_id === base.id),
        saved
      ).map(record => record.id)
    ).toEqual([b.id, a.id])
    await expect(
      invoke(routes.createView, owner, {
        base_id: base.id,
        name: 'Bad',
        mode: 'kanban',
        group_field_id: number.id,
        config: {}
      })
    ).rejects.toThrow('select or checkbox')
    await expect(
      invoke(routes.createView, owner, {
        base_id: base.id,
        name: 'Bad',
        mode: 'table',
        config: { filters: [{ field_id: randomUUID(), operator: 'empty' }] }
      })
    ).rejects.toThrow('unknown field')
    await invoke(routes.removeField, owner, undefined, { id: status.id })
    const cleaned = await snapshot()
    expect(cleaned.views.find(current => current.id === view.id)).toMatchObject(
      { mode: 'table', group_field_id: null }
    )
    expect(
      cleaned.views.find(current => current.id === view.id)?.config.filters
    ).toHaveLength(1)
    expect(
      cleaned.records.find(record => record.id === a.id)?.values[status.id]
    ).toBeUndefined()
  })

  it('serializes competing one-to-one writes from either direction', async () => {
    const left = await newBase('Left'),
      right = await newBase('Right')
    const field = await newField(left, 'relation', {
      target_base_id: right.id,
      cardinality: 'one',
      reverse_cardinality: 'one'
    })
    const a = await newRecord(left, 'A'),
      b = await newRecord(left, 'B'),
      target = await newRecord(right, 'Target')
    const results = await Promise.allSettled([
      invoke(routes.setLinks, owner, {
        field_id: field.id,
        record_id: a.id,
        target_ids: [target.id]
      }),
      invoke(routes.setLinks, owner, {
        field_id: field.id,
        record_id: b.id,
        target_ids: [target.id]
      })
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(
      1
    )
    const state = await snapshot()
    const incident = state.links.filter(
      link =>
        link.field_id === field.id ||
        link.field_id === field.config.reciprocal_field_id
    )
    expect(incident).toHaveLength(2)
    expect(incident[0]?.source_record_id).toBe(incident[1]?.target_record_id)
    expect(incident[0]?.target_record_id).toBe(incident[1]?.source_record_id)
  })

  it('deletes relation pairs and bases without deleting unrelated content pages', async () => {
    const left = await newBase('Delete left'),
      right = await newBase('Keep right')

    let field = await newField(left, 'relation', { target_base_id: right.id })

    const a = await newRecord(left),
      b = await newRecord(right)
    await invoke(routes.setLinks, owner, {
      field_id: field.id,
      record_id: a.id,
      target_ids: [b.id]
    })
    await invoke(routes.removeField, owner, undefined, { id: field.id })
    let state = await snapshot()
    expect(
      state.fields.some(current =>
        [field.id, field.config.reciprocal_field_id].includes(current.id)
      )
    ).toBe(false)
    field = await newField(left, 'relation', { target_base_id: right.id })
    await invoke(routes.setLinks, owner, {
      field_id: field.id,
      record_id: a.id,
      target_ids: [b.id]
    })
    await invoke(routes.removeBase, owner, undefined, { id: left.id })
    state = await snapshot()
    expect(state.bases.some(base => base.id === left.id)).toBe(false)
    expect(
      state.fields.some(
        current =>
          current.target_base_id === left.id || current.base_id === left.id
      )
    ).toBe(false)
    expect(
      state.links.some(link =>
        [link.source_record_id, link.target_record_id].includes(a.id)
      )
    ).toBe(false)
    expect(state.records.find(record => record.id === b.id)?.content).toBe(
      'Persistent page content'
    )
    const residue = await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id', ${owner}, true)`
      )

      return tx
        .select()
        .from(links)
        .where(
          and(
            eq(links.owner_id, owner),
            inArray(links.field_id, [
              field.id,
              field.config.reciprocal_field_id!
            ])
          )
        )
    })
    expect(residue).toEqual([])
  })

  it('converts canonical scalar values and equality filters while preserving page identities', async () => {
    const cases: {
      from: Field['kind']
      to: Field['kind']
      value: RecordPage['values'][string]
      converted: RecordPage['values'][string]
      filterValue?: RecordPage['values'][string]
      options?: string[]
    }[] = [
      { from: 'text', to: 'number', value: '42.5', converted: 42.5 },
      { from: 'number', to: 'text', value: -7.25, converted: '-7.25' },
      { from: 'text', to: 'checkbox', value: 'true', converted: true },
      { from: 'checkbox', to: 'text', value: false, converted: 'false' },
      {
        from: 'text',
        to: 'date',
        value: '2026-10-12',
        converted: '2026-10-12'
      },
      {
        from: 'date',
        to: 'text',
        value: '2026-10-12',
        converted: '2026-10-12'
      },
      {
        from: 'text',
        to: 'select',
        value: 'Todo',
        converted: 'Todo',
        options: ['Todo', 'Done']
      },
      {
        from: 'select',
        to: 'text',
        value: 'Todo',
        converted: 'Todo',
        options: ['Todo', 'Done']
      },
      {
        from: 'text',
        to: 'multi-select',
        value: 'Todo',
        converted: ['Todo'],
        filterValue: 'Todo',
        options: ['Todo', 'Done']
      },
      {
        from: 'multi-select',
        to: 'text',
        value: ['Todo'],
        converted: 'Todo',
        filterValue: 'Todo',
        options: ['Todo', 'Done']
      }
    ]

    for (const conversion of cases) {
      const base = await newBase(`${conversion.from} to ${conversion.to}`)
      const field = await newField(base, conversion.from, {
        options: ['select', 'multi-select'].includes(conversion.from)
          ? conversion.options
          : []
      })
      const unrelated = await newField(base, 'text', { name: 'Unrelated' })
      const populated = await newRecord(base, 'Keep this page', {
        [field.id]: conversion.value,
        [unrelated.id]: 'Unrelated property'
      })
      const nullable = await newRecord(base, 'Explicit null', {
        [field.id]: null
      })
      const absent = await newRecord(base, 'Absent property')
      const view = await invoke<SavedView>(routes.createView, owner, {
        base_id: base.id,
        name: 'Keep this view',
        mode: 'table',
        config: {
          filters: [
            {
              field_id: field.id,
              operator: 'equals',
              value: conversion.filterValue ?? conversion.value
            },
            { field_id: field.id, operator: 'not-empty' }
          ],
          sorts: [{ field_id: field.id, direction: 'asc' }],
          hidden_fields: [unrelated.id]
        }
      })
      const changed = await invoke<Field>(
        routes.updateField,
        owner,
        {
          name: 'Converted property',
          kind: conversion.to,
          options: conversion.options ?? []
        },
        { id: field.id }
      )
      const state = await scopedState(base.id)
      const saved = state.views.find(current => current.id === view.id)

      expect(changed).toMatchObject({
        id: field.id,
        base_id: base.id,
        position: field.position,
        name: 'Converted property',
        kind: conversion.to
      })
      expect(state.fields.find(current => current.id === field.id)).toEqual(
        changed
      )
      expect(
        state.records.find(record => record.id === populated.id)
      ).toMatchObject({
        id: populated.id,
        title: populated.title,
        content: populated.content,
        values: {
          [field.id]: conversion.converted,
          [unrelated.id]: 'Unrelated property'
        }
      })
      expect(
        state.records.find(record => record.id === nullable.id)?.values
      ).toEqual({
        [field.id]: null
      })
      expect(
        state.records.find(record => record.id === absent.id)?.values
      ).toEqual({})
      expect(saved).toEqual({
        ...view,
        config: {
          ...view.config,
          filters: [
            {
              field_id: field.id,
              operator: 'equals',
              value: conversion.filterValue ?? conversion.converted
            },
            { field_id: field.id, operator: 'not-empty' }
          ]
        }
      })
      expect(applyView(state.records, saved).map(record => record.id)).toEqual([
        populated.id
      ])
    }
  })

  it('round trips select and multi-select values without changing empty, null or absent properties', async () => {
    const base = await newBase('Select conversion')
    const field = await newField(base, 'select', { options: ['Todo', 'Done'] })
    const populated = await newRecord(base, 'One selection', {
      [field.id]: 'Todo'
    })
    const empty = await newRecord(base, 'Empty selection', { [field.id]: '' })
    const nullable = await newRecord(base, 'Null selection', {
      [field.id]: null
    })
    const absent = await newRecord(base, 'Absent selection')
    const view = await invoke<SavedView>(routes.createView, owner, {
      base_id: base.id,
      name: 'Todo only',
      mode: 'table',
      config: {
        filters: [{ field_id: field.id, operator: 'equals', value: 'Todo' }]
      }
    })
    const originalRecords = (await scopedState(base.id)).records

    await invoke(
      routes.updateField,
      owner,
      { name: field.name, kind: 'multi-select', options: ['Todo', 'Done'] },
      { id: field.id }
    )
    let state = await scopedState(base.id)
    expect(state.fields.find(current => current.id === field.id)?.kind).toBe(
      'multi-select'
    )
    expect(
      state.records.find(record => record.id === populated.id)?.values
    ).toEqual({
      [field.id]: ['Todo']
    })
    expect(
      state.records.find(record => record.id === empty.id)?.values
    ).toEqual({
      [field.id]: []
    })
    expect(
      state.records.find(record => record.id === nullable.id)?.values
    ).toEqual({
      [field.id]: null
    })
    expect(
      state.records.find(record => record.id === absent.id)?.values
    ).toEqual({})
    expect(state.views.find(current => current.id === view.id)).toEqual(view)
    expect(
      applyView(
        state.records,
        state.views.find(current => current.id === view.id)
      ).map(record => record.id)
    ).toEqual([populated.id])

    await invoke(
      routes.updateField,
      owner,
      { name: field.name, kind: 'select', options: ['Todo', 'Done'] },
      { id: field.id }
    )
    state = await scopedState(base.id)
    expect(state.fields.find(current => current.id === field.id)?.kind).toBe(
      'select'
    )
    expect(
      state.records.map(({ updated: _updated, ...record }) => record)
    ).toEqual(originalRecords.map(({ updated: _updated, ...record }) => record))
    expect(state.views.find(current => current.id === view.id)).toEqual(view)
  })

  it('rolls back field metadata, records and views when a value is lossy, noncanonical or incompatible', async () => {
    const cases: {
      from: Field['kind']
      to: Field['kind']
      valid: RecordPage['values'][string]
      invalid: RecordPage['values'][string]
      options?: string[]
    }[] = [
      { from: 'text', to: 'number', valid: '1', invalid: '01' },
      {
        from: 'text',
        to: 'number',
        valid: '42',
        invalid: '9007199254740993'
      },
      { from: 'text', to: 'number', valid: '0', invalid: '' },
      { from: 'text', to: 'checkbox', valid: 'true', invalid: 'True' },
      { from: 'text', to: 'checkbox', valid: 'false', invalid: '1' },
      {
        from: 'text',
        to: 'date',
        valid: '2026-10-12',
        invalid: '2026-02-30'
      },
      {
        from: 'text',
        to: 'select',
        valid: 'Todo',
        invalid: 'Missing',
        options: ['Todo', 'Done']
      },
      {
        from: 'multi-select',
        to: 'select',
        valid: ['Todo'],
        invalid: ['Todo', 'Done'],
        options: ['Todo', 'Done']
      },
      { from: 'number', to: 'checkbox', valid: 0, invalid: 1 }
    ]

    for (const conversion of cases) {
      const base = await newBase(
        `Reject ${conversion.from} to ${conversion.to}`
      )
      const field = await newField(base, conversion.from, {
        options: conversion.options ?? []
      })
      await newRecord(base, 'First page', { [field.id]: conversion.valid })
      await newRecord(base, 'Invalid page', { [field.id]: conversion.invalid })
      await invoke(routes.createView, owner, {
        base_id: base.id,
        name: 'Saved view survives',
        mode: 'table',
        config: { filters: [{ field_id: field.id, operator: 'not-empty' }] }
      })
      const before = await scopedState(base.id)

      await expect(
        invoke(
          routes.updateField,
          owner,
          {
            name: 'Metadata must roll back',
            kind: conversion.to,
            options: conversion.options ?? []
          },
          { id: field.id }
        )
      ).rejects.toThrow()
      expect(await scopedState(base.id)).toEqual(before)
    }
  })

  it('rejects conversions that change comparison or empty-selection filter semantics and rolls back all state', async () => {
    const cases: {
      kind: Field['kind']
      target: Field['kind']
      value: RecordPage['values'][string]
      filter: SavedView['config']['filters'][number]
      options?: string[]
    }[] = [
      {
        kind: 'number',
        target: 'text',
        value: 42,
        filter: { field_id: 'title', operator: 'greater', value: 20 }
      },
      {
        kind: 'number',
        target: 'text',
        value: 42,
        filter: { field_id: 'title', operator: 'less', value: 100 }
      },
      {
        kind: 'text',
        target: 'number',
        value: '42',
        filter: { field_id: 'title', operator: 'contains', value: '4' }
      },
      {
        kind: 'select',
        target: 'multi-select',
        value: '',
        filter: { field_id: 'title', operator: 'equals', value: '' },
        options: ['Todo', 'Done']
      },
      {
        kind: 'select',
        target: 'multi-select',
        value: '',
        filter: { field_id: 'title', operator: 'not-equals', value: '' },
        options: ['Todo', 'Done']
      },
      {
        kind: 'multi-select',
        target: 'select',
        value: [],
        filter: { field_id: 'title', operator: 'equals', value: '' },
        options: ['Todo', 'Done']
      },
      {
        kind: 'multi-select',
        target: 'select',
        value: [],
        filter: { field_id: 'title', operator: 'not-equals', value: '' },
        options: ['Todo', 'Done']
      }
    ]

    for (const conversion of cases) {
      const base = await newBase('Filter conversion rollback')
      const field = await newField(base, conversion.kind, {
        options: conversion.options ?? []
      })
      await newRecord(base, 'Preserve filtered page', {
        [field.id]: conversion.value
      })
      await invoke(routes.createView, owner, {
        base_id: base.id,
        name: 'Preserve operator semantics',
        mode: 'table',
        config: {
          filters: [{ ...conversion.filter, field_id: field.id }]
        }
      })
      const before = await scopedState(base.id)

      await expect(
        invoke(
          routes.updateField,
          owner,
          {
            name: 'Must roll back',
            kind: conversion.target,
            options: conversion.options ?? []
          },
          { id: field.id }
        )
      ).rejects.toThrow()
      expect(await scopedState(base.id)).toEqual(before)
    }
  })

  it('rejects conversions that would invalidate a Kanban grouping field without changing saved boards', async () => {
    for (const kind of ['select', 'checkbox'] as const) {
      const base = await newBase('Kanban conversion rollback')
      const options = kind === 'select' ? ['Todo', 'Done'] : []
      const field = await newField(base, kind, { options })
      await newRecord(base, 'Keep grouped page', {
        [field.id]: kind === 'select' ? 'Todo' : true
      })
      await invoke(routes.createView, owner, {
        base_id: base.id,
        name: 'Keep this board',
        mode: 'kanban',
        group_field_id: field.id,
        config: {}
      })
      const before = await scopedState(base.id)

      await expect(
        invoke(
          routes.updateField,
          owner,
          { name: 'Must roll back', kind: 'text', options },
          { id: field.id }
        )
      ).rejects.toThrow('select or checkbox')
      expect(await scopedState(base.id)).toEqual(before)
    }
  })

  it('rejects relation and primitive type changes without disturbing reciprocal edges or page content', async () => {
    const sourceBase = await newBase('Conversion source')
    const targetBase = await newBase('Conversion target')
    const relation = await newField(sourceBase, 'relation', {
      target_base_id: targetBase.id,
      reverse_name: 'Keep reciprocal field'
    })
    const primitive = await newField(sourceBase, 'text')
    const source = await newRecord(sourceBase, 'Keep source page', {
      [primitive.id]: 'Keep property value'
    })
    const target = await newRecord(targetBase, 'Keep target page')
    await invoke(routes.setLinks, owner, {
      field_id: relation.id,
      record_id: source.id,
      target_ids: [target.id]
    })
    await invoke(routes.createView, owner, {
      base_id: sourceBase.id,
      name: 'Keep relation filter',
      mode: 'table',
      config: {
        filters: [
          { field_id: relation.id, operator: 'equals', value: target.id }
        ]
      }
    })
    const before = await scopedState(sourceBase.id, targetBase.id)
    expect(before.links).toHaveLength(2)

    for (const conversion of [
      { field: relation, kind: 'text' },
      { field: primitive, kind: 'relation' }
    ]) {
      await expect(
        invoke(
          routes.updateField,
          owner,
          { name: 'Must roll back', kind: conversion.kind, options: [] },
          { id: conversion.field.id }
        )
      ).rejects.toThrow()
      expect(await scopedState(sourceBase.id, targetBase.id)).toEqual(before)
    }
  })
})
