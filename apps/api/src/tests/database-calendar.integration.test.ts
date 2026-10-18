import { and, defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import * as routes from '../../../../modules/monolith--databases/server/routes'
import {
  bases,
  records,
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import {
  type Base,
  type CalendarFeed,
  type Field,
  type Person,
  type RecordPage,
  type SavedView,
  type Snapshot,
  viewConfigSchema
} from '../../../../modules/monolith--databases/shared'

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]

const owner = randomUUID(),
  otherOwner = randomUUID()
const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL || ''

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
      'Calendar integration tests only use isolated local Monolith databases on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 5, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })

async function scoped<T>(
  user: string,
  work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id', ${user}, true)`)

    return work(tx)
  })
}

async function invoke<T>(
  route: EndpointContract,
  user: string,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body)
  const parsedQuery = endpoint.schema.query?.parse(query)
  const result = await scoped(user, tx =>
    endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: { locals: { userId: user } }
    } as unknown as Context)
  )

  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}

const newBase = (user = owner) =>
  invoke<Base>(routes.createBase, user, { name: 'Calendar test database' })
const newField = (
  base: Base,
  kind: Field['kind'],
  extra: Record<string, unknown> = {},
  user = owner
) =>
  invoke<Field>(routes.createField, user, {
    base_id: base.id,
    name: kind,
    kind,
    ...extra
  })
const newRecord = (
  base: Base,
  title: string,
  values: RecordPage['values'] = {},
  user = owner
) =>
  invoke<RecordPage>(routes.createRecord, user, {
    base_id: base.id,
    title,
    content: 'Calendar page',
    values
  })
const newView = (base: Base, config: SavedView['config'], user = owner) =>
  invoke<SavedView>(routes.createView, user, {
    base_id: base.id,
    name: 'Schedule',
    mode: 'calendar',
    config
  })
const snapshot = (user = owner) => invoke<Snapshot>(routes.snapshot, user)
const feed = (user = owner, today = '2026-10-12') =>
  invoke<CalendarFeed>(routes.calendarFeed, user, undefined, { today })

