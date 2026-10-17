import type { EndpointContract } from '@monolith/server-utils'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as rpg from '../../../../modules/monolith--databases/server/urpgRoutes'
import * as widgets from '../../../../modules/monolith--databases/server/widgetRoutes'
import type {
  Campaign,
  RPGCommand
} from '../../../../modules/monolith--databases/urpgShared'
import type {
  HabitState,
  MarketQuote
} from '../../../../modules/monolith--databases/widgetShared'
import { users } from '../lib/user/schema.drizzle'

const enabled = process.env.MONOLITH_URPG_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''
const adminConnection = process.env.DATABASE_ADMIN_URL ?? ''
if (enabled)
  for (const uri of [connection, adminConnection]) {
    const target = new URL(uri)
    if (
      process.env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.port !== '55432' ||
      target.pathname !== '/zillion_dev'
    )
      throw Error('uRPG fixtures require the isolated loopback database')
  }
const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/disabled',
  { max: 4 }
)
const admin = postgres(
  enabled ? adminConnection : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({
  client,
  relations: defineRelations({ ...tables, users }, r => ({
    ...relations(r as Parameters<typeof relations>[0])
  }))
})
const [owner, editor, viewer, outsider] = [
  randomUUID(),
  randomUUID(),
  randomUUID(),
  randomUUID()
] as [string, string, string, string]
const setupId = randomUUID()
const character = {
  name: 'Synthetic hero',
  age: 30,
  weight: 70,
  avatar: '',
  calorieTarget: 2100,
  waterTarget: 2000,
  weeklyTarget: 3000,
  timezone: 'Asia/Baku'
}
let workspace = '',
  other = ''
type Context = Parameters<ReturnType<EndpointContract['getValue']>['callback']>[0]
async function invoke<T>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {},
  key = ''
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } },
      core: { api: { getAPIKey: async () => key } }
    } as unknown as Context)
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
const snapshot = (actor = owner, id = workspace) =>
  invoke<Campaign>(rpg.snapshot, actor, undefined, { workspace_id: id })
