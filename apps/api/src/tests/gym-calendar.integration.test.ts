import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import getEvents from '../../../../modules/zillion--gym/server/events'
import {
  relations,
  routines,
  schedule,
  settings,
  tables,
  workouts
} from '../../../../modules/zillion--gym/server/schema.drizzle'
import { settingsInputSchema } from '../../../../modules/zillion--gym/shared'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL || ''

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
      'Gym Calendar tests require an isolated loopback database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 3, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owners: string[] = []

async function owned<T>(
  owner: string,
  job: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id', ${owner}, true)`)

    return job(tx)
  })
}

async function fixture() {
  const owner: string = randomUUID()
  const routineId: string = randomUUID()
  owners.push(owner)
  await owned(owner, async tx => {
    await tx.insert(settings).values({
      owner_id: owner,
      values: settingsInputSchema.parse({
        timezone: 'America/New_York',
        reminder_time: '08:00'
      })
    })
    await tx.insert(routines).values({
      id: routineId,
      owner_id: owner,
      name: 'Owned training plan',
      notes: 'Planned routine notes'
    })
  })

  return { owner, routineId }
}

async function record(
  f: Awaited<ReturnType<typeof fixture>>,
  input: {
    date?: string
    start?: string
    end?: string
    status?: 'active' | 'completed' | 'discarded'
    name?: string
  } = {}
) {
  const id: string = randomUUID()
  await owned(f.owner, tx =>
    tx.insert(workouts).values({
      id,
      owner_id: f.owner,
      routine_id: f.routineId,
      name: input.name || 'Recorded afternoon session',
      notes: 'Recorded session notes',
      date: input.date || '2026-10-12',
      status: input.status || 'completed',
      started_at: new Date(input.start || '2026-10-12T16:00:00.000Z'),
      finished_at:
        input.status === 'active'
          ? null
          : new Date(input.end || '2026-10-12T17:30:00.000Z')
    })
  )

  return id
}

const feed = (
  owner: string,
  start = '2026-10-12T04:00:00.000Z',
  end = '2026-10-13T03:59:59.999Z'
) => owned(owner, tx => getEvents({ db: tx, start, end }))

afterAll(async () => {
  if (enabled)
    for (const owner of owners)
      await owned(owner, async tx => {
        await tx.delete(workouts).where(eq(workouts.owner_id, owner))
        await tx.delete(schedule).where(eq(schedule.owner_id, owner))
        await tx.delete(routines).where(eq(routines.owner_id, owner))
        await tx.delete(settings).where(eq(settings.owner_id, owner))
      })
  await client.end()
})