describe.skipIf(!enabled)(
  'Persisted database calendars and smart properties',
  () => {
    beforeAll(async () => {
      for (const id of [owner, otherOwner])
        await client`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic calendar database owner')`
    })
    afterAll(async () => {
      for (const user of [owner, otherOwner])
        await scoped(user, async tx => {
          await tx.delete(bases).where(eq(bases.owner_id, user))
          const [available] = await tx.execute<{ present: boolean }>(
            sql`select to_regclass('public.zillion_agents__principals') is not null as present`
          )

          if (available?.present)
            await tx.execute(
              sql`delete from zillion_agents__principals where owner_id = ${user}`
            )
          await tx.execute(
            sql`delete from monolith_native_changes where owner_id=${user}`
          )
          await tx.execute(sql`delete from users where id=${user}`)
        })
      await client.end()
    })

    it('normalizes legacy table settings and persists explicit same-base calendar bindings', async () => {
      const base = await newBase(),
        otherBase = await newBase()
      const date = await newField(base, 'date'),
        end = await newField(base, 'date'),
        text = await newField(base, 'text'),
        foreign = await newField(otherBase, 'date')
      const initial = await snapshot()

      expect(
        initial.views.find(view => view.base_id === base.id)?.config
      ).toEqual(viewConfigSchema.parse({}))
      for (const invalid of [null, text.id, foreign.id])
        await expect(
          newView(base, viewConfigSchema.parse({ date_field_id: invalid }))
        ).rejects.toThrow('date field from this database')
      await expect(
        newView(
          base,
          viewConfigSchema.parse({
            date_field_id: date.id,
            end_date_field_id: text.id
          })
        )
      ).rejects.toThrow('Calendar end')
      const view = await newView(
        base,
        viewConfigSchema.parse({
          date_field_id: date.id,
          end_date_field_id: end.id
        })
      )

      expect(
        (await snapshot()).views.find(saved => saved.id === view.id)
      ).toEqual(view)
      await expect(
        invoke(routes.calendarFeed, owner, undefined, { today: '2026-02-30' })
      ).rejects.toThrow('valid YYYY-MM-DD')
      await expect(
        invoke(
          routes.updateView,
          otherOwner,
          { name: 'Other', mode: 'calendar', config: view.config },
          { id: view.id }
        )
      ).rejects.toThrow('View not found')
    })

    it('evaluates persisted grouped all/any logic and exact tags in the same Calendar feed', async () => {
      const base = await newBase()
      const date = await newField(base, 'date'),
        tags = await newField(base, 'multi-select', {
          options: ['Art', 'Cart']
        }),
        person = await newField(base, 'person'),
        status = await newField(base, 'select', { options: ['Active', 'Done'] })
      const common = { [date.id]: '2026-10-12', [person.id]: owner }
      const active = await newRecord(base, 'Active', {
        ...common,
        [tags.id]: ['Cart'],
        [status.id]: 'Active'
      })
      const art = await newRecord(base, 'Art', {
        ...common,
        [tags.id]: ['Art'],
        [status.id]: 'Done'
      })
      await newRecord(base, 'Cart', {
        ...common,
        [tags.id]: ['Cart'],
        [status.id]: 'Done'
      })
      await newRecord(base, 'Future', {
        ...common,
        [date.id]: '2026-10-13',
        [tags.id]: ['Art'],
        [status.id]: 'Done'
      })
      await newRecord(base, 'No owner', {
        [date.id]: '2026-10-12',
        [tags.id]: ['Art'],
        [status.id]: 'Done'
      })
      const config = viewConfigSchema.parse({
        date_field_id: date.id,
        filters: [
          { field_id: date.id, operator: 'on-or-before', value: '2026-10-12' },
          { field_id: person.id, operator: 'includes', value: owner }
        ],
        filter_groups: [
          {
            filter_logic: 'or',
            filters: [
              { field_id: status.id, operator: 'equals', value: 'Active' },
              { field_id: tags.id, operator: 'contains', value: 'Art' }
            ]
          }
        ]
      })
      const view = await newView(base, config)
      const actual = (await feed()).items.filter(
        item => item.source_id === view.id
      )

      expect(actual.map(item => item.record_id).sort()).toEqual(
        [active.id, art.id].sort()
      )
      expect(actual.find(item => item.record_id === art.id)).toMatchObject({
        id: `${view.id}:${art.id}`,
        start: '2026-10-12',
        end: '2026-10-12',
        tags: ['Art'],
        owners: [owner],
        href: `/databases?workspace=${base.workspace_id}&base=${base.id}&view=${view.id}&record=${art.id}`
      })
      expect(
        (await feed(otherOwner)).sources.some(
          source => source.source_id === view.id
        )
      ).toBe(false)
      await invoke(
        routes.updateView,
        owner,
        {
          ...view,
          config: {
            ...config,
            filters: [
              {
                field_id: date.id,
                operator: 'relative-date',
                value: 'tomorrow'
              },
              ...config.filters.filter(filter => filter.field_id !== date.id)
            ]
          }
        },
        { id: view.id }
      )

      expect(
        (await feed()).items
          .filter(item => item.source_id === view.id)
          .map(item => item.title)
      ).toEqual(['Future'])
      expect(
        (await feed(owner, '2026-10-11')).items
          .filter(item => item.source_id === view.id)
          .map(item => item.record_id)
          .sort()
      ).toEqual([active.id, art.id].sort())
    })

    it('offers owned human/agent principals, validates cells and rejects foreign principal operands', async () => {
      const agentId = randomUUID(),
        foreignId = randomUUID()
      await scoped(owner, tx =>
        tx.execute(
          sql`insert into zillion_agents__principals (id, owner_id, kind, name) values (${agentId}, ${owner}, 'agent', 'Calendar assistant')`
        )
      )
      await scoped(otherOwner, tx =>
        tx.execute(
          sql`insert into zillion_agents__principals (id, owner_id, kind, name) values (${foreignId}, ${otherOwner}, 'agent', 'Private assistant')`
        )
      )
      const people = await invoke<Person[]>(routes.people, owner)

      expect(
        people.some(person => person.id === owner && person.kind === 'human')
      ).toBe(true)
      expect(people.find(person => person.id === agentId)).toMatchObject({
        label: 'Calendar assistant',
        kind: 'agent',
        status: 'active'
      })
      expect(
        people.some(
          person => person.id === foreignId || person.id === otherOwner
        )
      ).toBe(false)
      expect(people.some(person => 'email' in person)).toBe(false)
      const base = await newBase(),
        person = await newField(base, 'person'),
        date = await newField(base, 'date')
      const record = await newRecord(base, 'Assigned', {
        [person.id]: agentId,
        [date.id]: '2026-10-12'
      })
      const before = await snapshot()

      await expect(
        newRecord(base, 'Foreign', { [person.id]: foreignId })
      ).rejects.toThrow('Invalid value')
      await expect(
        invoke(
          routes.updateRecord,
          owner,
          {
            title: record.title,
            content: record.content,
            values: { [person.id]: otherOwner }
          },
          { id: record.id }
        )
      ).rejects.toThrow('Invalid value')
      for (const operator of ['equals', 'includes', 'includes-any'])
        await expect(
          newView(
            base,
            viewConfigSchema.parse({
              date_field_id: date.id,
              filters: [
                {
                  field_id: person.id,
                  operator,
                  value: operator === 'includes-any' ? [foreignId] : foreignId
                }
              ]
            })
          )
        ).rejects.toThrow('owned principal')
      expect(await snapshot()).toEqual(before)
      const view = await newView(
        base,
        viewConfigSchema.parse({
          date_field_id: date.id,
          filters: [
            { field_id: person.id, operator: 'includes-all', value: [agentId] }
          ]
        })
      )

      expect(
        (await feed()).items.find(item => item.source_id === view.id)?.owners
      ).toEqual([agentId])
    })

    it('validates owned target-base relation membership before saving filters', async () => {
      const base = await newBase(),
        targetBase = await newBase(),
        wrongBase = await newBase(),
        foreignBase = await newBase(otherOwner)
      const date = await newField(base, 'date'),
        relation = await newField(base, 'relation', {
          target_base_id: targetBase.id
        })
      const record = await newRecord(base, 'Linked', {
          [date.id]: '2026-10-12'
        }),
        target = await newRecord(targetBase, 'Target'),
        wrong = await newRecord(wrongBase, 'Wrong'),
        foreign = await newRecord(foreignBase, 'Private', {}, otherOwner)
      await invoke(routes.setLinks, owner, {
        field_id: relation.id,
        record_id: record.id,
        target_ids: [target.id]
      })
      const config = (value: string) =>
        viewConfigSchema.parse({
          date_field_id: date.id,
          filter_groups: [
            {
              filters: [
                {
                  field_id: relation.id,
                  operator: 'includes-any',
                  value: [value]
                }
              ]
            }
          ]
        })

      await expect(newView(base, config(wrong.id))).rejects.toThrow(
        'another database'
      )
      await expect(newView(base, config(foreign.id))).rejects.toThrow(
        'Record not found'
      )
      await expect(
        newView(base, config('------------------------------------'))
      ).rejects.toThrow('record identifier')
      const view = await newView(base, config(target.id))

      expect(
        (await feed()).items
          .filter(item => item.source_id === view.id)
          .map(item => item.record_id)
      ).toEqual([record.id])
    })

    it('rejects reversed range writes and protects both bound dates without changing data', async () => {
      const base = await newBase(),
        start = await newField(base, 'date'),
        end = await newField(base, 'date')
      const view = await newView(
        base,
        viewConfigSchema.parse({
          date_field_id: start.id,
          end_date_field_id: end.id
        })
      )
      const record = await newRecord(base, 'Multi-day', {
        [start.id]: '2026-10-12',
        [end.id]: '2026-10-14'
      })
      const before = await snapshot()

      await expect(
        newRecord(base, 'Reversed', {
          [start.id]: '2026-10-12',
          [end.id]: '2026-10-11'
        })
      ).rejects.toThrow('ends before')
      await expect(
        invoke(
          routes.updateRecord,
          owner,
          {
            title: record.title,
            content: record.content,
            values: { [start.id]: '2026-10-15', [end.id]: '2026-10-14' },
            expected_updated: record.updated
          },
          { id: record.id }
        )
      ).rejects.toThrow('ends before')

      for (const field of [start, end]) {
        await expect(
          invoke(routes.removeField, owner, undefined, { id: field.id })
        ).rejects.toThrow('change its date settings')
        await expect(
          invoke(
            routes.updateField,
            owner,
            { name: field.name, kind: 'text', options: [] },
            { id: field.id }
          )
        ).rejects.toThrow('saved view')
      }
      expect(await snapshot()).toEqual(before)
      expect(
        (await feed()).items.find(item => item.source_id === view.id)
      ).toMatchObject({ start: '2026-10-12', end: '2026-10-14' })
      await invoke(
        routes.updateView,
        owner,
        { ...view, config: { ...view.config, end_date_field_id: null } },
        { id: view.id }
      )
      await invoke(routes.removeField, owner, undefined, { id: end.id })

      expect((await snapshot()).fields.some(field => field.id === end.id)).toBe(
        false
      )
      await invoke(routes.removeBase, owner, undefined, { id: base.id })
      expect(
        (await feed()).sources.some(source => source.source_id === view.id)
      ).toBe(false)
    })

    it('counts undated and malformed legacy ranges without discarding record pages', async () => {
      const base = await newBase(),
        start = await newField(base, 'date'),
        end = await newField(base, 'date')
      const valid = await newRecord(base, 'Valid', {
          [start.id]: '2026-10-12'
        }),
        undated = await newRecord(base, 'Undated'),
        invalid = await newRecord(base, 'Legacy invalid'),
        reversed = await newRecord(base, 'Legacy reversed')
      await scoped(owner, async tx => {
        await tx
          .update(records)
          .set({ values: { [start.id]: '2026-02-30' } })
          .where(and(eq(records.id, invalid.id), eq(records.owner_id, owner)))
        await tx
          .update(records)
          .set({ values: { [start.id]: '2026-10-12', [end.id]: '2026-10-11' } })
          .where(and(eq(records.id, reversed.id), eq(records.owner_id, owner)))
      })
      const view = await newView(
        base,
        viewConfigSchema.parse({
          date_field_id: start.id,
          end_date_field_id: end.id
        })
      )
      const actual = await feed()

      expect(
        actual.sources.find(source => source.source_id === view.id)
          ?.unscheduled_count
      ).toBe(3)
      expect(
        actual.items
          .filter(item => item.source_id === view.id)
          .map(item => item.record_id)
      ).toEqual([valid.id])
      expect(
        (await snapshot()).records
          .filter(record => record.base_id === base.id)
          .map(record => record.id)
          .sort()
      ).toEqual([valid.id, undated.id, invalid.id, reversed.id].sort())
    })

    it('preserves Calendar settings during unrelated deletion and validates grouped filter conversion atomically', async () => {
      const base = await newBase(),
        date = await newField(base, 'date'),
        number = await newField(base, 'number'),
        removable = await newField(base, 'text')
      const record = await newRecord(base, 'Budget', {
        [date.id]: '2026-10-12',
        [number.id]: 42,
        [removable.id]: 'temporary'
      })
      const view = await newView(
        base,
        viewConfigSchema.parse({
          date_field_id: date.id,
          filter_groups: [
            {
              filter_logic: 'or',
              filters: [
                { field_id: number.id, operator: 'greater', value: 10 },
                { field_id: removable.id, operator: 'not-empty' }
              ]
            }
          ]
        })
      )
      const before = await snapshot()

      await expect(
        invoke(
          routes.updateField,
          owner,
          { name: number.name, kind: 'text', options: [] },
          { id: number.id }
        )
      ).rejects.toThrow('typed comparison')
      expect(await snapshot()).toEqual(before)
      await invoke(routes.removeField, owner, undefined, { id: removable.id })
      const remaining = (await snapshot()).views.find(
        saved => saved.id === view.id
      )

      expect(remaining?.config).toMatchObject({
        date_field_id: date.id,
        filter_logic: 'and',
        end_date_field_id: null,
        filter_groups: [
          {
            filter_logic: 'or',
            filters: [{ field_id: number.id, operator: 'greater', value: 10 }]
          }
        ]
      })
      await invoke(
        routes.updateView,
        owner,
        {
          ...view,
          config: {
            ...view.config,
            filter_groups: [
              {
                filter_logic: 'or',
                filters: [
                  { field_id: number.id, operator: 'equals', value: 42 }
                ]
              }
            ]
          }
        },
        { id: view.id }
      )
      await invoke(
        routes.updateField,
        owner,
        { name: number.name, kind: 'text', options: [] },
        { id: number.id }
      )
      const converted = await snapshot()

      expect(
        converted.records.find(saved => saved.id === record.id)?.values[
          number.id
        ]
      ).toBe('42')
      expect(
        converted.views.find(saved => saved.id === view.id)?.config
          .filter_groups?.[0]?.filters[0]?.value
      ).toBe('42')
      expect(
        (await feed()).items
          .filter(item => item.source_id === view.id)
          .map(item => item.record_id)
      ).toEqual([record.id])
    })
  }
)
