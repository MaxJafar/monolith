// SPDX-License-Identifier: 0BSD
import { PGlite } from '@electric-sql/pglite'
import {
  generateDrizzleJson,
  generateMigration
} from 'drizzle-kit/api-postgres'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import * as work from '../../../../modules/monolith--agents/server/workSchema'
import {
  type ScheduleRow,
  expandCalendarRecord,
  scheduleSchema
} from '../../../../modules/monolith--databases/calendarShared'
import * as calendar from '../../../../modules/monolith--databases/server/calendarRoutes'
import {
  drainNativeChanges,
  removeItemFromModules
} from '../../../../modules/monolith--databases/server/itemBridge'
import * as schema from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as database from '../../../../modules/monolith--databases/server/workspaceDatabaseRoutes'
import type { RecordPage } from '../../../../modules/monolith--databases/shared'

const owner = randomUUID(),
  viewer = randomUUID(),
  stranger = randomUUID()
let pg: PGlite
let db: ReturnType<typeof drizzle>
let workspace: string
// Adapt execute's driver envelope only; all queries run in the actual PGlite engine.
function postgresResults<T extends object>(target: T): T {
  return new Proxy(target, {
    get(object, key) {
      const value = Reflect.get(object, key)
      if (typeof value !== 'function') return value
      if (key === 'execute')
        return async (...args: unknown[]) =>
          (await value.apply(object, args)).rows
      if (key === 'transaction')
        return (action: (tx: T) => unknown) =>
          value.call(object, (tx: T) => action(postgresResults(tx)))
      return typeof value === 'function' ? value.bind(object) : value
    }
  })
}
type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
async function invoke<T>(
  route: EndpointContract,
  body?: unknown,
  query: Record<string, string> = {},
  user = owner
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(
      sql.raw("select set_config('zillion.user_id','" + user + "',true)")
    )
    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse({
        workspace_id: workspace,
        ...query
      }),
      res: { locals: { userId: user } }
    } as unknown as Context)
  })
  return JSON.parse(JSON.stringify(result.payload)) as T
}
async function base(type: 'project' | 'action' | 'event' | 'general') {
  return invoke<{ id: string }>(database.createBase, {
    name: type,
    table_type: type
  })
}
async function record(base: string, input: Record<string, unknown>) {
  return invoke<RecordPage>(database.createRecord, {
    base_id: base,
    title: 'Native item',
    content: '',
    values: {},
    ...input
  })
}
beforeAll(async () => {
  pg = new PGlite()
  db = postgresResults(drizzle({ client: pg }))
  const statements = await generateMigration(
    await generateDrizzleJson({}),
    await generateDrizzleJson(schema.tables)
  )
  for (const statement of statements) await pg.exec(statement)
  await pg.exec(
    "create table users(id uuid primary key, name text, username text, email text, workspace_pages jsonb not null default '{}')"
  )
  for (const id of [owner, viewer, stranger])
    await pg.query(
      'insert into users(id,name,username,email) values($1,$2,$2,$3)',
      [id, 'Test owner', id + '@example.invalid']
    )
  const [created] = await db
    .insert(schema.workspaces)
    .values({ owner_id: owner, name: 'Native workspace', is_default: true })
    .returning()
  workspace = created!.id
  await db.insert(schema.workspaceMembers).values({
    owner_id: owner,
    workspace_id: workspace,
    user_id: viewer,
    role: 'viewer'
  })
}, 60000)
afterAll(async () => {
  await pg?.close()
})

