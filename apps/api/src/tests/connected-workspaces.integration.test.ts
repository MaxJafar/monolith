import { hash } from 'bcryptjs'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createHash, randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type CanvasPage,
  parseContent,
  serializeDocument
} from '@lifeforge/blocks'
import { type ForgeContract, observeMutation } from '@lifeforge/server-utils'

import * as agentRoutes from '../../../../modules/zillion--agents/server/routes'
import { scopeAgentRoutes } from '../../../../modules/zillion--agents/server/workspaceScope'
import * as databaseRoutes from '../../../../modules/zillion--databases/server/routes'
import {
  relations,
  tables
} from '../../../../modules/zillion--databases/server/schema.drizzle'
import * as sharedRoutes from '../../../../modules/zillion--databases/server/workspaceDatabaseRoutes'
import * as graphRoutes from '../../../../modules/zillion--databases/server/workspaceGraphRoutes'
import * as workspaceRoutes from '../../../../modules/zillion--databases/server/workspaceRoutes'
import type {
  RecordPage,
  Snapshot
} from '../../../../modules/zillion--databases/shared'
import type { Workspace } from '../../../../modules/zillion--databases/workspaceShared'

const enabled = process.env.MONOLITH_WORKSPACE_INTEGRATION === '1'
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
      throw Error('Workspace fixtures require the isolated loopback database')
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
const accounts = [randomUUID(), randomUUID(), randomUUID()] as const
const password = `Synthetic-${randomUUID()}!`
type Context = Parameters<ReturnType<ForgeContract['getValue']>['callback']>[0]
async function invoke<T>(
  route: ForgeContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {}
) {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    const scope =
      query.workspace_id ??
      (body as { workspace_id?: string } | undefined)?.workspace_id
    await observeMutation({
      db: tx,
      userId: actor,
      moduleId: 'zillion--databases',
      phase: 'before',
      workspaceId: scope
    })
    const result = await endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } }
    } as unknown as Context)
    if (result.$status >= 400) throw Error(`Rejected ${result.$status}`)
    await observeMutation({
      db: tx,
      userId: actor,
      moduleId: 'zillion--databases',
      workspaceId: scope
    })
    return result
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
async function native<T>(
  actor: string,
  callback: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    await observeMutation({
      db: tx,
      userId: actor,
      moduleId: 'lifeforge--todo-list',
      phase: 'before'
    })
    const result = await callback(tx)
    await observeMutation({
      db: tx,
      userId: actor,
      moduleId: 'lifeforge--todo-list'
    })
    return result
  })
}
let workspace: Workspace,
  base: { id: string },
  item: RecordPage & { item_type: string; done: boolean; date: string | null },
  todoId: string

beforeAll(async () => {
  if (!enabled) return
  const encrypted = await hash(password, 4)
  for (const id of accounts)
    await admin`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Synthetic workspace member',${encrypted})`
})
afterAll(async () => {
  if (enabled)
    for (const id of accounts) {
      for (const table of [
        'projects__tasks',
        'projects__columns',
        'projects__entries',
        'notes__entries',
        'notes__subjects',
        'notes__workspaces',
        'calendar__events',
        'todo_list__entries',
        'blog__entries'
      ])
        await admin.unsafe(`delete from "${table}" where owner_id=$1`, [id])
      await admin`delete from zillion_agents__activity where owner_id=${id}`
      await admin`delete from zillion_agents__principals where owner_id=${id}`
      await admin`delete from monolith_native_changes where owner_id=${id}`
      await admin`delete from auth__refresh_tokens where user_id=${id}`
      await admin`delete from users where id=${id}`
    }
  await Promise.all([client.end(), admin.end()])
})

