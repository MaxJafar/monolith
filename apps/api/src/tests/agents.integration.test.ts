import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveAddonIdentity } from '@monolith/configs/node'
import type { EndpointContract } from '@monolith/server-utils'

import {
  authenticateAgent,
  hashSecret
} from '../../../../modules/monolith--agents/server/auth'
import * as routes from '../../../../modules/monolith--agents/server/routes'
import * as runtime from '../../../../modules/monolith--agents/server/runtime'
import {
  activity,
  assignments,
  contextLinks,
  credentials,
  dependencies,
  members,
  principals,
  relations,
  runs,
  tables,
  usageRecords
} from '../../../../modules/monolith--agents/server/schema.drizzle'
import type { Database } from '../../../../modules/monolith--agents/server/store'
import {
  entries as projects,
  tasks
} from '../../../../modules/monolith--agents/server/workSchema'
import type {
  AgentSnapshot,
  Principal,
  Run
} from '../../../../modules/monolith--agents/shared'
import { documents } from '../../../../modules/monolith--databases/server/schema.drizzle'
import {
  AgentRuntimeClient,
  type ClaimedWork,
  WorkerExecutionError,
  openAIProvider,
  runWorkerOnce
} from '../../../../tools/src/monolith/agentWorker'
import { registerRoutes } from '../core/functions/routes/compileRoutes'
import authMiddleware from '../core/middlewares/authMiddleware'

const enabled = process.env.ZILLION_INTEGRATION === '1',
  connection = process.env.DATABASE_URL ?? ''

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
      'Agent tests require an isolated local Monolith database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 6, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner: string = randomUUID(),
  other: string = randomUUID()

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
type Identity = { principalId: string; credentialId: string }

async function owned<T>(
  user: string,
  job: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id', ${user}, true)`)

    return job(tx)
  })
}

async function invoke<T>(
  route: EndpointContract,
  body?: unknown,
  query: Record<string, string> = {},
  user = owner,
  identity?: Identity
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body),
    parsedQuery = endpoint.schema.query?.parse(query)
  const result = await owned(user, tx =>
    endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: {
        locals: {
          userId: user,
          ...(identity ? { actorType: 'agent', ...identity } : {})
        }
      }
    } as unknown as Context)
  )

  return result.payload == null
    ? (undefined as T)
    : (JSON.parse(JSON.stringify(result.payload)) as T)
}

const snap = (user = owner) =>
  invoke<AgentSnapshot>(routes.snapshot, undefined, {}, user)
const profile = (id: string, user = owner) =>
  snap(user).then(s => s.principals.find(p => p.id === id)!)

async function fixture({
  adapter = 'external',
  budget = 100,
  role = 'contributor',
  user = owner
}: {
  adapter?: Principal['adapter']
  budget?: number
  role?: Principal['role']
  user?: string
} = {}) {
  await snap(user)
  const person = await invoke<{ id: string }>(
    routes.people.create,
    {
      name: 'Fixture worker',
      role,
      adapter,
      reports_to: user,
      instructions: 'Produce evidence for review',
      budget_cents: budget
    },
    {},
    user
  )
  const project = await invoke<{ id: string }>(
    routes.project.create,
    {
      name: 'Fixture project',
      description: 'Isolated agent integration fixture'
    },
    {},
    user
  )
  await invoke(
    routes.project.membership,
    { project_id: project.id, principal_id: person.id, role: 'contributor' },
    {},
    user
  )
  const task = await invoke<{ id: string }>(
    routes.work.create,
    {
      project_id: project.id,
      title: 'Fixture task',
      content: 'Verify the connected workflow'
    },
    {},
    user
  )

  if (role !== 'observer')
    await invoke(
      routes.work.assign,
      {
        assignee_id: person.id,
        priority: 'high',
        blockers: [],
        context: [],
        expected_revision: 1
      },
      { id: task.id },
      user
    )

  const key =
    adapter !== 'planner'
      ? await invoke<{ id: string; token: string }>(
          routes.accessKeys.create,
          { principal_id: person.id, name: 'Fixture key', days: 1 },
          {},
          user
        )
      : null

  return {
    person,
    project,
    task,
    key,
    identity: key ? { principalId: person.id, credentialId: key.id } : undefined
  }
}

