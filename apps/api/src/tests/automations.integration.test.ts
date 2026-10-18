import type { EndpointContract } from '@monolith/server-utils'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as routes from '../../../../modules/monolith--automations/server/routes'
import { runDueWorkflow } from '../../../../modules/monolith--automations/server/scheduler'
import {
  type Run,
  type Workflow,
  starterGraph
} from '../../../../modules/monolith--automations/shared'
import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as workspaces from '../../../../modules/monolith--databases/server/workspaceRoutes'

const enabled = process.env.MONOLITH_AUTOMATIONS_INTEGRATION === '1'
for (const connection of enabled
  ? [process.env.DATABASE_URL!, process.env.DATABASE_ADMIN_URL!]
  : []) {
  const url = new URL(connection)
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '55432' ||
    !['/zillion_dev', '/monolith_dev'].includes(url.pathname)
  )
    throw Error('Use the isolated local database')
}
const client = postgres(
    enabled ? process.env.DATABASE_URL! : 'postgres://127.0.0.1/disabled',
    { max: 2 }
  ),
  admin = postgres(
    enabled ? process.env.DATABASE_ADMIN_URL! : 'postgres://127.0.0.1/disabled',
    { max: 1 }
  )
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner = randomUUID(),
  editor = randomUUID(),
  viewer = randomUUID(),
  outsider = randomUUID()
let workspace = '',
  other = '',
  flow: Workflow
type Context = Parameters<ReturnType<EndpointContract['getValue']>['callback']>[0]
async function invoke<T>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query),
      res: { locals: { userId: actor } }
    } as unknown as Context)
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
beforeAll(async () => {
  if (!enabled) return
  for (const id of [owner, editor, viewer, outsider])
    await admin`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Automation test')`
  workspace = (
    await invoke<{ id: string }>(workspaces.create, owner, {
      name: 'Automation test',
      profile: 'collaborative',
      enabled_modules: ['automations']
    })
  ).id
  other = (
    await invoke<{ id: string }>(workspaces.create, outsider, {
      name: 'Private automation test',
      profile: 'personal',
      enabled_modules: ['automations']
    })
  ).id
  for (const [id, role] of [
    [editor, 'editor'],
    [viewer, 'viewer']
  ])
    await invoke(
      workspaces.setMember,
      owner,
      { email: id + '@example.invalid', role },
      { workspace_id: workspace }
    )
  flow = await invoke<Workflow>(
    routes.create,
    editor,
    {
      title: 'Test workflow',
      description: '',
      graph: starterGraph(),
      interval_minutes: 0
    },
    { workspace_id: workspace }
  )
})
afterAll(async () => {
  if (enabled) {
    await admin`delete from zillion_databases__workspaces where id in (${workspace || null},${other || null})`
    await admin`delete from users where id in (${owner},${editor},${viewer},${outsider})`
  }
  await client.end()
  await admin.end()
})
describe.skipIf(!enabled)('Automations workspace integration', () => {
  it('lists shared workflows for viewers', async () =>
    expect(
      (
        await invoke<Workflow[]>(routes.list, viewer, undefined, {
          workspace_id: workspace
        })
      ).map(w => w.id)
    ).toContain(flow.id))
  it('rejects outsider reads and cross-workspace execution', async () => {
    await expect(
      invoke(routes.list, outsider, undefined, { workspace_id: workspace })
    ).rejects.toThrow()
    await expect(
      invoke(
        routes.run,
        outsider,
        { input: {}, trigger: 'manual', expected_revision: 1 },
        { workspace_id: other, id: flow.id }
      )
    ).rejects.toThrow()
  })
  it('rejects viewer writes and runs', async () => {
    await expect(
      invoke(
        routes.run,
        viewer,
        { input: {}, expected_revision: 1 },
        { workspace_id: workspace, id: flow.id }
      )
    ).rejects.toThrow()
    await expect(
      invoke(
        routes.save,
        viewer,
        { ...flow, expected_revision: 1 },
        { workspace_id: workspace, id: flow.id }
      )
    ).rejects.toThrow()
  })
  it('runs a saved revision and retains node traces', async () => {
    const run = await invoke<Run>(
      routes.run,
      editor,
      { input: { test: true }, expected_revision: 1 },
      { workspace_id: workspace, id: flow.id }
    )
    expect(run.status).toBe('success')
    expect(run.output[0]).toEqual({
      test: true,
      message: 'Hello from Monolith'
    })
    expect(
      (
        await invoke<Run[]>(routes.history, viewer, undefined, {
          workspace_id: workspace,
          id: flow.id
        })
      )[0]?.id
    ).toBe(run.id)
  })
  it('rejects paused event runs and stale writes', async () => {
    await expect(
      invoke(
        routes.run,
        owner,
        { input: {}, trigger: 'event', expected_revision: 1 },
        { workspace_id: workspace, id: flow.id }
      )
    ).rejects.toThrow('paused')
    const saved = await invoke<Workflow>(
      routes.save,
      editor,
      { ...flow, title: 'Updated', expected_revision: 1, enabled: true },
      { workspace_id: workspace, id: flow.id }
    )
    expect(saved.revision).toBe(2)
    await expect(
      invoke(
        routes.save,
        editor,
        { ...flow, expected_revision: 1 },
        { workspace_id: workspace, id: flow.id }
      )
    ).rejects.toThrow('changed')
    await expect(
      invoke(
        routes.run,
        editor,
        { input: {}, expected_revision: 1 },
        { workspace_id: workspace, id: flow.id }
      )
    ).rejects.toThrow('latest')
  })
  it('claims a due schedule once, respects its owner and ignores disabled addons', async () => {
    await admin`update automations__workflows set interval_minutes=5, next_run=now()-interval '1 hour' where id=${flow.id}`
    const signal = new AbortController().signal
    expect(await runDueWorkflow(client, outsider, signal)).toBeNull()
    expect(await runDueWorkflow(client, owner, signal)).toBe('success')
    expect(await runDueWorkflow(client, owner, signal)).toBeNull()
    const [run] =
      await admin`select trigger,revision from automations__runs where workflow_id=${flow.id} order by started desc limit 1`
    expect(run).toMatchObject({ trigger: 'schedule', revision: 2 })
    await admin`update zillion_databases__workspaces set enabled_modules='[]'::jsonb where id=${workspace}`
    await admin`update automations__workflows set next_run=now()-interval '1 hour' where id=${flow.id}`
    expect(await runDueWorkflow(client, owner, signal)).toBeNull()
  })
  it('enforces row isolation outside route handlers', async () => {
    await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id',${outsider},true)`
      )
      expect(
        await tx.execute(
          sql`select id from automations__workflows where id=${flow.id}`
        )
      ).toHaveLength(0)
    })
    await expect(
      db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id',${viewer},true)`
        )
        await tx.execute(
          sql`insert into automations__workflows(owner_id,workspace_id,title,graph) values(${owner},${workspace},'Forbidden','{}'::jsonb)`
        )
      })
    ).rejects.toThrow()
  })
})
