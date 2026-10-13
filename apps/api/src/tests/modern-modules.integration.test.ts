import { getTableName, is, sql } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import jwt from 'jsonwebtoken'
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

const owner = randomUUID()
const otherOwner = randomUUID()
const run = randomUUID()

let admin: ReturnType<typeof postgres> | undefined
let client: ReturnType<typeof postgres> | undefined
let db: ReturnType<typeof drizzle>
let todo: typeof import('../../../../modules/lifeforge--todo-list/server/index').default
let ideas: typeof import('../../../../modules/lifeforge--idea-box/server/index').default
let calendar: typeof import('../../../../modules/lifeforge--calendar/server/index').default
let pomodoro: typeof import('../../../../modules/lifeforge--pomodoro-timer/server/index').default
let coding: typeof import('../../../../modules/lifeforge--code-time/server/index').default
let achievements: typeof import('../../../../modules/lifeforge--achievements/server/index').default
let wallet: typeof import('../../../../modules/lifeforge--wallet/server/index').default

class RejectedResponse extends Error {
  constructor(readonly result: { $status: number; payload?: unknown }) {
    super('Route returned a failed response')
  }
}

async function invoke(
  route: ForgeContract,
  module: string,
  query: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
  userId = owner
) {
  const endpoint = route.getValue()
  const parsedQuery = endpoint.schema.query?.parse(query)
  const parsedBody = endpoint.schema.body?.parse(body)

  try {
    return await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id', ${userId}, true)`
      )
      const scoped = scopeDbForModule(
        tx,
        ModuleRegistry.getModuleKeyMap(`lifeforge--${module}`)
      )
      await checkRecordExistence({
        db: scoped,
        querySchema: endpoint.schema.query,
        query: parsedQuery,
        bodySchema: endpoint.schema.body,
        body: parsedBody
      })

      const context = {
        db: scoped,
        query: parsedQuery,
        body: parsedBody,
        media: {},
        req: {},
        res: { locals: { userId } },
        io: {},
        core: { logging: { debug() {}, warn() {} }, media: {}, storage: {} }
      } as unknown as Parameters<typeof endpoint.callback>[0]

      const result = await endpoint.callback(context)

      if (result.$status >= 400) throw new RejectedResponse(result)

      return result
    })
  } catch (error) {
    if (error instanceof RejectedResponse) return error.result
    throw error
  }
}

const idOf = (result: { payload?: unknown }) =>
  z.object({ id: z.uuid() }).parse(result.payload).id
const rowsOf = (result: { payload?: unknown }) =>
  z.array(z.object({ id: z.uuid() }).passthrough()).parse(result.payload)