async function enqueue(
  f: Awaited<ReturnType<typeof fixture>>,
  cost = 10,
  key = randomUUID()
) {
  const row = (await snap()).tasks.find(t => t.task_id === f.task.id)!

  return invoke<Run>(
    routes.run.queue,
    {
      expected_revision: row.revision,
      request_key: key,
      estimated_cents: cost
    },
    { id: f.task.id }
  )
}

async function claim(f: Awaited<ReturnType<typeof fixture>>, run: Run) {
  return invoke<ClaimedWork>(
    runtime.claim,
    undefined,
    { id: run.id },
    owner,
    f.identity
  )
}

async function updatePerson(
  id: string,
  updates: Partial<Principal> & { expected_revision?: number }
) {
  const p = await profile(id)

  return invoke(
    routes.people.update,
    {
      name: p.name,
      role: p.role,
      adapter: p.adapter,
      reports_to: p.reports_to,
      instructions: p.instructions,
      budget_cents: p.budget_cents,
      status: p.status,
      expected_revision: p.revision,
      ...updates
    },
    { id }
  )
}

const app = express()
app.use(express.json())
app.use((req, _res, next) => {
  req.db = db
  next()
})
app.use('/modules/monolith--agents/runtime', registerRoutes(runtime))
app.use(
  '/modules/' +
    resolveAddonIdentity({ name: '@monolith/agents' }).remoteId +
    '/runtime',
  registerRoutes(runtime)
)
app.use('/user/me', authMiddleware(false), (_req, res) =>
  res.json({ state: 'success', data: {} })
)
app.use(
  '/modules/monolith--agents/accessKeys/create',
  authMiddleware(false),
  (_req, res) => res.json({ state: 'success', data: {} })
)
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(500).json({ state: 'error', message: err.message })
  }
)
const server = createServer(app)

let origin = ''
beforeAll(async () => {
  if (!enabled) return
  for (const id of [owner, other])
    await client`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic agent workspace owner')`
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address()

  if (!address || typeof address === 'string')
    throw new Error('No agent test port')
  origin = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  if (enabled)
    for (const user of [owner, other])
      await owned(user, async tx => {
        await tx.delete(activity).where(eq(activity.owner_id, user))
        await tx.delete(projects).where(eq(projects.owner_id, user))
        await tx.delete(documents).where(eq(documents.owner_id, user))
        await tx.delete(credentials).where(eq(credentials.owner_id, user))
        await tx.delete(members).where(eq(members.owner_id, user))
        await tx.delete(usageRecords).where(eq(usageRecords.owner_id, user))
        await tx.delete(principals).where(eq(principals.owner_id, user))
        await tx.execute(
          sql`delete from todo_list__entries where owner_id=${user}`
        )
        await tx.execute(
          sql`delete from monolith_native_changes where owner_id=${user}`
        )
        await tx.execute(sql`delete from users where id=${user}`)
      })
  if (server.listening)
    await new Promise<void>((done, reject) =>
      server.close(error => (error ? reject(error) : done()))
    )
  await client.end()
})

