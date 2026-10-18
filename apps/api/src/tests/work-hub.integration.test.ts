import { hash } from 'bcryptjs'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import {
  type ScheduleRow,
  scheduleSchema
} from '../../../../modules/monolith--databases/calendarShared'
import { projectProgress } from '../../../../modules/monolith--databases/client/src/utils/projectRelations'
import * as calendar from '../../../../modules/monolith--databases/server/calendarRoutes'
import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as database from '../../../../modules/monolith--databases/server/workspaceDatabaseRoutes'
import * as workspaces from '../../../../modules/monolith--databases/server/workspaceRoutes'
import type {
  Base,
  RecordPage,
  Snapshot
} from '../../../../modules/monolith--databases/shared'

const enabled = process.env.MONOLITH_WORKSPACE_INTEGRATION === '1'

for (const value of enabled
  ? [process.env.DATABASE_URL!, process.env.DATABASE_ADMIN_URL!]
  : []) {
  const url = new URL(value)

  if (
    process.env.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/zillion_dev'
  )
    throw Error('Work hub tests require the isolated loopback database')
}

const client = postgres(
  enabled ? process.env.DATABASE_URL! : 'postgres://127.0.0.1:55432/disabled',
  { max: 2 }
)
const admin = postgres(
  enabled
    ? process.env.DATABASE_ADMIN_URL!
    : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner = randomUUID(),
  viewer = randomUUID()

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]

async function invoke<T>(
  route: EndpointContract,
  body?: unknown,
  query: Record<string, string> = {},
  actor = owner
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)

    return endpoint.callback({
      db: tx,
      res: { locals: { userId: actor } },
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query)
    } as unknown as Context)
  })

  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
let workspace: { id: string }, second: { id: string }

const scope = () => ({ workspace_id: workspace.id })
beforeAll(async () => {
  if (!enabled) return

  const password = await hash(randomUUID(), 4)

  for (const id of [owner, viewer])
    await admin`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Synthetic work hub account',${password})`
  workspace = await invoke(workspaces.create, {
    name: 'Work hub fixture',
    profile: 'collaborative',
    enabled_modules: ['databases', 'projects', 'todo-list', 'calendar']
  })
  second = await invoke(workspaces.create, {
    name: 'Isolated workspace',
    profile: 'collaborative',
    enabled_modules: ['databases']
  })
  await invoke(
    workspaces.setMember,
    { email: viewer + '@example.invalid', role: 'viewer' },
    scope()
  )
})
afterAll(async () => {
  if (enabled) await admin`delete from users where id in (${owner},${viewer})`
  await client.end()
  await admin.end()
})