async function command(value: RPGCommand, actor = owner, revision?: number) {
  return invoke<Campaign>(
    rpg.command,
    actor,
    {
      expected_revision: revision ?? (await snapshot(actor)).revision,
      command: value
    },
    { workspace_id: workspace }
  )
}
beforeAll(async () => {
  if (!enabled) return
  for (const id of [owner, editor, viewer, outsider])
    await admin`insert into users(id,email,username,name) values(${id},${'urpg-' + id + '@example.invalid'},${id},'Synthetic uRPG fixture')`
  workspace = (
    await invoke<{ workspace_id: string }>(rpg.setup, owner, {
      setup_id: setupId,
      name: 'Synthetic campaign',
      character
    })
  ).workspace_id
  other = (
    await invoke<{ workspace_id: string }>(rpg.setup, outsider, {
      setup_id: randomUUID(),
      name: 'Other campaign',
      character
    })
  ).workspace_id
  await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${editor},'editor'),(${owner},${workspace},${viewer},'viewer')`
})
afterAll(async () => {
  vi.unstubAllGlobals()
  if (enabled) {
    for (const id of [workspace, other].filter(Boolean))
      await admin`delete from zillion_databases__workspaces where id=${id}`
    for (const id of [owner, editor, viewer, outsider])
      await admin`delete from users where id=${id}`
  }
  await Promise.all([client.end(), admin.end()])
})

describe.skipIf(!enabled)('uRPG persisted permissions and commands', () => {
  it('creates a dedicated workspace once and preserves existing character on setup retries', async () => {
    const result = await invoke<{ workspace_id: string }>(rpg.setup, owner, {
      setup_id: setupId,
      name: 'Retry must not replace',
      character: { ...character, name: 'Different' }
    })
    expect(result.workspace_id).toBe(workspace)
    expect((await snapshot()).character.name).toBe('Synthetic hero')
    const [row] =
      await admin`select enabled_modules,native_imported from zillion_databases__workspaces where id=${workspace}`
    expect(row!.enabled_modules).toEqual(['urpg'])
    expect(row!.native_imported).toBe(true)
  })
  it('shares reads with members and blocks outsider access and viewer writes', async () => {
    expect((await snapshot(viewer)).character).toEqual(character)
    await expect(snapshot(outsider)).rejects.toThrow()
    await expect(snapshot(owner, other)).rejects.toThrow()
    await expect(
      command(
        { type: 'vital', id: randomUUID(), kind: 'water', amount: 100 },
        viewer
      )
    ).rejects.toThrow()
    const changed = await command(
      { type: 'vital', id: randomUUID(), kind: 'water', amount: 250 },
      editor
    )
    expect(changed.vitals).toHaveLength(1)
    expect((await snapshot()).vitals[0]!.amount).toBe(250)
  })
  it('serializes concurrent completions and rejects stale revisions without duplicating XP', async () => {
    const id = randomUUID()
    const before = await command({
      type: 'item',
      id,
      value: {
        title: 'Write a page',
        kind: 'action',
        stat: 'CRFT',
        skillId: (await snapshot()).skills.find(s => s.stat === 'CRFT')!.id,
        parentId: null,
        difficulty: 'medium',
        baseXP: 100,
        due: null,
        notes: ''
      }
    })
    const responses = await Promise.allSettled([
      command(
        { type: 'complete', id, quality: 'strong' },
        owner,
        before.revision
      ),
      command(
        { type: 'complete', id, quality: 'strong' },
        editor,
        before.revision
      )
    ])
    expect(responses.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const after = await command({ type: 'complete', id, quality: 'strong' })
    expect(after.ledger.filter(e => e.itemId === id)).toHaveLength(1)
    expect(after.ledger[0]!.xp).toBe(187)
    expect((await snapshot(outsider, other)).ledger).toHaveLength(0)
  })
  it('preserves progress while disabled and rejects new writes', async () => {
    await admin`update zillion_databases__workspaces set enabled_modules='[]'::jsonb where id=${workspace}`
    expect((await snapshot()).ledger).toHaveLength(1)
    await expect(
      command({ type: 'vital', id: randomUUID(), kind: 'water', amount: 50 })
    ).rejects.toThrow(/Enable uRPG/)
    await admin`update zillion_databases__workspaces set enabled_modules='["urpg"]'::jsonb where id=${workspace}`
    expect((await snapshot()).ledger[0]!.xp).toBe(187)
  })
  it('validates uploaded images and dates before persistence', async () => {
    await expect(
      command({
        type: 'profile',
        value: { ...character, avatar: 'https://example.invalid/tracker.png' }
      })
    ).rejects.toThrow()
    await expect(
      command({
        type: 'encounter',
        id: randomUUID(),
        value: {
          title: 'Invalid day',
          day: '2026-02-30',
          minutes: 30,
          kind: 'focus',
          itemId: null
        }
      })
    ).rejects.toThrow()
  })
  it('persists habit checks, handles retries, and enforces workspace permissions', async () => {
    const id = randomUUID(),
      scope = { workspace_id: workspace }
    const update = (
      actor: string,
      expected_revision: number,
      command: unknown
    ) =>
      invoke<HabitState>(
        widgets.updateHabits,
        actor,
        { expected_revision, command },
        scope
      )
    await update(owner, 0, { type: 'create', id, title: 'Stretch' })
    await expect(
      update(viewer, 1, { type: 'check', id, day: '2026-10-15', checked: true })
    ).rejects.toThrow()
    const day = new Date().toISOString().slice(0, 10)
    const checked = await update(editor, 1, {
      type: 'check',
      id,
      day,
      checked: true
    })
    expect(checked.habits[0]!.days).toEqual([day])
    await expect(
      update(owner, 1, { type: 'check', id, day, checked: false })
    ).rejects.toThrow(/changed elsewhere/)
    await expect(
      invoke(widgets.habits, outsider, undefined, scope)
    ).rejects.toThrow()
    await expect(
      update(owner, 2, { type: 'check', id, day: '2099-10-15', checked: true })
    ).rejects.toThrow()
    expect(
      (await update(owner, 2, { type: 'check', id, day, checked: false }))
        .habits[0]!.days
    ).toEqual([])
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-14T10:30:00Z'))
    try {
      // In UTC+14 it is already October 15, so this is a legitimate today check.
      expect((await update(owner, 3, { type: 'check', id, day: '2026-10-15', checked: true })).habits[0]!.days).toEqual(['2026-10-15'])
      await expect(update(owner, 4, { type: 'check', id, day: '2026-10-16', checked: true })).rejects.toThrow()
    } finally { clock.mockRestore() }
  })
  it('labels missing market keys and isolates cached quotes by account', async () => {
    const query = { workspace_id: workspace, stocks: 'AAPL', coins: '' }
    const missing = await invoke<MarketQuote[]>(
      widgets.quotes,
      owner,
      undefined,
      query
    )
    expect(missing[0]!.error).toBe('finnhubKey')
    const fetchMock = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('finnhub')
              ? { c: 123.45, dp: 1.2, t: 1792000000 }
              : {
                  bitcoin: {
                    usd: 54321,
                    usd_24h_change: 2,
                    last_updated_at: 1792000000
                  }
                }
          ),
          { status: 200 }
        )
    )
    vi.stubGlobal('fetch', fetchMock)
    const quotes = await invoke<MarketQuote[]>(
      widgets.quotes,
      editor,
      undefined,
      { ...query, coins: 'bitcoin' },
      'synthetic-provider-key'
    )
    expect(quotes.map(q => q.price)).toEqual([54321, 123.45])
    expect(quotes.every(q => q.at === 1792000000)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await invoke(
      widgets.quotes,
      editor,
      undefined,
      { ...query, coins: 'bitcoin' },
      'synthetic-provider-key'
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      (await invoke<MarketQuote[]>(widgets.quotes, owner, undefined, query))[0]!
        .price
    ).toBeNull()
    vi.unstubAllGlobals()
  })
})