describe('modern modules against owner-isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_ADMIN_URL || !process.env.DATABASE_URL)
      throw new Error(
        'Configure the isolated local database before running module integration tests'
      )
    admin = postgres(process.env.DATABASE_ADMIN_URL, { max: 1, prepare: false })
    client = postgres(process.env.DATABASE_URL, { max: 2, prepare: false })
    const [role] =
      await client`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`
    expect(role).toMatchObject({ rolsuper: false, rolbypassrls: false })

    const load = async <T>(
      module: string,
      importer: () => Promise<{ default: T }>
    ) => {
      setLoadingModuleId(`lifeforge--${module}`)

      try {
        return (await importer()).default
      } finally {
        setLoadingModuleId(undefined)
      }
    }
    todo = await load(
      'todo-list',
      () => import('../../../../modules/lifeforge--todo-list/server/index')
    )
    ideas = await load(
      'idea-box',
      () => import('../../../../modules/lifeforge--idea-box/server/index')
    )
    calendar = await load(
      'calendar',
      () => import('../../../../modules/lifeforge--calendar/server/index')
    )
    pomodoro = await load(
      'pomodoro-timer',
      () => import('../../../../modules/lifeforge--pomodoro-timer/server/index')
    )
    coding = await load(
      'code-time',
      () => import('../../../../modules/lifeforge--code-time/server/index')
    )
    achievements = await load(
      'achievements',
      () => import('../../../../modules/lifeforge--achievements/server/index')
    )
    wallet = await load(
      'wallet',
      () => import('../../../../modules/lifeforge--wallet/server/index')
    )
    db = drizzle({
      client,
      relations: composeRelations(ModuleRegistry.schemaParts)
    })

    for (const id of [owner, otherOwner]) {
      await admin`insert into users (id, email, username, name) values (${id}, ${`${id}@example.invalid`}, ${id}, 'Synthetic module verification')`
    }
  })

  afterAll(async () => {
    if (admin) {
      const moduleTables = ModuleRegistry.schemaParts
        .filter(part => part.moduleId?.startsWith('lifeforge--'))
        .flatMap(part => Object.values(part.tables))

      for (const table of moduleTables.reverse()) {
        if (!is(table, PgTable)) continue
        await admin`delete from ${admin(getTableName(table))} where owner_id in (${owner}, ${otherOwner})`
      }
      await admin`delete from users where id in (${owner}, ${otherOwner})`
      await admin.end()
    }
    if (client) await client.end()
  })

  it('creates, updates, lists and deletes module organizing entities', async () => {
    const entities = [
      {
        module: 'todo-list',
        routes: todo.lists,
        input: { name: `List ${run}`, icon: 'tabler:list', color: '#ff8904' }
      },
      {
        module: 'idea-box',
        routes: ideas.containers,
        input: { name: `Ideas ${run}`, icon: 'tabler:bulb', color: '#ff8904' }
      },
      {
        module: 'calendar',
        routes: calendar.calendars,
        input: { name: `Calendar ${run}`, color: '#ff8904' }
      },
      {
        module: 'wallet',
        routes: wallet.assets,
        input: {
          name: `Asset ${run}`,
          icon: 'tabler:wallet',
          starting_balance: 100,
          is_liability: false,
          credit_limit: 0
        }
      }
    ]

    for (const entity of entities) {
      const created = await invoke(
        entity.routes.create,
        entity.module,
        {},
        entity.input
      )
      expect(created.$status).toBe(201)
      const id = idOf(created)
      expect(
        rowsOf(await invoke(entity.routes.list, entity.module)).some(
          row => row.id === id
        )
      ).toBe(true)
      expect(
        rowsOf(
          await invoke(entity.routes.list, entity.module, {}, {}, otherOwner)
        )
      ).toEqual([])
      expect(
        (
          await invoke(
            entity.routes.update,
            entity.module,
            { id },
            { ...entity.input, name: `Updated ${run}` }
          )
        ).$status
      ).toBe(200)
      expect(
        (await invoke(entity.routes.remove, entity.module, { id })).$status
      ).toBe(204)
      expect(
        rowsOf(await invoke(entity.routes.list, entity.module)).some(
          row => row.id === id
        )
      ).toBe(false)
    }
  })

  it('persists task edits, completion, search and owned references', async () => {
    const list = idOf(
      await invoke(
        todo.lists.create,
        'todo-list',
        {},
        { name: `Tasks ${run}`, icon: 'tabler:list', color: '#ff8904' }
      )
    )
    const task = idOf(
      await invoke(
        todo.entries.create,
        'todo-list',
        {},
        { summary: `Task ${run}`, list, priority: '', tags: [] }
      )
    )
    await expect(
      invoke(todo.entries.getById, 'todo-list', { id: task }, {}, otherOwner)
    ).rejects.toMatchObject({ code: 404 })
    await expect(
      invoke(
        todo.entries.create,
        'todo-list',
        {},
        { summary: 'Forbidden reference', list },
        otherOwner
      )
    ).rejects.toMatchObject({ code: 404 })
    expect(
      rowsOf(
        await invoke(todo.entries.list, 'todo-list', {
          query: 'cannot-match-this-task'
        })
      )
    ).toEqual([])
    expect(
      (
        await invoke(
          todo.entries.update,
          'todo-list',
          { id: task },
          { summary: `Updated ${run}`, list: '', priority: '', tags: [] }
        )
      ).$status
    ).toBe(200)
    expect(
      (await invoke(todo.entries.toggleEntry, 'todo-list', { id: task }))
        .payload
    ).toMatchObject({ done: true })
    expect(
      rowsOf(
        await invoke(todo.entries.list, 'todo-list', { status: 'completed' })
      )
    ).toHaveLength(1)
    await invoke(todo.entries.remove, 'todo-list', { id: task })
    await invoke(todo.lists.remove, 'todo-list', { id: list })
  })

  it('preserves idea subtype content and rejects cyclic or foreign folder paths', async () => {
    const input = {
      name: `Container ${run}`,
      icon: 'tabler:bulb',
      color: '#ff8904'
    }
    const container = idOf(
      await invoke(ideas.containers.create, 'idea-box', {}, input)
    )
    const second = idOf(
      await invoke(
        ideas.containers.create,
        'idea-box',
        {},
        { ...input, name: 'Other container' }
      )
    )
    const folder = idOf(
      await invoke(
        ideas.folders.create,
        'idea-box',
        {},
        {
          container,
          name: 'Parent',
          icon: 'tabler:folder',
          color: '#ff8904',
          parent: ''
        }
      )
    )
    const child = idOf(
      await invoke(
        ideas.folders.create,
        'idea-box',
        {},
        {
          container,
          parent: folder,
          name: 'Child',
          icon: 'tabler:folder',
          color: '#ff8904'
        }
      )
    )
    expect(
      (
        await invoke(
          ideas.folders.moveTo,
          'idea-box',
          { id: folder },
          { target: child }
        )
      ).$status
    ).toBe(400)
    expect(
      (
        await invoke(
          ideas.folders.create,
          'idea-box',
          {},
          {
            container: second,
            parent: folder,
            name: 'Wrong',
            icon: 'tabler:folder',
            color: '#ff8904'
          }
        )
      ).$status
    ).toBe(400)
    expect(
      (
        await invoke(
          ideas.ideas.create,
          'idea-box',
          {},
          { container, type: 'image', folder: '', tags: [] }
        )
      ).$status
    ).toBe(400)
    const idea = idOf(
      await invoke(
        ideas.ideas.create,
        'idea-box',
        {},
        { container, type: 'text', content: 'Original', folder: '', tags: [] }
      )
    )
    await invoke(
      ideas.ideas.update,
      'idea-box',
      { id: idea },
      { type: 'link', link: 'https://example.invalid/idea', tags: [] }
    )
    expect(
      (await invoke(ideas.ideas.list, 'idea-box', { container, path: '' }))
        .payload
    ).toMatchObject([{ type: 'link', link: 'https://example.invalid/idea' }])
    expect(
      rowsOf(
        await invoke(ideas.containers.list, 'idea-box', {}, {}, otherOwner)
      )
    ).toEqual([])
    await invoke(ideas.containers.remove, 'idea-box', { id: container })
    await invoke(ideas.containers.remove, 'idea-box', { id: second })
  })

  it('converts event types and rejects invalid recurrence without creating an orphan', async () => {
    const input = {
      title: `Event ${run}`,
      category: '',
      calendar: '',
      description: '',
      reference_link: '',
      type: 'single',
      start: '2026-10-12T10:00:00Z',
      end: '2026-10-12T11:00:00Z'
    }
    const event = idOf(
      await invoke(calendar.events.create, 'calendar', {}, input)
    )
    const recurring = {
      ...input,
      type: 'recurring',
      rrule:
        'DTSTART:20261012T100000Z\nRRULE:FREQ=DAILY;COUNT=2||duration_amt=1;duration_unit=hour'
    }
    await invoke(calendar.events.update, 'calendar', { id: event }, recurring)
    expect(
      (await invoke(calendar.events.getById, 'calendar', { id: event })).payload
    ).toMatchObject({ type: 'recurring' })
    await invoke(calendar.events.update, 'calendar', { id: event }, input)
    expect(
      (await invoke(calendar.events.getById, 'calendar', { id: event })).payload
    ).toMatchObject({ type: 'single' })
    expect(
      (
        await invoke(
          calendar.events.create,
          'calendar',
          {},
          { ...recurring, rrule: 'invalid' }
        )
      ).$status
    ).toBe(400)
    const range = await invoke(calendar.events.getByDateRange, 'calendar', {
      start: '2026-10-12',
      end: '2026-10-12'
    })
    expect(rowsOf(range)).toHaveLength(1)
    await expect(
      invoke(calendar.events.getById, 'calendar', { id: event }, {}, otherOwner)
    ).rejects.toMatchObject({ code: 404 })
    await invoke(calendar.events.remove, 'calendar', { id: event })
  })

  it('expands recurring events through the installed API with UTC instants and concurrent exceptions', async () => {
    const signingKey = process.env.JWT_SIGNING_KEY

    if (!signingKey) throw new Error('Configure the isolated API signing key')

    const service = 'http://127.0.0.1:3636'
    const headers = (subject: string) => ({
      Authorization:
        'Bearer ' +
        jwt.sign({}, signingKey, {
          algorithm: 'HS512',
          subject,
          expiresIn: '5m'
        })
    })
    const manifestResponse = await fetch(service + '/modules/manifest', {
      headers: headers(owner),
      signal: AbortSignal.timeout(5000)
    })
    expect(manifestResponse.status).toBe(200)
    const manifest = z
      .object({
        state: z.literal('success'),
        data: z.object({
          modules: z.array(z.object({ name: z.string(), remoteId: z.string() }))
        })
      })
      .parse(await manifestResponse.json())
    const installed = manifest.data.modules.find(module =>
      module.name.endsWith('lifeforge--calendar')
    )

    if (!installed)
      throw new Error('Calendar must be installed in the isolated API')

    const title = `Installed recurrence ${run}`
    const event = idOf(
      await invoke(
        calendar.events.create,
        'calendar',
        {},
        {
          title,
          category: '',
          calendar: '',
          description: '',
          reference_link: '',
          type: 'recurring',
          rrule:
            'DTSTART:20261012T100000Z\nRRULE:FREQ=DAILY;COUNT=2||duration_amt=1;duration_unit=hour'
        }
      )
    )
    const read = async (
      subject = owner,
      eventId = event,
      start = '2026-10-12',
      end = '2026-10-13'
    ) => {
      const response = await fetch(
        service +
          '/modules/' +
          installed.remoteId +
          '/events/getByDateRange?' +
          new URLSearchParams({ start, end }),
        {
          headers: headers(subject),
          signal: AbortSignal.timeout(5000)
        }
      )
      expect(response.status).toBe(200)
      const body = z
        .object({
          state: z.literal('success'),
          data: z.array(
            z
              .object({
                id: z.string(),
                title: z.string(),
                start: z.string(),
                end: z.string()
              })
              .passthrough()
          )
        })
        .parse(await response.json())

      return body.data.filter(item => item.id.startsWith(eventId + '-'))
    }
    expect((await read()).map(item => [item.start, item.end])).toEqual([
      ['2026-10-12T10:00:00.000Z', '2026-10-12T11:00:00.000Z'],
      ['2026-10-13T10:00:00.000Z', '2026-10-13T11:00:00.000Z']
    ])
    expect(await read(otherOwner)).toEqual([])
    const decisions = await Promise.all([
      invoke(calendar.events.addException, 'calendar', {
        id: event,
        date: '2026-10-12T10:00:00.000Z'
      }),
      invoke(calendar.events.addException, 'calendar', {
        id: event,
        date: '2026-10-12T06:00:00-04:00'
      })
    ])
    expect(decisions.map(result => result.payload).sort()).toEqual([
      false,
      true
    ])
    expect((await read()).map(item => item.start)).toEqual([
      '2026-10-13T10:00:00.000Z'
    ])
    await expect(
      invoke(calendar.events.addException, 'calendar', {
        id: event,
        date: 'invalid'
      })
    ).rejects.toThrow()
    await invoke(calendar.events.addException, 'calendar', {
      id: event,
      date: '2026-10-13 10:00:00'
    })
    expect(await read()).toEqual([])
    await invoke(calendar.events.remove, 'calendar', { id: event })
    const folded = idOf(
      await invoke(
        calendar.events.create,
        'calendar',
        {},
        {
          title: `Clock-change recurrence ${run}`,
          category: '',
          calendar: '',
          description: '',
          reference_link: '',
          type: 'recurring',
          rrule:
            'DTSTART:20261101T053000Z\nRRULE:FREQ=HOURLY;COUNT=2||duration_amt=30;duration_unit=minute'
        }
      )
    )
    const occurrences = await read(owner, folded, '2026-11-01', '2026-11-01')
    expect(occurrences.map(item => item.start)).toEqual([
      '2026-11-01T05:30:00.000Z',
      '2026-11-01T06:30:00.000Z'
    ])
    expect(new Set(occurrences.map(item => item.id)).size).toBe(2)
    await invoke(calendar.events.remove, 'calendar', { id: folded })
  })

  it('completes a pomodoro once even when completion is retried', async () => {
    const id = idOf(
      await invoke(
        pomodoro.sessions.create,
        'pomodoro-timer',
        {},
        {
          name: `Focus ${run}`,
          workDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          sessionUntilLongBreak: 4
        }
      )
    )
    await invoke(
      pomodoro.sessions.changeStatus,
      'pomodoro-timer',
      { id },
      { status: 'active' }
    )
    const completion = {
      status: 'completed',
      subSessions: [
        {
          type: 'work',
          durationElapsed: 1500,
          ended: '2026-10-12T10:25:00Z',
          isCompleted: true
        }
      ]
    }
    await Promise.all([
      invoke(
        pomodoro.sessions.changeStatus,
        'pomodoro-timer',
        { id },
        completion
      ),
      invoke(
        pomodoro.sessions.changeStatus,
        'pomodoro-timer',
        { id },
        completion
      )
    ])
    const retried = await invoke(
      pomodoro.sessions.changeStatus,
      'pomodoro-timer',
      { id },
      completion
    )
    expect(retried.payload).toMatchObject({
      status: 'completed',
      pomodoroCount: 1,
      totalTimeElapsed: 1500
    })
    expect(
      rowsOf(
        await invoke(
          pomodoro.sessions.list,
          'pomodoro-timer',
          {},
          {},
          otherOwner
        )
      )
    ).toEqual([])
    await invoke(pomodoro.sessions.remove, 'pomodoro-timer', { id })
  })

  it('requires authenticated coding integrations and deduplicates minute heartbeats', async () => {
    expect(coding.eventLog.getValue().noAuth).toBe(false)
    expect(coding.user.minutes.getValue().noAuth).toBe(false)
    expect(coding.readme.getValue().noAuth).toBe(false)
    const activity = {
      project: 'Synthetic',
      relativeFile: 'test.ts',
      language: 'TypeScript'
    }
    await Promise.all([
      invoke(coding.eventLog, 'code-time', {}, activity),
      invoke(coding.eventLog, 'code-time', {}, activity)
    ])
    expect(
      (await invoke(coding.getStatistics, 'code-time')).payload
    ).toMatchObject({ 'Total time spent': 1 })
    expect(
      (await invoke(coding.getStatistics, 'code-time', {}, {}, otherOwner))
        .payload
    ).toMatchObject({ 'Total time spent': 0 })
  })

  it('isolates achievements and permits the same category name for different users', async () => {
    const category = {
      name: `Shared name ${run}`,
      icon: 'tabler:trophy',
      color: '#ff8904'
    }
    await invoke(achievements.categories.create, 'achievements', {}, category)
    await invoke(
      achievements.categories.create,
      'achievements',
      {},
      category,
      otherOwner
    )
    const categoryId = rowsOf(
      await invoke(achievements.categories.list, 'achievements')
    )[0]?.id
    expect(categoryId).toBeDefined()
    await invoke(
      achievements.entries.create,
      'achievements',
      {},
      {
        title: `Achievement ${run}`,
        thoughts: 'Done',
        difficulty: 'easy',
        category: categoryId
      }
    )
    const id = rowsOf(
      await invoke(achievements.entries.list, 'achievements')
    )[0]?.id
    expect(id).toBeDefined()
    expect(
      rowsOf(
        await invoke(
          achievements.entries.list,
          'achievements',
          {},
          {},
          otherOwner
        )
      )
    ).toEqual([])
    await invoke(
      achievements.entries.update,
      'achievements',
      { id },
      {
        title: 'Updated achievement',
        thoughts: 'Edited',
        difficulty: 'medium',
        category: ''
      }
    )
    await invoke(achievements.entries.remove, 'achievements', { id })
  })

  it('saves wallet transactions, recalculates balances and protects owned assets', async () => {
    const asset = idOf(
      await invoke(
        wallet.assets.create,
        'wallet',
        {},
        {
          name: `Cash ${run}`,
          icon: 'tabler:wallet',
          starting_balance: 100,
          is_liability: false,
          credit_limit: 0
        }
      )
    )
    const input = {
      type: 'expenses',
      amount: 20,
      asset,
      category: '',
      platform: '',
      ledgers: [],
      particulars: 'Synthetic purchase',
      date: '2026-10-12T10:00:00Z'
    }
    const transaction = idOf(
      await invoke(wallet.transactions.create, 'wallet', {}, input)
    )
    expect((await invoke(wallet.assets.list, 'wallet')).payload).toMatchObject([
      { current_balance: 80 }
    ])
    await expect(
      invoke(wallet.transactions.create, 'wallet', {}, input, otherOwner)
    ).rejects.toMatchObject({ code: 404 })
    await invoke(
      wallet.transactions.update,
      'wallet',
      { id: transaction },
      { ...input, amount: 30 }
    )
    expect((await invoke(wallet.assets.list, 'wallet')).payload).toMatchObject([
      { current_balance: 70 }
    ])
    const reconnected = postgres(process.env.DATABASE_URL!, {
      max: 1,
      prepare: false
    })

    try {
      await reconnected.begin(async tx => {
        await tx`select set_config('zillion.user_id', ${owner}, true)`
        const [saved] =
          await tx`select amount from wallet__transactions where id = ${transaction}`
        expect(saved?.amount).toBe(30)
      })
    } finally {
      await reconnected.end()
    }
    await invoke(wallet.transactions.remove, 'wallet', { id: transaction })
    expect((await invoke(wallet.assets.list, 'wallet')).payload).toMatchObject([
      { current_balance: 100 }
    ])
    await invoke(wallet.assets.remove, 'wallet', { id: asset })
  })
})