describe.skipIf(!enabled)(
  'Agent principals, shared tasks and leased execution',
  () => {
    it('keeps all eleven agent tables under forced owner RLS', async () => {
      const result =
        await client`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname like 'zillion_agents__%' and relkind='r'`
      expect(result).toHaveLength(11)
      expect(result.every(r => r.relrowsecurity && r.relforcerowsecurity)).toBe(
        true
      )
      const a = await fixture(),
        b = await fixture({ user: other })
      expect((await snap()).principals.some(p => p.id === b.person.id)).toBe(
        false
      )
      expect((await snap(other)).tasks.some(t => t.task_id === a.task.id)).toBe(
        false
      )
      await expect(
        invoke(
          routes.work.assign,
          {
            assignee_id: b.person.id,
            priority: 'medium',
            blockers: [],
            context: [],
            expected_revision: 2
          },
          { id: a.task.id }
        )
      ).rejects.toMatchObject({ code: 404 })
    })
    it('bootstraps the real owner as the one human principal without creating auth users', async () => {
      const s = await snap()
      expect(s.principals.filter(p => p.kind === 'human')).toEqual([
        expect.objectContaining({ id: owner, role: 'lead' })
      ])
      await expect(
        updatePerson(owner, { name: 'Changed owner' })
      ).rejects.toMatchObject({ code: 403 })
    })
    it('protects agent revisions and reporting lines against concurrent cycles', async () => {
      const a = await fixture(),
        b = await fixture()
      const pa = await profile(a.person.id)
      await updatePerson(a.person.id, { reports_to: b.person.id })
      await expect(
        updatePerson(b.person.id, { reports_to: a.person.id })
      ).rejects.toMatchObject({ code: 409 })
      await expect(
        updatePerson(a.person.id, { expected_revision: pa.revision })
      ).rejects.toMatchObject({ code: 409 })
      const x = await fixture(),
        y = await fixture()
      const results = await Promise.allSettled([
        updatePerson(x.person.id, { reports_to: y.person.id }),
        updatePerson(y.person.id, { reports_to: x.person.id })
      ])
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    })
    it('requires project contributor access and prevents observer execution', async () => {
      const f = await fixture()
      await invoke(routes.project.membership, {
        project_id: f.project.id,
        principal_id: f.person.id,
        role: 'observer'
      })
      await expect(enqueue(f)).rejects.toMatchObject({ code: 403 })
      const observer = await fixture({ role: 'observer' })
      await expect(
        invoke(
          routes.work.assign,
          {
            assignee_id: observer.person.id,
            priority: 'medium',
            context: [],
            blockers: [],
            expected_revision: 1
          },
          { id: observer.task.id }
        )
      ).rejects.toMatchObject({ code: 403 })
    })
    it('uses shared Projects tasks and rejects dependency cycles and cross-project blockers', async () => {
      const f = await fixture(),
        g = await fixture()
      const blocker = await invoke<{ id: string }>(routes.work.create, {
        project_id: f.project.id,
        title: 'Dependency',
        content: ''
      })
      await invoke(
        routes.work.assign,
        {
          assignee_id: f.person.id,
          priority: 'high',
          context: [],
          blockers: [blocker.id],
          expected_revision: 2
        },
        { id: f.task.id }
      )
      await expect(enqueue(f)).rejects.toMatchObject({ code: 409 })
      await expect(
        invoke(
          routes.work.assign,
          {
            assignee_id: owner,
            priority: 'medium',
            context: [],
            blockers: [f.task.id],
            expected_revision: 1
          },
          { id: blocker.id }
        )
      ).rejects.toMatchObject({ code: 400 })
      await expect(
        invoke(
          routes.work.assign,
          {
            assignee_id: f.person.id,
            priority: 'medium',
            context: [],
            blockers: [g.task.id],
            expected_revision: 3
          },
          { id: f.task.id }
        )
      ).rejects.toMatchObject({ code: 400 })
      await owned(owner, tx =>
        tx
          .update(tasks)
          .set({ completed: true })
          .where(eq(tasks.id, blocker.id))
      )
      expect((await enqueue(f)).status).toBe('queued')
    })
    it('deduplicates dispatch retries and serializes competing budget reservations', async () => {
      const f = await fixture({ budget: 10 }),
        key = randomUUID()
      const r = await enqueue(f, 7, key),
        retry = await enqueue(f, 7, key)
      expect(retry.id).toBe(r.id)
      await expect(enqueue(f, 8, key)).rejects.toMatchObject({ code: 409 })
      const g = await invoke<{ id: string }>(routes.work.create, {
        project_id: f.project.id,
        title: 'Second reserved task',
        content: ''
      })
      await invoke(
        routes.work.assign,
        {
          assignee_id: f.person.id,
          priority: 'medium',
          context: [],
          blockers: [],
          expected_revision: 1
        },
        { id: g.id }
      )
      await expect(enqueue({ ...f, task: g }, 4)).rejects.toMatchObject({
        code: 409
      })
      expect(
        (await snap()).usage.find(u => u.principal_id === f.person.id)
          ?.reserved_cents
      ).toBe(7)
      await invoke(routes.run.cancel, undefined, { id: r.id })
      const competing = await Promise.allSettled([
        enqueue(f, 7),
        enqueue({ ...f, task: g }, 7)
      ])
      expect(
        competing.filter(result => result.status === 'fulfilled')
      ).toHaveLength(1)
      expect(
        (await snap()).usage.find(u => u.principal_id === f.person.id)
          ?.reserved_cents
      ).toBe(7)
    })
    it('admits exactly one worker claim and binds heartbeats to its credential and lease', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      const results = await Promise.allSettled([claim(f, r), claim(f, r)])
      expect(results.filter(v => v.status === 'fulfilled')).toHaveLength(1)
      const work = (
        results.find(
          v => v.status === 'fulfilled'
        ) as PromiseFulfilledResult<ClaimedWork>
      ).value
      await expect(
        invoke(
          runtime.heartbeat,
          { lease: 'x'.repeat(43) },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 409 })
      const second = await invoke<{ id: string }>(routes.accessKeys.create, {
        principal_id: f.person.id,
        name: 'Other process',
        days: 1
      })
      await expect(
        invoke(runtime.heartbeat, { lease: work.lease }, { id: r.id }, owner, {
          principalId: f.person.id,
          credentialId: second.id
        })
      ).rejects.toMatchObject({ code: 409 })
      const heartbeat = await invoke<{ lease_expires: string }>(
        runtime.heartbeat,
        { lease: work.lease },
        { id: r.id },
        owner,
        f.identity
      )
      expect(new Date(heartbeat.lease_expires).getTime()).toBeGreaterThan(
        Date.now()
      )
    })
    it('submits results for review and only human approval completes the original task', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      await invoke(
        runtime.complete,
        { lease: c.lease, result: 'Verified result', cost_cents: 4 },
        { id: r.id },
        owner,
        f.identity
      )
      expect(
        (await snap()).tasks.find(t => t.task_id === f.task.id)
      ).toMatchObject({ status: 'review', completed: false })
      await expect(
        invoke(
          routes.run.review,
          { approve: true, note: '' },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 403 })
      await invoke(
        routes.run.review,
        { approve: true, note: 'Evidence accepted' },
        { id: r.id }
      )
      const s = await snap()
      expect(s.tasks.find(t => t.task_id === f.task.id)).toMatchObject({
        status: 'done',
        completed: true
      })
      expect(s.runs.find(t => t.id === r.id)?.status).toBe('approved')
      expect(
        s.activity.some(
          e =>
            e.run_id === r.id &&
            e.actor_id === f.person.id &&
            e.action === 'run.review_requested'
        )
      ).toBe(true)
      expect(s.usage.find(u => u.principal_id === f.person.id)).toMatchObject({
        spent_cents: 4,
        reserved_cents: 0
      })
      await expect(
        invoke(routes.run.review, { approve: false, note: '' }, { id: r.id })
      ).rejects.toMatchObject({ code: 409 })
    })
    it('retains cost and feedback after rejection and allows an explicit new attempt', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      await invoke(
        runtime.complete,
        { lease: c.lease, result: 'Needs more evidence', cost_cents: 3 },
        { id: r.id },
        owner,
        f.identity
      )
      await invoke(
        routes.run.review,
        { approve: false, note: 'Add a reproducible check' },
        { id: r.id }
      )
      expect(
        (await snap()).tasks.find(t => t.task_id === f.task.id)
      ).toMatchObject({ status: 'blocked', completed: false })
      expect((await enqueue(f)).id).not.toBe(r.id)
    })
    it('rejects costs above reservation without accepting a partial result', async () => {
      const f = await fixture(),
        r = await enqueue(f, 2),
        c = await claim(f, r)
      await expect(
        invoke(
          runtime.complete,
          { lease: c.lease, result: 'Too costly', cost_cents: 3 },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 400 })
      expect((await snap()).runs.find(t => t.id === r.id)).toMatchObject({
        status: 'running',
        result: '',
        cost_cents: 0
      })
    })
    it('revokes credentials immediately, cancels held runs and hides credential hashes', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      expect(
        await authenticateAgent(db as unknown as Database, f.key!.token)
      ).toMatchObject({ principalId: f.person.id })
      await invoke(routes.accessKeys.revoke, undefined, { id: f.key!.id })
      expect(
        await authenticateAgent(db as unknown as Database, f.key!.token)
      ).toBeNull()
      await expect(
        invoke(
          runtime.complete,
          { lease: c.lease, result: 'Late result', cost_cents: 0 },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 401 })
      const s = await snap()
      expect(s.runs.find(t => t.id === r.id)?.status).toBe('cancelled')
      expect(JSON.stringify(s)).not.toContain(f.key!.token)
      expect(JSON.stringify(s)).not.toContain(hashSecret(f.key!.token))
    })
    it('pauses agents and revokes project grants while preserving historical activity', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      await updatePerson(f.person.id, { status: 'paused' })
      expect(
        await authenticateAgent(db as unknown as Database, f.key!.token)
      ).toBeNull()
      expect((await snap()).runs.find(t => t.id === r.id)?.status).toBe(
        'cancelled'
      )
      await updatePerson(f.person.id, { status: 'active' })
      const second = await enqueue(f),
        claim2 = await claim(f, second)
      await invoke(routes.project.membership, {
        project_id: f.project.id,
        principal_id: f.person.id,
        role: null
      })
      await expect(
        invoke(
          runtime.heartbeat,
          { lease: claim2.lease },
          { id: second.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 409 })
      expect(
        (await snap()).activity.filter(e => e.task_id === f.task.id).length
      ).toBeGreaterThan(3)
      expect(c.lease).not.toBe(claim2.lease)
    })
    it('expires stale leases durably and refuses stale worker reports', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      await owned(owner, tx =>
        tx
          .update(runs)
          .set({ lease_expires: new Date(Date.now() - 1000) })
          .where(eq(runs.id, r.id))
      )
      expect((await snap()).runs.find(t => t.id === r.id)).toMatchObject({
        status: 'failed',
        error: 'Heartbeat lease expired'
      })
      await expect(
        invoke(
          runtime.complete,
          { lease: c.lease, result: 'Late result', cost_cents: 0 },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 409 })
      expect((await enqueue(f)).id).not.toBe(r.id)
    })
    it('refuses approval and results when the original task changes after dispatch', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)
      await invoke(
        runtime.complete,
        {
          lease: c.lease,
          result: 'Prepared against original brief',
          cost_cents: 1
        },
        { id: r.id },
        owner,
        f.identity
      )
      await owned(owner, tx =>
        tx
          .update(tasks)
          .set({ content: 'New requirements', updated: new Date() })
          .where(eq(tasks.id, f.task.id))
      )
      await expect(
        invoke(routes.run.review, { approve: true, note: '' }, { id: r.id })
      ).rejects.toMatchObject({ code: 409 })
      expect(
        (await snap()).tasks.find(t => t.task_id === f.task.id)?.completed
      ).toBe(false)
    })
    it('links owned context through real FKs and excludes unrelated pages from worker snapshots', async () => {
      const f = await fixture()
      const [doc, privateDoc] = await owned(owner, tx =>
        tx
          .insert(documents)
          .values([
            {
              owner_id: owner,
              title: 'Allowed context',
              content: 'Bounded evidence'
            },
            {
              owner_id: owner,
              title: 'Unlinked private page',
              content: 'Never deliver this'
            }
          ])
          .returning()
      )
      const [foreign] = await owned(other, tx =>
        tx
          .insert(documents)
          .values({
            owner_id: other,
            title: 'Foreign context',
            content: 'Private'
          })
          .returning()
      )
      await expect(
        invoke(
          routes.work.assign,
          {
            assignee_id: f.person.id,
            priority: 'high',
            context: ['document:' + foreign!.id],
            blockers: [],
            expected_revision: 2
          },
          { id: f.task.id }
        )
      ).rejects.toMatchObject({ code: 404 })
      await invoke(
        routes.work.assign,
        {
          assignee_id: f.person.id,
          priority: 'high',
          context: ['document:' + doc!.id],
          blockers: [],
          expected_revision: 2
        },
        { id: f.task.id }
      )
      const r = await enqueue(f),
        c = await claim(f, r)
      expect(c.context).toEqual([
        {
          key: 'document:' + doc!.id,
          title: 'Allowed context',
          content: 'Bounded evidence'
        }
      ])
      expect(JSON.stringify(c)).not.toContain(privateDoc!.id)
      await owned(owner, tx =>
        tx.delete(documents).where(eq(documents.id, doc!.id))
      )
      expect(
        await owned(owner, tx =>
          tx
            .select()
            .from(contextLinks)
            .where(eq(contextLinks.task_id, f.task.id))
        )
      ).toHaveLength(0)
      await expect(
        invoke(
          runtime.complete,
          { lease: c.lease, result: 'Outdated evidence', cost_cents: 0 },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toMatchObject({ code: 409 })
    })
    it('runs the local planner through the same review and approval state machine', async () => {
      const f = await fixture({ adapter: 'planner', budget: 0 }),
        r = await enqueue(f, 0)
      await invoke(routes.run.plan, undefined, { id: r.id })
      const s = await snap()
      expect(s.runs.find(t => t.id === r.id)).toMatchObject({
        status: 'review',
        cost_cents: 0
      })
      expect(s.runs.find(t => t.id === r.id)?.result).toContain(
        'does not invoke an AI model'
      )
      await invoke(
        routes.run.review,
        { approve: true, note: 'Planning output accepted' },
        { id: r.id }
      )
    })
    it('verifies the real HTTP boundary: machine identity, scoped inbox, claim, comment, report and denial of human APIs', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      const machine = new AgentRuntimeClient(origin, f.key!.token)
      const me = await machine.request<{ principal: { id: string } }>('me')
      expect(me.principal.id).toBe(f.person.id)

      for (const endpoint of [
        '/user/me',
        '/modules/monolith--agents/accessKeys/create'
      ]) {
        const response = await fetch(origin + endpoint, {
          method: endpoint.endsWith('create') ? 'POST' : 'GET',
          headers: { Authorization: 'Bearer ' + f.key!.token }
        })
        expect(response.status).toBe(403)
      }

      const tampered =
        f.key!.token.slice(0, -1) + (f.key!.token.endsWith('a') ? 'b' : 'a')
      await expect(
        new AgentRuntimeClient(origin, tampered).request('me')
      ).rejects.toThrow('401')
      let observed: { id: string; title: string; estimate: number } | undefined

      const state = await runWorkerOnce(machine, async work => {
        observed = {
          id: work.run.id,
          title: work.task.title,
          estimate: work.run.estimated_cents
        }

        return { result: 'HTTP worker evidence', cost_cents: 2 }
      })
      expect(observed).toEqual({
        id: r.id,
        title: 'Fixture task',
        estimate: 10
      })
      expect(state).toBe('review')
      expect((await snap()).runs.find(t => t.id === r.id)).toMatchObject({
        status: 'review',
        result: 'HTTP worker evidence',
        cost_cents: 2
      })
      expect(
        await runWorkerOnce(machine, async () => {
          throw new Error('Must stay idle')
        })
      ).toBe('idle')
    })
    it('rejects expired credentials and hides other agents’ work in the same workspace', async () => {
      const f = await fixture(),
        g = await fixture(),
        r = await enqueue(f)
      const machine = new AgentRuntimeClient(origin, g.key!.token)
      expect(await machine.request('inbox')).toEqual([])
      await expect(machine.request('claim', r.id)).rejects.toThrow('404')
      await owned(owner, tx =>
        tx
          .update(credentials)
          .set({ expires: new Date(Date.now() - 1000) })
          .where(eq(credentials.id, g.key!.id))
      )
      await expect(machine.request('me')).rejects.toThrow('401')
    })
    it('connects the portable worker to the running Monolith API and its installed module router', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      const machine = new AgentRuntimeClient(
        'http://127.0.0.1:3636',
        f.key!.token
      )
      expect(
        await runWorkerOnce(machine, async () => ({
          result: 'Installed API worker evidence',
          cost_cents: 1
        }))
      ).toBe('review')
      expect((await snap()).runs.find(t => t.id === r.id)).toMatchObject({
        status: 'review',
        result: 'Installed API worker evidence',
        cost_cents: 1
      })
    })
    it('reports external worker failure through HTTP and refuses plaintext remote credentials', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      expect(
        () => new AgentRuntimeClient('http://example.com', f.key!.token)
      ).toThrow('HTTPS')
      expect(
        await runWorkerOnce(
          new AgentRuntimeClient(origin, f.key!.token),
          async () => {
            throw new Error('Provider unavailable')
          }
        )
      ).toBe('failed')
      expect((await snap()).runs.find(t => t.id === r.id)?.status).toBe(
        'failed'
      )
    })
    it('retains metered usage when a provider fails after consuming tokens', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      expect(
        await runWorkerOnce(
          new AgentRuntimeClient(origin, f.key!.token),
          async () => {
            throw new WorkerExecutionError('Incomplete provider response', 3)
          }
        )
      ).toBe('failed')
      expect((await snap()).runs.find(t => t.id === r.id)).toMatchObject({
        status: 'failed',
        cost_cents: 3
      })
    })
    it('checks the OpenAI reservation before calling a provider and meters incomplete responses', async () => {
      const f = await fixture(),
        r = await enqueue(f),
        c = await claim(f, r)

      let calls = 0

      const provider = openAIProvider({
        apiKey: 'synthetic-test-key',
        model: 'fixture-model',
        inputCentsPerMillion: 100,
        outputCentsPerMillion: 200,
        fetch: async () => {
          calls++

          return new Response(
            JSON.stringify({
              id: 'resp_fixture',
              status: 'incomplete',
              output: [],
              usage: {
                input_tokens: 100,
                output_tokens: 200,
                total_tokens: 300
              }
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }
      })
      await expect(
        provider(
          { ...c, run: { ...c.run, estimated_cents: 0 } },
          new AbortController().signal
        )
      ).rejects.toThrow('Reserved budget')
      expect(calls).toBe(0)
      await expect(
        provider(c, new AbortController().signal)
      ).rejects.toMatchObject({ cost_cents: 1 })
      expect(calls).toBe(1)
    })
    it('cascades assignments, dependencies, context and runs when a shared task is deleted', async () => {
      const f = await fixture(),
        r = await enqueue(f)
      await owned(owner, tx => tx.delete(tasks).where(eq(tasks.id, f.task.id)))
      expect(
        await owned(owner, tx =>
          tx.select().from(runs).where(eq(runs.id, r.id))
        )
      ).toHaveLength(0)
      expect(
        await owned(owner, tx =>
          tx
            .select()
            .from(assignments)
            .where(eq(assignments.task_id, f.task.id))
        )
      ).toHaveLength(0)
      expect(
        await owned(owner, tx =>
          tx
            .select()
            .from(dependencies)
            .where(eq(dependencies.task_id, f.task.id))
        )
      ).toHaveLength(0)
      expect(
        (await snap()).activity.some(
          e => e.action === 'run.queued' && e.run_id === null
        )
      ).toBe(true)
    })
    it('retains token history and budget charges after task deletion, with idempotent cumulative checkpoints', async () => {
      const f = await fixture({ adapter: 'codex' }),
        r = await enqueue(f),
        c = await claim(f, r)
      const usage = {
        provider: 'codex',
        model: 'fixture-model',
        session_id: 'fixture-session',
        input_tokens: 120,
        cached_input_tokens: 80,
        output_tokens: 30,
        total_tokens: 150,
        reported_cost_cents: 3
      }

      for (let i = 0; i < 2; i++)
        await invoke(
          runtime.heartbeat,
          { lease: c.lease, usage },
          { id: r.id },
          owner,
          f.identity
        )

      const budget = (await snap()).usage.find(
        u => u.principal_id === f.person.id
      )!
      expect(budget).toMatchObject({ spent_cents: 3, reserved_cents: 7 })
      await expect(
        invoke(
          runtime.heartbeat,
          {
            lease: c.lease,
            usage: { ...usage, input_tokens: 100, total_tokens: 130 }
          },
          { id: r.id },
          owner,
          f.identity
        )
      ).rejects.toThrow('cumulative')
      await invoke(
        runtime.complete,
        { lease: c.lease, result: 'Verified result', cost_cents: 3, usage },
        { id: r.id },
        owner,
        f.identity
      )
      await owned(owner, tx => tx.delete(tasks).where(eq(tasks.id, f.task.id)))
      const history = await invoke<{
        rows: { run_id: string | null; total_tokens: number }[]
        totals: { total_tokens: number; cost_cents: number }
      }>(routes.metering.list, undefined, { principal_id: f.person.id })
      expect(history.rows).toHaveLength(1)
      expect(history.rows[0]).toMatchObject({ run_id: null, total_tokens: 150 })
      expect(history.totals).toMatchObject({ total_tokens: 150, cost_cents: 3 })
      expect(
        (await snap()).usage.find(u => u.principal_id === f.person.id)
          ?.spent_cents
      ).toBe(3)
      expect(
        (
          await invoke<{ rows: unknown[] }>(
            routes.metering.list,
            undefined,
            { principal_id: f.person.id },
            other
          )
        ).rows
      ).toHaveLength(0)
    })
    it('dispatches only owner-enabled ready assignments and automatically completes within the selected policy', async () => {
      const f = await fixture({ adapter: 'cli' }),
        row = (await snap()).tasks.find(t => t.task_id === f.task.id)!
      await invoke(
        routes.work.assign,
        {
          assignee_id: f.person.id,
          priority: 'high',
          blockers: [],
          context: [],
          expected_revision: row.revision,
          auto_dispatch: true,
          run_budget_cents: 5,
          auto_approve: true
        },
        { id: f.task.id }
      )
      const first = await invoke<Run[]>(
        runtime.inbox,
        undefined,
        {},
        owner,
        f.identity
      )
      const second = await invoke<Run[]>(
        runtime.inbox,
        undefined,
        {},
        owner,
        f.identity
      )
      expect(first).toHaveLength(1)
      expect(second[0]?.id).toBe(first[0]?.id)
      const c = await claim(f, first[0]!)
      await invoke(
        runtime.complete,
        { lease: c.lease, result: 'Completed work', cost_cents: 0 },
        { id: first[0]!.id },
        owner,
        f.identity
      )
      expect(
        (await snap()).tasks.find(t => t.task_id === f.task.id)?.completed
      ).toBe(true)
      expect((await snap()).runs.find(r => r.id === first[0]!.id)?.status).toBe(
        'approved'
      )
      expect(
        await invoke<Run[]>(runtime.inbox, undefined, {}, owner, f.identity)
      ).toHaveLength(0)
    })
    it('retrieves the requested owned run beyond the recent snapshot and rejects other identities', async () => {
      const f = await fixture()
      const queued = await enqueue(f)
      await owned(owner, async tx => {
        const [original] = await tx
          .select()
          .from(runs)
          .where(eq(runs.id, queued.id))

        if (!original) throw new Error('Fixture run missing')
        await tx.insert(runs).values(
          Array.from({ length: 201 }, (_, i) => ({
            ...original,
            id: randomUUID(),
            request_key: randomUUID(),
            status: 'approved' as const,
            created: new Date(original.created.getTime() + (i + 1) * 1000)
          }))
        )
      })
      expect((await snap()).runs.some(r => r.id === queued.id)).toBe(false)
      expect(
        await invoke<Run>(routes.run.get, undefined, { id: queued.id })
      ).toMatchObject({ id: queued.id, task_title: 'Fixture task' })
      await expect(
        invoke(routes.run.get, undefined, { id: queued.id }, other)
      ).rejects.toThrow('not found')
      await expect(
        invoke(routes.run.get, undefined, { id: queued.id }, owner, f.identity)
      ).rejects.toThrow()
    })

    it('retains checkpointed cost on cancellation and rejects partial token rows', async () => {
      const f = await fixture({ adapter: 'codex' })
      const queued = await enqueue(f),
        claimed = await claim(f, queued)
      await expect(
        owned(owner, tx =>
          tx
            .update(usageRecords)
            .set({ input_tokens: 1 })
            .where(eq(usageRecords.original_run_id, queued.id))
        )
      ).rejects.toThrow()
      const usage = {
        provider: 'codex',
        model: 'fixture',
        session_id: 'fixture-cancel',
        input_tokens: 100,
        cached_input_tokens: 60,
        output_tokens: 20,
        total_tokens: 120,
        reported_cost_cents: 3
      }
      await invoke(
        runtime.heartbeat,
        { lease: claimed.lease, usage },
        { id: queued.id },
        owner,
        f.identity
      )
      await invoke(routes.run.cancel, undefined, { id: queued.id })
      await expect(
        invoke(
          runtime.complete,
          { lease: claimed.lease, result: 'Late result', cost_cents: 3, usage },
          { id: queued.id },
          owner,
          f.identity
        )
      ).rejects.toThrow()
      const history = await owned(owner, tx =>
        tx
          .select()
          .from(usageRecords)
          .where(eq(usageRecords.original_run_id, queued.id))
      )
      expect(history[0]).toMatchObject({
        status: 'cancelled',
        cost_cents: 3,
        total_tokens: 120
      })
      expect(
        (await snap()).usage.find(row => row.principal_id === f.person.id)
      ).toMatchObject({ spent_cents: 3, reserved_cents: 0 })
    })
    it('does not starve automatic work behind more than twenty-five unaffordable assignments', async () => {
      const f = await fixture({ adapter: 'cli' })
      const created = await owned(owner, async tx => {
        const [original] = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, f.task.id))

        if (!original) throw new Error('Fixture task missing')

        const inserted = await tx
          .insert(tasks)
          .values(
            Array.from({ length: 26 }, (_, i) => ({
              owner_id: owner,
              column_id: original.column_id,
              title: 'Automatic fixture ' + i,
              content: 'Synthetic'
            }))
          )
          .returning()
        await tx.insert(assignments).values(
          inserted.map((task, i) => ({
            owner_id: owner,
            task_id: task.id,
            assignee_id: f.person.id,
            auto_dispatch: true,
            priority: i < 25 ? ('high' as const) : ('low' as const),
            run_budget_cents: i < 25 ? 101 : 1
          }))
        )

        return inserted
      })
      const inbox = await invoke<Run[]>(
        runtime.inbox,
        undefined,
        {},
        owner,
        f.identity
      )
      expect(inbox).toHaveLength(1)
      expect(inbox[0]?.task_id).toBe(created[25]?.id)
    })
  }
)