describe.skipIf(!enabled)('Connected workspace transactions and access', () => {
  it('creates configurable workspaces and exposes them only to members', async () => {
    const personal = await invoke<Workspace[]>(
      workspaceRoutes.list,
      accounts[0]!
    )
    expect(personal).toHaveLength(1)
    workspace = await invoke<Workspace>(workspaceRoutes.create, accounts[0]!, {
      name: 'Collaborative fixture',
      profile: 'collaborative',
      enabled_modules: [
        'projects',
        'notes',
        'calendar',
        'todo-list',
        'databases'
      ]
    })
    await invoke(
      workspaceRoutes.setMember,
      accounts[0]!,
      { email: accounts[1] + '@example.invalid', role: 'editor' },
      { workspace_id: workspace.id }
    )
    expect(
      (await invoke<Workspace[]>(workspaceRoutes.list, accounts[1]!)).find(
        row => row.id === workspace.id
      )?.role
    ).toBe('editor')
    expect(
      (await invoke<Workspace[]>(workspaceRoutes.list, accounts[2]!)).some(
        row => row.id === workspace.id
      )
    ).toBe(false)
    base = await invoke(
      sharedRoutes.createBase,
      accounts[1]!,
      { name: 'Shared items' },
      { workspace_id: workspace.id }
    )
  })
  it('creates a typed task in the database and changes it from native To-Do', async () => {
    item = await invoke(
      sharedRoutes.createRecord,
      accounts[1]!,
      {
        base_id: base.id,
        title: 'One shared task',
        item_type: 'task',
        content: 'Original',
        date: '2026-10-13T09:00:00.000Z'
      },
      { workspace_id: workspace.id }
    )
    const [ref] =
      await admin`select native_id from zillion_databases__record_sources where record_id=${item.id} and kind='todo'`
    todoId = ref!.native_id
    expect(
      (
        await admin`select summary,notes from todo_list__entries where id=${todoId}`
      )[0]
    ).toMatchObject({ summary: 'One shared task', notes: 'Original' })
    await native(accounts[0]!, async tx => {
      await tx.execute(
        sql`update todo_list__entries set summary='Edited in To-Do',done=true where id=${todoId}`
      )
    })
    const state = await invoke<Snapshot>(
      sharedRoutes.snapshot,
      accounts[1]!,
      undefined,
      { workspace_id: workspace.id }
    )
    const changed = state.records.find(row => row.id === item.id) as typeof item
    expect(changed).toMatchObject({
      title: 'Edited in To-Do',
      done: true,
      item_type: 'task'
    })
    item = changed
  })
  it('changes item type without changing identity and preserves existing native fields', async () => {
    item = await invoke(
      sharedRoutes.updateRecord,
      accounts[1]!,
      {
        title: 'Now a note',
        content: 'Retained content',
        values: {},
        item_type: 'note',
        expected_updated: item.updated
      },
      { workspace_id: workspace.id, id: item.id }
    )
    expect(item.item_type).toBe('note')
    expect(
      (await admin`select id from todo_list__entries where id=${todoId}`).length
    ).toBe(0)
    const [ref] =
      await admin`select native_id from zillion_databases__record_sources where record_id=${item.id} and kind='note'`
    expect(
      (
        await admin`select name,content from notes__entries where id=${ref!.native_id}`
      )[0]
    ).toMatchObject({ name: 'Now a note', content: 'Retained content' })
    await native(accounts[0]!, async tx => {
      await tx.execute(
        sql`delete from notes__entries where id=${ref!.native_id}`
      )
    })
    expect(
      (
        await invoke<Snapshot>(sharedRoutes.snapshot, accounts[1]!, undefined, {
          workspace_id: workspace.id
        })
      ).records.some(row => row.id === item.id)
    ).toBe(false)
  })
  it('rejects outsider access and viewer writes, including raw RLS page deletes', async () => {
    await expect(
      invoke(sharedRoutes.snapshot, accounts[2]!, undefined, {
        workspace_id: workspace.id
      })
    ).rejects.toThrow('Workspace not found')
    await invoke(
      workspaceRoutes.setMember,
      accounts[0]!,
      { email: accounts[1] + '@example.invalid', role: 'viewer' },
      { workspace_id: workspace.id }
    )
    await expect(
      invoke(
        sharedRoutes.createRecord,
        accounts[1]!,
        { base_id: base.id, title: 'Denied', item_type: 'task' },
        { workspace_id: workspace.id }
      )
    ).rejects.toThrow('read-only')
    const page = await invoke<{ id: string; revision: number }>(
      workspaceRoutes.createPage,
      accounts[0]!,
      { title: 'Private edits' },
      { workspace_id: workspace.id }
    )
    await native(accounts[1]!, async tx => {
      const removed = await tx.execute(
        sql`delete from zillion_databases__workspace_pages where id=${page.id} returning id`
      )
      expect(removed).toHaveLength(0)
    })
    expect(
      (
        await invoke<{ page: { id: string } }>(
          workspaceRoutes.getPage,
          accounts[1]!,
          undefined,
          { id: page.id }
        )
      ).page.id
    ).toBe(page.id)
  })
  it('does not expose the owner private databases through shared record IDs', async () => {
    await invoke(
      workspaceRoutes.setMember,
      accounts[0]!,
      { email: accounts[1] + '@example.invalid', role: 'editor' },
      { workspace_id: workspace.id }
    )
    const privateBase = await invoke<{ id: string }>(
      databaseRoutes.createBase,
      accounts[0]!,
      { name: 'Owner private' }
    )
    const privateItem = await invoke<RecordPage>(
      databaseRoutes.createRecord,
      accounts[0]!,
      { base_id: privateBase.id, title: 'Owner secret' }
    )
    await expect(
      invoke(
        sharedRoutes.updateRecord,
        accounts[1]!,
        { title: 'Intrusion', content: '', values: {} },
        { workspace_id: workspace.id, id: privateItem.id }
      )
    ).rejects.toThrow('Database not found in this workspace')
    expect(
      (
        await invoke<Snapshot>(sharedRoutes.snapshot, accounts[1]!, undefined, {
          workspace_id: workspace.id
        })
      ).bases.some(row => row.id === privateBase.id)
    ).toBe(false)
  })
  it('mirrors native task creation and deletion', async () => {
    const id = randomUUID()
    await native(accounts[2]!, async tx => {
      await tx.execute(
        sql`insert into todo_list__entries(id,owner_id,summary,notes) values(${id},${accounts[2]},'Native first','Native content')`
      )
    })
    const state = await invoke<Snapshot>(databaseRoutes.snapshot, accounts[2]!)
    expect(
      state.records.filter(row => row.title === 'Native first')
    ).toHaveLength(1)
    await native(accounts[2]!, async tx => {
      await tx.execute(sql`delete from todo_list__entries where id=${id}`)
    })
    expect(
      (
        await invoke<Snapshot>(databaseRoutes.snapshot, accounts[2]!)
      ).records.some(row => row.title === 'Native first')
    ).toBe(false)
  })
  it('keeps a project task and To-Do in sync, then detaches it when the project is removed', async () => {
    await invoke(
      sharedRoutes.createView,
      accounts[0]!,
      {
        base_id: base.id,
        name: 'Canonical completion',
        mode: 'kanban',
        config: { group_property: 'done' }
      },
      { workspace_id: workspace.id }
    )
    const project = await invoke<RecordPage>(
      sharedRoutes.createRecord,
      accounts[0]!,
      { base_id: base.id, title: 'Linked project', item_type: 'project' },
      { workspace_id: workspace.id }
    )
    const task = await invoke<RecordPage>(
      sharedRoutes.createRecord,
      accounts[0]!,
      {
        base_id: base.id,
        title: 'Linked task',
        item_type: 'task',
        project_id: project.id
      },
      { workspace_id: workspace.id }
    )
    const refs =
      await admin`select kind,native_id from zillion_databases__record_sources where record_id=${task.id}`
    expect(refs.map(ref => ref.kind).sort()).toEqual(['project-task', 'todo'])
    const taskId = refs.find(ref => ref.kind === 'project-task')!.native_id
    const todo = refs.find(ref => ref.kind === 'todo')!.native_id
    await native(accounts[0]!, async tx => {
      await tx.execute(
        sql`update projects__tasks set title='Completed in project',completed=true where id=${taskId}`
      )
    })
    expect(
      (
        await admin`select summary,done from todo_list__entries where id=${todo}`
      )[0]
    ).toMatchObject({ summary: 'Completed in project', done: true })
    await invoke(sharedRoutes.removeRecord, accounts[0]!, undefined, {
      workspace_id: workspace.id,
      id: project.id
    })
    expect(
      (
        await invoke<Snapshot>(sharedRoutes.snapshot, accounts[0]!, undefined, {
          workspace_id: workspace.id
        })
      ).records.find(row => row.id === task.id)
    ).toMatchObject({ done: true, project_id: null })
    expect(
      (await admin`select id from todo_list__entries where id=${todo}`).length
    ).toBe(1)
    expect(
      (await admin`select id from projects__tasks where id=${taskId}`).length
    ).toBe(0)
  })
  it('preserves native long titles and rejects incompatible type changes atomically', async () => {
    const id = randomUUID(),
      title = 'Long native task '.repeat(40)
    await native(accounts[2]!, async tx => {
      await tx.execute(
        sql`insert into todo_list__entries(id,owner_id,summary,notes) values(${id},${accounts[2]},${title},'Original')`
      )
    })
    const current = (
      await invoke<Snapshot>(databaseRoutes.snapshot, accounts[2]!)
    ).records.find(row => row.title === title)!
    expect(current.title).toBe(title)
    await expect(
      invoke(
        databaseRoutes.updateRecord,
        accounts[2]!,
        {
          title,
          content: 'Rejected',
          values: {},
          item_type: 'note',
          expected_updated: current.updated
        },
        { id: current.id }
      )
    ).rejects.toThrow('255 characters')
    expect(
      (
        await admin`select summary,notes from todo_list__entries where id=${id}`
      )[0]
    ).toMatchObject({ summary: title, notes: 'Original' })
  })
  it('shares structured Blog content while preserving native publishing properties', async () => {
    const content = serializeDocument(parseContent('Structured post content'))
    const post = await invoke<RecordPage>(
      sharedRoutes.createRecord,
      accounts[0]!,
      {
        base_id: base.id,
        title: 'Block post fixture',
        item_type: 'post',
        content
      },
      { workspace_id: workspace.id }
    )
    const [ref] =
      await admin`select native_id from zillion_databases__record_sources where record_id=${post.id} and kind='post'`
    expect(
      (
        await admin`select content,visibility from blog__entries where id=${ref!.native_id}`
      )[0]
    ).toMatchObject({ content, visibility: 'private' })
    const edited = serializeDocument(parseContent('Native block edit'))
    await native(accounts[0]!, async tx => {
      await tx.execute(
        sql`update blog__entries set content=${edited},excerpt='Preserved excerpt',labels='Work' where id=${ref!.native_id}`
      )
    })
    const current = (
      await invoke<Snapshot>(sharedRoutes.snapshot, accounts[0]!, undefined, {
        workspace_id: workspace.id
      })
    ).records.find(record => record.id === post.id)!
    expect(current.content).toBe(edited)
    await invoke(
      sharedRoutes.updateRecord,
      accounts[0]!,
      {
        title: 'Renamed block post',
        content: edited,
        values: {},
        expected_updated: current.updated
      },
      { workspace_id: workspace.id, id: post.id }
    )
    expect(
      (
        await admin`select excerpt,labels,visibility from blog__entries where id=${ref!.native_id}`
      )[0]
    ).toMatchObject({
      excerpt: 'Preserved excerpt',
      labels: 'Work',
      visibility: 'private'
    })
  })
  it('uses canonical dates in calendar views and preserves native event metadata', async () => {
    const event = await invoke<RecordPage>(
      sharedRoutes.createRecord,
      accounts[0]!,
      {
        base_id: base.id,
        title: 'Scheduled event',
        item_type: 'event',
        date: '2026-10-13T09:00:00.000Z',
        end_date: '2026-10-13T10:00:00.000Z'
      },
      { workspace_id: workspace.id }
    )
    const [ref] =
      await admin`select native_id from zillion_databases__record_sources where record_id=${event.id} and kind='event'`
    await native(accounts[0]!, async tx => {
      await tx.execute(
        sql`update calendar__events set location='Preserved location' where id=${ref!.native_id}`
      )
      await tx.execute(
        sql`update calendar__events_single set start='2026-10-14 09:00:00',"end"='2026-10-14 10:00:00' where base_event=${ref!.native_id}`
      )
    })
    const current = (
      await invoke<Snapshot>(sharedRoutes.snapshot, accounts[0]!, undefined, {
        workspace_id: workspace.id
      })
    ).records.find(row => row.id === event.id)!
    expect(current.date).toBe('2026-10-14T09:00:00.000Z')
    await invoke(
      sharedRoutes.updateRecord,
      accounts[0]!,
      {
        title: 'Renamed event',
        content: '',
        values: {},
        expected_updated: current.updated
      },
      { workspace_id: workspace.id, id: event.id }
    )
    expect(
      (
        await admin`select location from calendar__events where id=${ref!.native_id}`
      )[0]!.location
    ).toBe('Preserved location')
    await invoke(
      sharedRoutes.createView,
      accounts[0]!,
      {
        base_id: base.id,
        name: 'Events',
        mode: 'calendar',
        config: {
          date_field_id: 'date',
          end_date_field_id: 'end_date',
          filters: [
            { field_id: 'item_type', operator: 'equals', value: 'event' }
          ]
        }
      },
      { workspace_id: workspace.id }
    )
    const feed = await invoke<{ items: { record_id: string }[] }>(
      databaseRoutes.calendarFeed,
      accounts[0]!
    )
    expect(feed.items.some(row => row.record_id === event.id)).toBe(true)
    await expect(
      invoke(
        sharedRoutes.updateRecord,
        accounts[0]!,
        {
          title: 'Invalid range',
          content: '',
          values: {},
          date: '2026-10-15T12:00:00.000Z',
          end_date: '2026-10-14T12:00:00.000Z'
        },
        { workspace_id: workspace.id, id: event.id }
      )
    ).rejects.toThrow('End date')
  })
  it('keeps page links stable, validates hierarchy and protects stale revisions', async () => {
    const parent = await invoke<{
      id: string
      body: CanvasPage
      revision: number
    }>(
      workspaceRoutes.createPage,
      accounts[0]!,
      { title: 'Parent fixture' },
      { workspace_id: workspace.id }
    )
    const child = await invoke<{
      id: string
      body: CanvasPage
      revision: number
    }>(
      workspaceRoutes.createPage,
      accounts[0]!,
      { title: 'Child fixture', parent_id: parent.id },
      { workspace_id: workspace.id }
    )
    const target = await invoke<RecordPage>(
      sharedRoutes.createRecord,
      accounts[0]!,
      { base_id: base.id, title: 'Wiki target', item_type: 'note' },
      { workspace_id: workspace.id }
    )
    const body = {
      ...child.body,
      blocks: child.body.blocks.map(block => ({
        ...block,
        content: serializeDocument(parseContent('[[Wiki target]]'))
      }))
    }
    const saved = await invoke<{ body: CanvasPage; revision: number }>(
      workspaceRoutes.savePage,
      accounts[0]!,
      {
        id: child.id,
        workspace_id: workspace.id,
        parent_id: parent.id,
        page: body,
        expected_revision: child.revision
      }
    )
    expect(saved.body.blocks[0]!.content).toContain(target.id)
    await expect(
      invoke(workspaceRoutes.savePage, accounts[0]!, {
        id: parent.id,
        workspace_id: workspace.id,
        parent_id: child.id,
        page: parent.body,
        expected_revision: parent.revision
      })
    ).rejects.toThrow('contain themselves')
    await expect(
      invoke(workspaceRoutes.savePage, accounts[0]!, {
        id: child.id,
        workspace_id: workspace.id,
        parent_id: parent.id,
        page: body,
        expected_revision: child.revision
      })
    ).rejects.toThrow('changed elsewhere')
    const graph = await invoke<{
      nodes: { id: string }[]
      edges: { source: string; target: string; kind: string }[]
    }>(graphRoutes.snapshot, accounts[0]!, undefined, {
      workspace_id: workspace.id
    })
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        source: `document:${child.id}`,
        target: `record:${target.id}`,
        kind: 'mention'
      })
    )
    expect(graph.nodes.filter(node => node.id === target.id)).toHaveLength(1)
  })
  it('drains committed background native changes before a canonical read', async () => {
    const id = randomUUID()
    await admin`insert into todo_list__entries(id,owner_id,summary,notes) values(${id},${accounts[2]},'Background native item','Journal fixture')`
    expect(
      (
        await invoke<Snapshot>(databaseRoutes.snapshot, accounts[2]!)
      ).records.filter(row => row.title === 'Background native item')
    ).toHaveLength(1)
    expect(
      (
        await admin`select id from monolith_native_changes where owner_id=${accounts[2]}`
      ).length
    ).toBe(0)
  })
  it('isolates Agent projects and tasks in their configured workspace', async () => {
    const routes = scopeAgentRoutes(agentRoutes)
    const space = await invoke<Workspace>(
      workspaceRoutes.create,
      accounts[2]!,
      {
        name: 'Agent fixture',
        profile: 'agents',
        enabled_modules: ['agents', 'databases']
      }
    )
    const other = await invoke<Workspace>(
      workspaceRoutes.create,
      accounts[2]!,
      {
        name: 'Other Agent fixture',
        profile: 'agents',
        enabled_modules: ['agents', 'databases']
      }
    )
    const project = await invoke<{ id: string }>(
      routes.project.create,
      accounts[2]!,
      { name: 'Scoped agent project', description: '' },
      { workspace_id: space.id }
    )
    const task = await invoke<{ id: string }>(
      routes.work.create,
      accounts[2]!,
      { project_id: project.id, title: 'Scoped agent task', content: '' },
      { workspace_id: space.id }
    )
    const state = await invoke<Snapshot>(
      sharedRoutes.snapshot,
      accounts[2]!,
      undefined,
      { workspace_id: space.id }
    )
    expect(
      state.records.filter(row =>
        ['Scoped agent project', 'Scoped agent task'].includes(row.title)
      )
    ).toHaveLength(2)
    const snapshot = await invoke<{
      projects: { id: string }[]
      tasks: { task_id: string }[]
    }>(routes.snapshot, accounts[2]!, undefined, { workspace_id: space.id })
    expect(snapshot.projects.some(row => row.id === project.id)).toBe(true)
    expect(snapshot.tasks.some(row => row.task_id === task.id)).toBe(true)
    expect(
      (
        await invoke<{ projects: { id: string }[] }>(
          routes.snapshot,
          accounts[2]!,
          undefined,
          { workspace_id: other.id }
        )
      ).projects
    ).toHaveLength(0)
    await expect(
      invoke(
        routes.work.create,
        accounts[2]!,
        { project_id: project.id, title: 'Cross-workspace task', content: '' },
        { workspace_id: other.id }
      )
    ).rejects.toThrow('Project not found in this workspace')
  })
  it('synchronizes through the real authenticated HTTP controller', async () => {
    const host = 'http://127.0.0.1:3636'
    const login = await fetch(`${host}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: accounts[2] + '@example.invalid',
        password
      })
    })
    expect(login.status).toBe(200)
    const token = (await login.json()).data.accessToken
    const remote = (name: string) =>
      createHash('sha256').update(`@lifeforge/${name}`).digest('hex')
    async function request(module: string, path: string, body?: unknown) {
      const response = await fetch(
        `${host}/modules/${remote(module)}/${path}`,
        {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body === undefined
              ? {}
              : { 'Content-Type': 'application/json' })
          },
          body: body === undefined ? undefined : JSON.stringify(body)
        }
      )
      expect(response.status).toBeLessThan(400)
      if (response.status === 204) return null
      return (await response.json()).data
    }
    const entry = await request('lifeforge--todo-list', 'entries/create', {
      summary: 'HTTP bridge fixture',
      notes: 'Through the native controller'
    })
    const snapshot = (await request(
      'zillion--databases',
      'snapshot'
    )) as Snapshot
    const record = snapshot.records.find(
      item => item.title === 'HTTP bridge fixture'
    )
    expect(record?.item_type).toBe('task')
    await request('zillion--databases', `updateRecord?id=${record!.id}`, {
      title: 'Changed through database HTTP',
      content: 'Kept in sync',
      values: {}
    })
    const [native] =
      await admin`select summary,notes from todo_list__entries where id=${entry.id}`
    expect(native).toMatchObject({
      summary: 'Changed through database HTTP',
      notes: 'Kept in sync'
    })
    await request('lifeforge--todo-list', `entries/remove?id=${entry.id}`, {})
    expect(
      (
        (await request('zillion--databases', 'snapshot')) as Snapshot
      ).records.some(item => item.id === record!.id)
    ).toBe(false)
  })
})