describe('native workspace with retired addon tables absent', () => {
  it('creates and edits journal entries without Blog or Notes', async () => {
    const journal = await base('general')
    const entry = await record(journal.id, {
      title: 'A new chapter',
      item_type: 'post',
      tags: ['journal'],
      date: '2026-10-21T12:00:00Z'
    })
    const saved = await invoke<RecordPage>(
      database.updateRecord,
      { title: 'Remember this', expected_updated: entry.updated },
      { id: entry.id }
    )
    expect(saved.id).toBe(entry.id)
    expect(saved.item_type).toBe('post')
    expect(saved.title).toBe('Remember this')
    await expect(
      invoke(
        database.updateRecord,
        { title: 'Stale edit', expected_updated: entry.updated },
        { id: entry.id }
      )
    ).rejects.toThrow('changed elsewhere')
    const tables = await pg.query<{ name: string }>(
      "select tablename as name from pg_tables where schemaname='public'"
    )
    expect(
      tables.rows.some(row =>
        /^(blog|notes|calendar|projects|todo_list)__/.test(row.name)
      )
    ).toBe(false)
  })
  it('creates native projects with linked actions without Agents installed', async () => {
    const projects = await base('project'),
      actions = await base('action')
    const project = await record(projects.id, {
      title: 'Untoldedness',
      item_type: 'project'
    })
    const task = await record(actions.id, {
      title: 'First action',
      item_type: 'task',
      project_id: project.id
    })
    expect(task.project_id).toBe(project.id)
    const completed = await invoke<RecordPage>(
      database.updateRecord,
      { done: true, expected_updated: task.updated },
      { id: task.id }
    )
    expect(completed.done).toBe(true)
    expect(completed.project_id).toBe(project.id)
    const snapshot = await invoke<{ records: RecordPage[] }>(database.snapshot)
    expect(snapshot.records.find(row => row.id === task.id)?.done).toBe(true)
  })
  it('saves recurring events, moves one occurrence and rejects stale calendar updates', async () => {
    const events = await base('event')
    const event = await record(events.id, {
      title: 'Planning',
      item_type: 'event',
      date: '2026-10-21T10:00:00Z',
      end_date: '2026-10-21T11:00:00Z'
    })
    const settings = scheduleSchema.parse({
      time_zone: 'UTC',
      recurrence: { frequency: 'weekly', count: 3 },
      reminders: []
    })
    const scheduled = await invoke<ScheduleRow>(
      calendar.save,
      { expected_revision: 0, settings },
      { record_id: event.id }
    )
    const moved = await invoke<ScheduleRow>(
      calendar.occurrence,
      {
        expected_revision: scheduled.revision,
        original: '2026-10-28T10:00:00.000Z',
        change: {
          start: '2026-10-28T12:00:00.000Z',
          end: '2026-10-28T14:00:00.000Z'
        }
      },
      { record_id: event.id }
    )
    const occurrences = expandCalendarRecord(
      event,
      '2026-10-21T00:00:00Z',
      '2026-11-10T00:00:00Z',
      [],
      moved
    )
    expect(occurrences).toHaveLength(3)
    expect(occurrences[1]?.start).toBe('2026-10-28T12:00:00.000Z')
    expect(occurrences[1]?.end).toBe('2026-10-28T14:00:00.000Z')
    await expect(
      invoke(
        calendar.save,
        { expected_revision: 1, settings },
        { record_id: event.id }
      )
    ).rejects.toThrow('changed elsewhere')
  })
  it('enforces workspace viewing and editing permissions', async () => {
    await expect(
      invoke(database.createBase, { name: 'Denied' }, {}, viewer)
    ).rejects.toThrow('read-only')
    await expect(
      invoke(database.snapshot, undefined, {}, stranger)
    ).rejects.toThrow('not found')
  })
})
describe('optional Agents work queue integration', () => {
  beforeAll(async () => {
    const statements = await generateMigration(
      await generateDrizzleJson({}),
      await generateDrizzleJson(work)
    )
    for (const statement of statements) await pg.exec(statement)
    for (const statement of schema.databaseMigrations) await pg.exec(statement)
  }, 60000)
  it('mirrors project tasks into the custom queue and imports completion back', async () => {
    const projects = await base('project'),
      actions = await base('action')
    const project = await record(projects.id, {
      title: 'Agent project',
      item_type: 'project'
    })
    const task = await record(actions.id, {
      title: 'Agent action',
      item_type: 'task',
      project_id: project.id
    })
    const [source] = await db
      .select()
      .from(schema.recordSources)
      .where(eq(schema.recordSources.record_id, task.id))
    expect(source?.kind).toBe('project-task')
    await db.transaction(async tx => {
      await tx
        .update(work.tasks)
        .set({ completed: true })
        .where(eq(work.tasks.id, source!.native_id))
      await drainNativeChanges(tx as never, owner)
    })
    const [updated] = await db
      .select()
      .from(schema.records)
      .where(eq(schema.records.id, task.id))
    expect(updated!.done).toBe(true)
    expect(updated!.project_id).toBe(project.id)
  })
  it('removes a project queue without deleting the native actions', async () => {
    const projects = await base('project'),
      actions = await base('action')
    const project = await record(projects.id, {
      title: 'Archived project',
      item_type: 'project'
    })
    const task = await record(actions.id, {
      title: 'Keep this action',
      item_type: 'task',
      project_id: project.id
    })
    const [stored] = await db
      .select()
      .from(schema.records)
      .where(eq(schema.records.id, project.id))
    await db.transaction(tx => removeItemFromModules(tx as never, stored!))
    const [child] = await db
      .select()
      .from(schema.records)
      .where(eq(schema.records.id, task.id))
    expect(child?.title).toBe('Keep this action')
    expect(child?.project_id).toBeNull()
  })
  it('rejects actions linked to another workspace even for the same owner', async () => {
    const projects = await base('project'),
      actions = await base('action')
    const project = await record(projects.id, {
      title: 'Private project',
      item_type: 'project'
    })
    const [otherWorkspace] = await db
      .insert(schema.workspaces)
      .values({ owner_id: owner, name: 'Other' })
      .returning()
    await db
      .update(schema.bases)
      .set({ workspace_id: otherWorkspace!.id })
      .where(eq(schema.bases.id, projects.id))
    await expect(
      record(actions.id, { item_type: 'task', project_id: project.id })
    ).rejects.toThrow(/another workspace|not found/)
  })
})
