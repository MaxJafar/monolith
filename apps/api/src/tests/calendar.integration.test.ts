import { getTableName, is, sql } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import z from 'zod'

import { composeRelations, scopeDbForModule } from '@lifeforge/drizzle'
import {
  ModuleRegistry,
  setLoadingModuleId
} from '@lifeforge/module-runtime/registry'
import {
  type ForgeContract,
  checkRecordExistence
} from '@lifeforge/server-utils'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const owner = randomUUID(),
  other = randomUUID()

let admin: ReturnType<typeof postgres> | undefined
let client: ReturnType<typeof postgres> | undefined
let db: ReturnType<typeof drizzle>
let routes: typeof import('../../../../modules/lifeforge--calendar/server/index').default
let schema: typeof import('../../../../modules/lifeforge--calendar/server/schema.drizzle')

if (enabled)
  for (const connection of [
    process.env.DATABASE_URL,
    process.env.DATABASE_ADMIN_URL
  ]) {
    if (!connection)
      throw new Error('Configure an isolated local Calendar test database')

    const target = new URL(connection)

    if (
      process.env.NODE_ENV === 'production' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      target.port !== '55432' ||
      !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
    )
      throw new Error(
        'Calendar integration tests only use isolated loopback PostgreSQL on port 55432'
      )
  }

class Rejected extends Error {
  constructor(readonly result: { $status: number; payload?: unknown }) {
    super('Failed route')
  }
}

async function invoke(
  route: ForgeContract,
  query: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
  userId = owner
) {
  const endpoint = route.getValue()
  const parsedQuery = endpoint.schema.query?.parse(query),
    parsedBody = endpoint.schema.body?.parse(body)

  try {
    return await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id', ${userId}, true)`
      )
      const scoped = scopeDbForModule(
        tx,
        ModuleRegistry.getModuleKeyMap('lifeforge--calendar')
      )
      await checkRecordExistence({
        db: scoped,
        querySchema: endpoint.schema.query,
        query: parsedQuery,
        bodySchema: endpoint.schema.body,
        body: parsedBody
      })
      const result = await endpoint.callback({
        db: scoped,
        query: parsedQuery,
        body: parsedBody,
        media: {},
        req: {},
        res: { locals: { userId } },
        core: { logging: { debug() {}, warn() {} } }
      } as unknown as Parameters<typeof endpoint.callback>[0])

      if (result.$status >= 400) throw new Rejected(result)

      return result
    })
  } catch (error) {
    if (error instanceof Rejected) return error.result
    throw error
  }
}

const idOf = (result: { payload?: unknown }) =>
  z.object({ id: z.uuid() }).parse(result.payload).id
const rowsOf = (result: { payload?: unknown }) =>
  z
    .array(
      z
        .object({
          id: z.string(),
          start: z.string(),
          end: z.string(),
          title: z.string()
        })
        .passthrough()
    )
    .parse(result.payload)
const single = {
  title: 'Calendar test',
  description: 'Persistent details',
  reference_link: 'https://example.invalid/reference',
  category: '',
  calendar: '',
  type: 'single',
  start: '2026-10-31T09:00:00-04:00',
  end: '2026-10-31T10:00:00-04:00'
}