describe.skipIf(!enabled)(
  'Gym Calendar actual workout times and planned reminders',
  () => {
    it('shows recorded start and finish times even after reminder timezone and clock preferences change', async () => {
      const f = await fixture(),
        id = await record(f)
      expect(await feed(f.owner)).toEqual([
        expect.objectContaining({
          id,
          title: 'Recorded afternoon session',
          start: '2026-10-12T16:00:00.000Z',
          end: '2026-10-12T17:30:00.000Z',
          category: '_gym',
          is_strikethrough: true,
          description: 'Recorded session notes',
          reference_link: `/gym?section=history&workout=${id}`
        })
      ])
      await owned(f.owner, tx =>
        tx
          .update(settings)
          .set({
            values: settingsInputSchema.parse({
              timezone: 'Pacific/Auckland',
              reminder_time: '19:00'
            })
          })
          .where(eq(settings.owner_id, f.owner))
      )
      const changed = await feed(f.owner)
      expect(changed).toHaveLength(1)
      expect(changed[0]).toMatchObject({
        start: '2026-10-12T16:00:00.000Z',
        end: '2026-10-12T17:30:00.000Z'
      })
    })

    it('keeps planned reminders local across DST, stable identities and date-specific rest overrides', async () => {
      const f = await fixture()
      await owned(f.owner, tx =>
        tx.insert(schedule).values({
          owner_id: f.owner,
          weekday: 0,
          date: null,
          routine_id: f.routineId
        })
      )
      const before = await feed(
        f.owner,
        '2026-10-24T00:00:00.000Z',
        '2026-11-03T00:00:00.000Z'
      )
      expect(before).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            start: '2026-10-25T12:00:00.000Z',
            end: '2026-10-25T12:45:00.000Z',
            is_strikethrough: false
          }),
          expect.objectContaining({
            start: '2026-11-01T13:00:00.000Z',
            end: '2026-11-01T13:45:00.000Z',
            is_strikethrough: false
          })
        ])
      )
      expect(before).toHaveLength(2)
      expect(
        (
          await feed(
            f.owner,
            '2026-10-24T00:00:00.000Z',
            '2026-11-03T00:00:00.000Z'
          )
        ).map(row => row.id)
      ).toEqual(before.map(row => row.id))
      await owned(f.owner, tx =>
        tx.insert(schedule).values({
          owner_id: f.owner,
          weekday: null,
          date: '2026-11-01',
          routine_id: null
        })
      )
      expect(
        await feed(
          f.owner,
          '2026-10-24T00:00:00.000Z',
          '2026-11-03T00:00:00.000Z'
        )
      ).toEqual([
        expect.objectContaining({ start: '2026-10-25T12:00:00.000Z' })
      ])
      expect(
        await feed(
          f.owner,
          '2026-10-25T18:00:00.000Z',
          '2026-10-25T20:00:00.000Z'
        )
      ).toEqual([])
    })

    it('includes a session overlapping midnight and the month boundary by actual instants even when its civil label was edited', async () => {
      const f = await fixture()
      const id = await record(f, {
        date: '2026-09-20',
        start: '2026-09-30T23:30:00.000Z',
        end: '2026-10-01T05:30:00.000Z'
      })
      expect(
        await feed(
          f.owner,
          '2026-10-01T04:00:00.000Z',
          '2026-10-01T05:00:00.000Z'
        )
      ).toEqual([
        expect.objectContaining({
          id,
          start: '2026-09-30T23:30:00.000Z',
          end: '2026-10-01T05:30:00.000Z'
        })
      ])
    })

    it('excludes sessions outside the actual range and active or discarded sessions', async () => {
      const f = await fixture(),
        visible = await record(f)
      await record(f, {
        date: '2026-10-12',
        start: '2026-10-13T16:00:00.000Z',
        end: '2026-10-13T17:30:00.000Z'
      })
      await record(f, { status: 'active' })
      await record(f, { status: 'discarded' })
      expect((await feed(f.owner)).map(row => row.id)).toEqual([visible])
    })

    it('suppresses only the completed routine on its training day and keeps other planned days projected', async () => {
      const f = await fixture(),
        id = await record(f)
      await owned(f.owner, tx =>
        tx.insert(schedule).values({
          owner_id: f.owner,
          weekday: 1,
          date: null,
          routine_id: f.routineId
        })
      )
      const events = await feed(
        f.owner,
        '2026-10-12T04:00:00.000Z',
        '2026-10-20T03:59:59.999Z'
      )
      expect(events).toHaveLength(2)
      expect(events.find(row => row.id === id)).toMatchObject({
        start: '2026-10-12T16:00:00.000Z',
        end: '2026-10-12T17:30:00.000Z',
        is_strikethrough: true
      })
      expect(events.find(row => !row.is_strikethrough)).toMatchObject({
        start: '2026-10-19T12:00:00.000Z',
        reference_link: `/gym?section=plan&routine=${f.routineId}&date=2026-10-19`
      })
    })

    it('reads only the current owner under forced RLS and returns no events without an owner context', async () => {
      const a = await fixture(),
        b = await fixture()
      const own = await record(a),
        foreign = await record(b)
      const role =
        await client`select rolbypassrls, rolsuper from pg_roles where rolname=current_user`
      expect(role[0]).toMatchObject({ rolbypassrls: false, rolsuper: false })
      const policies =
        await client`select relname,relrowsecurity,relforcerowsecurity from pg_class where relname in ('zillion_gym__settings','zillion_gym__workouts') and relkind='r'`
      expect(policies).toHaveLength(2)
      expect(
        policies.every(row => row.relrowsecurity && row.relforcerowsecurity)
      ).toBe(true)
      expect((await feed(a.owner)).map(row => row.id)).toEqual([own])
      expect((await feed(b.owner)).map(row => row.id)).toEqual([foreign])
      expect(await feed('')).toEqual([])
    })
  }
)