describe.skipIf(!enabled)(
  'Project/action tables and contextual calendar editor',
  () => {
    it('creates actions for a project record across tables and rolls progress up from canonical records', async () => {
      const projects = await invoke<Base>(
        database.createBase,
        { name: 'Projects', table_type: 'project' },
        scope()
      )
      const actions = await invoke<Base>(
        database.createBase,
        { name: 'Actions', table_type: 'action' },
        scope()
      )
      const project = await invoke<RecordPage>(
        database.createRecord,
        {
          base_id: projects.id,
          title: 'Untoldedness',
          content: '',
          values: {}
        },
        scope()
      )
      expect(project.item_type).toBe('project')
      const action = await invoke<RecordPage>(
        database.createRecord,
        {
          base_id: actions.id,
          title: 'Write the outline',
          project_id: project.id,
          content: '',
          values: {}
        },
        scope()
      )
      expect(action.item_type).toBe('task')
      expect(action.project_id).toBe(project.id)
      let snapshot = await invoke<Snapshot>(
        database.snapshot,
        undefined,
        scope()
      )
      expect(projectProgress(project.id, snapshot.records)).toMatchObject({
        total: 1,
        completed: 0,
        percent: 0
      })
      await invoke(
        database.updateRecord,
        { expected_updated: action.updated, done: true, status: 'done' },
        { ...scope(), id: action.id }
      )
      snapshot = await invoke<Snapshot>(database.snapshot, undefined, scope())
      expect(projectProgress(project.id, snapshot.records)).toMatchObject({
        total: 1,
        completed: 1,
        percent: 100
      })
      expect(
        snapshot.bases.find(row => row.id === projects.id)?.table_type
      ).toBe('project')
      await expect(
        invoke(
          database.createRecord,
          {
            base_id: actions.id,
            title: 'Invalid table target',
            project_id: projects.id,
            content: '',
            values: {}
          },
          scope()
        )
      ).rejects.toThrow()
      const foreignBase = await invoke<Base>(
        database.createBase,
        { name: 'Other projects', table_type: 'project' },
        { workspace_id: second.id }
      )
      const foreignProject = await invoke<RecordPage>(
        database.createRecord,
        { base_id: foreignBase.id, title: 'Private', content: '', values: {} },
        { workspace_id: second.id }
      )
      await expect(
        invoke(
          database.createRecord,
          {
            base_id: actions.id,
            title: 'Invalid workspace',
            project_id: foreignProject.id,
            content: '',
            values: {}
          },
          scope()
        )
      ).rejects.toThrow()
      await expect(
        invoke(
          database.updateRecord,
          { done: false },
          { ...scope(), id: action.id },
          viewer
        )
      ).rejects.toThrow()
    })
    it('promotes existing generic pages when Table Type changes without rewriting explicit tasks', async () => {
      const base = await invoke<Base>(
        database.createBase,
        { name: 'Existing table' },
        scope()
      )
      const page = await invoke<RecordPage>(
        database.createRecord,
        {
          base_id: base.id,
          title: 'Existing page',
          content: 'Keep this text',
          values: {}
        },
        scope()
      )
      const task = await invoke<RecordPage>(
        database.createRecord,
        {
          base_id: base.id,
          title: 'Explicit task',
          item_type: 'task',
          content: '',
          values: {}
        },
        scope()
      )
      await invoke(
        database.updateBase,
        { name: base.name, table_type: 'project' },
        { ...scope(), id: base.id }
      )
      const snapshot = await invoke<Snapshot>(
        database.snapshot,
        undefined,
        scope()
      )
      expect(snapshot.records.find(row => row.id === page.id)).toMatchObject({
        item_type: 'project',
        content: 'Keep this text'
      })
      expect(snapshot.records.find(row => row.id === task.id)?.item_type).toBe(
        'task'
      )
      await invoke(
        database.updateBase,
        { name: base.name, table_type: 'general' },
        { ...scope(), id: base.id }
      )
      expect(
        (
          await invoke<Snapshot>(database.snapshot, undefined, scope())
        ).bases.find(row => row.id === base.id)?.table_type
      ).toBe('general')
    })
    it('saves title, description and time atomically and rejects stale edits', async () => {
      const base = await invoke<Base>(
        database.createBase,
        { name: 'Events', table_type: 'event' },
        scope()
      )
      const event = await invoke<RecordPage>(
        database.createRecord,
        {
          base_id: base.id,
          title: 'Review',
          content: '',
          values: {},
          date: '2026-10-20T09:00:00.000Z',
          end_date: '2026-10-20T10:00:00.000Z'
        },
        scope()
      )
      const body = {
        expected_updated: event.updated,
        title: 'Project review',
        description: 'Discuss the outline',
        time_zone: 'Asia/Baku',
        start_field: 'date',
        end_field: 'end_date',
        start: '2026-10-20T10:00:00.000Z',
        end: '2026-10-20T11:30:00.000Z'
      }
      await invoke(calendar.edit, body, { ...scope(), record_id: event.id })
      const after = (
        await invoke<Snapshot>(database.snapshot, undefined, scope())
      ).records.find(row => row.id === event.id)!
      expect(after).toMatchObject({
        title: body.title,
        description: body.description,
        date: body.start,
        end_date: body.end
      })
      await expect(
        invoke(
          calendar.edit,
          { ...body, title: 'Stale edit' },
          { ...scope(), record_id: event.id }
        )
      ).rejects.toThrow()
      expect(
        (
          await invoke<Snapshot>(database.snapshot, undefined, scope())
        ).records.find(row => row.id === event.id)?.title
      ).toBe(body.title)
      const schedule = await invoke<ScheduleRow>(
        calendar.save,
        {
          expected_revision: 0,
          settings: scheduleSchema.parse({
            time_zone: 'Asia/Baku',
            attendees: [viewer],
            recurrence: { frequency: 'weekly', interval: 1, weekdays: [2] }
          })
        },
        { ...scope(), record_id: event.id }
      )
      const latest = (
        await invoke<Snapshot>(database.snapshot, undefined, scope())
      ).records.find(row => row.id === event.id)!
      const recurring = {
        ...body,
        expected_updated: latest.updated,
        title: 'Weekly review',
        start: '2026-10-27T11:00:00.000Z',
        end: '2026-10-27T12:30:00.000Z',
        occurrence: {
          expected_revision: schedule.revision,
          original: '2026-10-27T10:00:00.000Z'
        }
      }
      await invoke(calendar.edit, recurring, {
        ...scope(),
        record_id: event.id
      })
      const updated = (
        await invoke<Snapshot>(database.snapshot, undefined, scope())
      ).records.find(row => row.id === event.id)!
      expect(updated.title).toBe('Weekly review')
      expect(updated.date).toBe(body.start)
      const changes =
        await admin`select title from zillion_databases__calendar_notifications where record_id=${event.id} and kind='changed'`
      expect(changes).toHaveLength(1)
      expect(changes[0]?.title).toBe('Weekly review')
      await expect(
        invoke(
          calendar.edit,
          {
            ...recurring,
            expected_updated: updated.updated,
            title: 'Rejected stale series'
          },
          { ...scope(), record_id: event.id }
        )
      ).rejects.toThrow()
      expect(
        (
          await invoke<Snapshot>(database.snapshot, undefined, scope())
        ).records.find(row => row.id === event.id)?.title
      ).toBe('Weekly review')
    })
  }
)