describe.skipIf(!enabled)(
  'Calendar routes against owner-isolated PostgreSQL',
  () => {
    beforeAll(async () => {
      admin = postgres(process.env.DATABASE_ADMIN_URL!, {
        max: 1,
        prepare: false
      })
      client = postgres(process.env.DATABASE_URL!, { max: 2, prepare: false })
      const [role] =
        await client`select rolsuper, rolbypassrls from pg_roles where rolname=current_user`
      expect(role).toMatchObject({ rolsuper: false, rolbypassrls: false })
      setLoadingModuleId('lifeforge--calendar')

      try {
        routes = (
          await import('../../../../modules/lifeforge--calendar/server/index')
        ).default
        schema =
          await import('../../../../modules/lifeforge--calendar/server/schema.drizzle')
      } finally {
        setLoadingModuleId(undefined)
      }
      db = drizzle({
        client,
        relations: composeRelations(ModuleRegistry.schemaParts)
      })
      for (const id of [owner, other])
        await admin`insert into users(id,email,username,name) values(${id},${`${id}@example.invalid`},${id},'Calendar verification')`
    })
    afterAll(async () => {
      if (admin) {
        const parts = ModuleRegistry.schemaParts.filter(
          part => part.moduleId === 'lifeforge--calendar'
        )

        for (const table of parts
          .flatMap(part => Object.values(part.tables))
          .reverse())
          if (is(table, PgTable))
            await admin`delete from ${admin(getTableName(table))} where owner_id in (${owner},${other})`
        await admin`delete from users where id in (${owner},${other})`
        await admin.end()
      }
      if (client) await client.end()
    })
    it('keeps multiple calendar/category references and isolates all reads and foreign references', async () => {
      const calendar1 = idOf(
        await invoke(
          routes.calendars.create,
          {},
          { name: 'Work', color: '#ff8904' }
        )
      )
      const calendar2 = idOf(
        await invoke(
          routes.calendars.create,
          {},
          { name: 'Home', color: '#38bdf8' }
        )
      )
      const category = idOf(
        await invoke(
          routes.categories.create,
          {},
          { name: 'Meeting', color: '#ff8904', icon: 'tabler:users' }
        )
      )
      const first = idOf(
        await invoke(
          routes.events.create,
          {},
          { ...single, calendar: calendar1, category }
        )
      )
      const second = idOf(
        await invoke(
          routes.events.create,
          {},
          { ...single, title: 'Other calendar', calendar: calendar2, category }
        )
      )
      const read = rowsOf(
        await invoke(routes.events.getByDateRange, {
          start: '2026-10-31',
          end: '2026-10-31'
        })
      )
      expect(read.filter(row => [first, second].includes(row.id))).toHaveLength(
        2
      )
      expect(read.find(row => row.id === first)).toMatchObject({
        calendar: calendar1,
        category,
        start: '2026-10-31T13:00:00.000Z'
      })
      expect(
        rowsOf(
          await invoke(
            routes.events.getByDateRange,
            { start: '2026-10-31', end: '2026-10-31' },
            {},
            other
          )
        )
      ).toEqual([])
      await expect(
        invoke(
          routes.events.create,
          {},
          { ...single, calendar: calendar1 },
          other
        )
      ).rejects.toMatchObject({ code: 404 })
      await expect(
        invoke(routes.events.create, {}, { ...single, category }, other)
      ).rejects.toMatchObject({ code: 404 })
      await invoke(routes.events.remove, { id: first })
      await invoke(routes.events.remove, { id: second })
    })
    it('reschedules only dates while preserving metadata from a later edit', async () => {
      const id = idOf(await invoke(routes.events.create, {}, single))
      await invoke(
        routes.events.update,
        { id },
        {
          ...single,
          title: 'Latest edited title',
          description: 'Latest description',
          reference_link: '/databases?record=example',
          location: {
            name: 'New location',
            formattedAddress: 'New location',
            location: { latitude: 40, longitude: -74 }
          }
        }
      )
      const before = (await invoke(routes.events.getById, { id })).payload
      expect(
        (
          await invoke(
            routes.events.reschedule,
            { id },
            {
              start: '2026-11-01T09:00:00-05:00',
              end: '2026-11-01T10:00:00-05:00'
            }
          )
        ).$status
      ).toBe(200)
      expect(
        (await invoke(routes.events.getById, { id })).payload
      ).toMatchObject({
        ...(before as object),
        title: 'Latest edited title',
        description: 'Latest description',
        location: 'New location',
        reference_link: '/databases?record=example',
        updated: expect.any(Date)
      })
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-11-01',
            end: '2026-11-01'
          })
        ).find(row => row.id === id)
      ).toMatchObject({
        start: '2026-11-01T14:00:00.000Z',
        end: '2026-11-01T15:00:00.000Z'
      })
      await expect(
        invoke(
          routes.events.reschedule,
          { id },
          { start: single.start, end: single.end },
          other
        )
      ).rejects.toMatchObject({ code: 404 })
      await invoke(routes.events.remove, { id })
    })
    it('rejects an older modal save after rescheduling or a concurrent edit', async () => {
      const id = idOf(await invoke(routes.events.create, {}, single))
      const snapshot = rowsOf(
        await invoke(routes.events.getByDateRange, {
          start: '2026-10-31',
          end: '2026-10-31'
        })
      ).find(row => row.id === id)!
      const expected = z.object({ updated: z.string() }).parse(snapshot).updated
      await invoke(
        routes.events.reschedule,
        { id },
        { start: '2026-11-01T14:00:00Z', end: '2026-11-01T15:00:00Z' }
      )
      await expect(
        invoke(
          routes.events.update,
          { id },
          { ...single, title: 'Stale modal', expected_updated: expected }
        )
      ).rejects.toMatchObject({ code: 409 })
      const latest = (await invoke(routes.events.getById, { id })).payload as {
        updated: Date
      }
      expect(
        (
          await invoke(
            routes.events.update,
            { id },
            {
              ...single,
              title: 'Latest edit',
              start: '2026-11-01T14:00:00Z',
              end: '2026-11-01T15:00:00Z',
              expected_updated: latest.updated.toISOString()
            }
          )
        ).$status
      ).toBe(200)
      await expect(
        invoke(
          routes.events.update,
          { id },
          {
            ...single,
            title: 'Another stale save',
            expected_updated: latest.updated.toISOString()
          }
        )
      ).rejects.toMatchObject({ code: 409 })
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-11-01',
            end: '2026-11-01'
          })
        ).find(row => row.id === id)
      ).toMatchObject({
        title: 'Latest edit',
        start: '2026-11-01T14:00:00.000Z',
        end: '2026-11-01T15:00:00.000Z'
      })
      await invoke(routes.events.remove, { id })
    })
    it('finds boundary and spanning events using exact browser offset ranges', async () => {
      const late = idOf(
        await invoke(
          routes.events.create,
          {},
          {
            ...single,
            start: '2026-11-01T23:30:00-05:00',
            end: '2026-11-02T00:15:00-05:00'
          }
        )
      )
      const spanning = idOf(
        await invoke(
          routes.events.create,
          {},
          {
            ...single,
            start: '2026-10-01T00:00:00Z',
            end: '2026-12-01T00:00:00Z'
          }
        )
      )
      const read = rowsOf(
        await invoke(routes.events.getByDateRange, {
          start: '2026-11-01T00:00:00-04:00',
          end: '2026-11-01T23:59:59.999-05:00'
        })
      )
      expect(read.map(row => row.id)).toEqual(
        expect.arrayContaining([late, spanning])
      )
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-11-01T00:00:00Z',
            end: '2026-11-01T23:59:59Z'
          })
        ).some(row => row.id === late)
      ).toBe(false)
      await invoke(routes.events.remove, { id: late })
      await invoke(routes.events.remove, { id: spanning })
    })
    it('preserves recurring exception protection and rejects recurring/ICS/derived rescheduling', async () => {
      const id = idOf(
        await invoke(
          routes.events.create,
          {},
          {
            ...single,
            type: 'recurring',
            rrule:
              'DTSTART:20261031T130000Z\nRRULE:FREQ=DAILY;COUNT=2||duration_amt=1;duration_unit=hour'
          }
        )
      )
      expect(
        (
          await invoke(
            routes.events.reschedule,
            { id },
            { start: single.start, end: single.end }
          )
        ).$status
      ).toBe(400)
      await invoke(routes.events.addException, {
        id,
        date: '2026-10-31T09:00:00-04:00'
      })
      const read = rowsOf(
        await invoke(routes.events.getByDateRange, {
          start: '2026-10-31',
          end: '2026-11-01'
        })
      ).filter(row => row.id.startsWith(id + '-'))
      expect(read.map(row => row.start)).toEqual(['2026-11-01T13:00:00.000Z'])
      const ical = randomUUID()
      await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id', ${owner}, true)`
        )
        await tx.insert(schema.eventsIcal).values({
          id: ical,
          title: 'Read-only ICS',
          external_id: randomUUID(),
          start: new Date(single.start),
          end: new Date(single.end)
        })
      })
      await expect(
        invoke(
          routes.events.reschedule,
          { id: ical },
          { start: single.start, end: single.end }
        )
      ).rejects.toMatchObject({ code: 404 })
      await expect(
        invoke(
          routes.events.reschedule,
          { id: 'db:view:record' },
          { start: single.start, end: single.end }
        )
      ).rejects.toThrow()
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-10-31',
            end: '2026-10-31'
          })
        ).find(row => row.id === `ical-${ical}`)
      ).toMatchObject({
        start: '2026-10-31T13:00:00.000Z',
        category: '_external'
      })
      await invoke(routes.events.remove, { id })
    })
    it('rejects invalid date ranges and reschedules without changing saved data', async () => {
      const id = idOf(await invoke(routes.events.create, {}, single))

      for (const query of [
        { start: '2026-02-30', end: '2026-03-01' },
        { start: '2026-11-02', end: '2026-11-01' },
        { start: '2025-01-01', end: '2026-11-01' },
        { start: '2026-11-01 00:00:00', end: '2026-11-01' }
      ])
        await expect(
          invoke(routes.events.getByDateRange, query)
        ).rejects.toThrow()
      for (const body of [
        { start: '2026-11-01T09:00:00', end: single.end },
        { start: single.end, end: single.start }
      ])
        await expect(
          invoke(routes.events.reschedule, { id }, body)
        ).rejects.toThrow()
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-10-31',
            end: '2026-10-31'
          })
        ).find(row => row.id === id)
      ).toMatchObject({
        start: '2026-10-31T13:00:00.000Z',
        end: '2026-10-31T14:00:00.000Z'
      })
      await invoke(routes.events.remove, { id })
    })
    it('rejects high-frequency or excessive-duration recurrence without orphan metadata', async () => {
      const before = rowsOf(
        await invoke(routes.events.getByDateRange, {
          start: '2026-10-31',
          end: '2026-10-31'
        })
      ).length

      for (const rule of [
        'DTSTART:20261031T130000Z\nRRULE:FREQ=SECONDLY||duration_amt=1;duration_unit=minute',
        'DTSTART:20261031T130000Z\nRRULE:FREQ=MINUTELY||duration_amt=1;duration_unit=hour',
        'DTSTART:20261031T130000Z\nRRULE:FREQ=DAILY||duration_amt=2;duration_unit=year'
      ])
        expect(
          (
            await invoke(
              routes.events.create,
              {},
              { ...single, type: 'recurring', rrule: rule }
            )
          ).$status
        ).toBe(400)
      expect(
        rowsOf(
          await invoke(routes.events.getByDateRange, {
            start: '2026-10-31',
            end: '2026-10-31'
          })
        )
      ).toHaveLength(before)
      await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id', ${owner}, true)`
        )
        expect(await tx.select().from(schema.events)).toEqual([])
      })
    })
  }
)
