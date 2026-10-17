import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import {
  playbook,
  playbookInput,
  qualityOutput
} from '../../../../modules/monolith--agents/server/playbooks'
import * as routes from '../../../../modules/monolith--agents/server/routes'
import * as runtime from '../../../../modules/monolith--agents/server/runtime'
import {
  activity,
  playbooks,
  principals,
  relations,
  tables,
  usageRecords
} from '../../../../modules/monolith--agents/server/schema.drizzle'
import type {
  AgentSnapshot,
  PlaybookSnapshot,
  Run
} from '../../../../modules/monolith--agents/shared'
import { entries as projects } from '../../../../modules/monolith--projects/server/schema.drizzle'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''

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
      'Playbook integration tests require an isolated local database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 3, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owner = randomUUID(),
  other = randomUUID()

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
type Identity = { principalId: string; credentialId: string }

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
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id', ${user}, true)`)

    return endpoint.callback({
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
  })

  return result.payload == null
    ? (undefined as T)
    : (JSON.parse(JSON.stringify(result.payload)) as T)
}

const snap = (user = owner) =>
  invoke<AgentSnapshot>(routes.snapshot, undefined, {}, user)
const bookInput = {
  name: 'Evidence playbook',
  description: 'Isolated test',
  instructions: 'Verify the outcome.',
  checks: ['Exercise the changed flow'],
  require_review: true,
  archived: false
}

describe('Playbook input contracts', () => {
  it('bounds instructions and checks and rejects duplicate checks', () => {
    expect(playbookInput.safeParse(bookInput).success).toBe(true)
    expect(
      playbookInput.safeParse({ ...bookInput, checks: ['same', 'same'] })
        .success
    ).toBe(false)
    expect(
      playbookInput.safeParse({ ...bookInput, instructions: 'a'.repeat(6001) })
        .success
    ).toBe(false)
    expect(
      playbookInput.safeParse({ ...bookInput, checks: ['a'.repeat(241)] })
        .success
    ).toBe(false)
    expect(
      qualityOutput.safeParse({
        check_id: 'id:0',
        passed: true,
        evidence: '   '
      }).success
    ).toBe(false)
    expect(
      qualityOutput.safeParse({
        check_id: 'id:0',
        passed: true,
        evidence: 'a'.repeat(4001)
      }).success
    ).toBe(false)
  })
})

describe.skipIf(!enabled)('Persisted agent playbooks', () => {
  beforeAll(async () => {
    for (const id of [owner, other])
      await client`insert into users(id,email,username,name) values(${id},${id + '@example.invalid'},${id},'Synthetic playbook owner')`
  })
  afterAll(async () => {
    for (const user of [owner, other])
      await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id', ${user}, true)`
        )
        await tx.delete(usageRecords).where(eq(usageRecords.owner_id, user))
        await tx.delete(activity).where(eq(activity.owner_id, user))
        await tx.delete(projects).where(eq(projects.owner_id, user))
        await tx.delete(playbooks).where(eq(playbooks.owner_id, user))
        await tx.delete(principals).where(eq(principals.owner_id, user))
        await tx.execute(
          sql`delete from todo_list__entries where owner_id=${user}`
        )
        await tx.execute(
          sql`delete from monolith_native_changes where owner_id=${user}`
        )
        await tx.execute(sql`delete from users where id=${user}`)
      })
    await client.end()
  })

  it('isolates the library and bindings, protects revisions, snapshots dispatch and enforces evidence', async () => {
    await snap()
    const book = await invoke<{ id: string }>(playbook.create, bookInput)
    await expect(
      invoke(
        playbook.update,
        { ...bookInput, expected_revision: 1 },
        { id: book.id },
        other
      )
    ).rejects.toThrow('not found')
    const personInput = {
      name: 'ECC test agent',
      role: 'contributor',
      adapter: 'codex',
      reports_to: owner,
      instructions: 'Follow scope.',
      budget_cents: 100,
      playbook_ids: [book.id]
    }
    const agent = await invoke<{ id: string }>(
      routes.people.create,
      personInput
    )
    await expect(
      invoke(
        routes.people.create,
        { ...personInput, reports_to: other },
        {},
        other
      )
    ).rejects.toThrow('not found')
    expect(
      (await snap()).principals.find(person => person.id === agent.id)
        ?.playbook_ids
    ).toEqual([book.id])
    expect((await snap(other)).playbooks).toHaveLength(0)
    const project = await invoke<{ id: string }>(routes.project.create, {
      name: 'ECC isolated project',
      description: ''
    })
    await invoke(routes.project.membership, {
      project_id: project.id,
      principal_id: agent.id,
      role: 'contributor'
    })
    const task = await invoke<{ id: string }>(routes.work.create, {
      project_id: project.id,
      title: 'ECC isolated task',
      content: ''
    })
    await invoke(
      routes.work.assign,
      {
        assignee_id: agent.id,
        priority: 'medium',
        blockers: [],
        context: [],
        expected_revision: 1,
        auto_approve: true
      },
      { id: task.id }
    )
    const revision = (await snap()).tasks.find(
      item => item.task_id === task.id
    )!.revision
    const run = await invoke<Run>(
      routes.run.queue,
      {
        expected_revision: revision,
        request_key: randomUUID(),
        estimated_cents: 10
      },
      { id: task.id }
    )
    expect(run.auto_approve).toBe(false)
    expect(run.playbooks[0]?.revision).toBe(1)
    await invoke(
      playbook.update,
      { ...bookInput, checks: ['A future check'], expected_revision: 1 },
      { id: book.id }
    )
    await expect(
      invoke(
        playbook.update,
        { ...bookInput, expected_revision: 1 },
        { id: book.id }
      )
    ).rejects.toThrow('Reload')
    const key = await invoke<{ id: string }>(routes.accessKeys.create, {
      principal_id: agent.id,
      name: 'ECC isolated key',
      days: 1
    })
    const identity = { principalId: agent.id, credentialId: key.id }
    const claim = await invoke<{
      lease: string
      instructions: string
      playbooks: PlaybookSnapshot[]
    }>(runtime.claim, undefined, { id: run.id }, owner, identity)
    expect(claim.instructions).toContain('Follow scope.')
    expect(claim.instructions).toContain('Exercise the changed flow')
    expect(claim.playbooks[0]?.checks).toEqual(bookInput.checks)
    const completion = {
      lease: claim.lease,
      result: 'Task complete',
      cost_cents: 2
    }
    await expect(
      invoke(runtime.complete, completion, { id: run.id }, owner, identity)
    ).rejects.toThrow('passing evidence')
    const evidence = {
      check_id: `${book.id}:0`,
      passed: true,
      evidence: 'Focused flow test passed with expected saved state.'
    }
    await expect(
      invoke(
        runtime.complete,
        { ...completion, quality_report: [evidence, evidence] },
        { id: run.id },
        owner,
        identity
      )
    ).rejects.toThrow('exactly once')
    await invoke(
      runtime.complete,
      { ...completion, quality_report: [evidence] },
      { id: run.id },
      owner,
      identity
    )
    const completed = await invoke<Run>(routes.run.get, undefined, {
      id: run.id
    })
    expect(completed.status).toBe('review')
    expect(completed.quality_report).toEqual([evidence])
    expect(completed.playbooks[0]?.revision).toBe(1)
    expect(
      (await snap()).tasks.find(item => item.task_id === task.id)?.completed
    ).toBe(false)
  })

  it('archives exclude future dispatch and prevent new bindings', async () => {
    const book = await invoke<{ id: string }>(playbook.create, {
      ...bookInput,
      name: 'Archived fixture'
    })
    const person = await invoke<{ id: string }>(routes.people.create, {
      name: 'Archive planner fixture',
      role: 'contributor',
      adapter: 'planner',
      reports_to: owner,
      instructions: 'Original planner instructions',
      budget_cents: 0,
      playbook_ids: [book.id]
    })
    const project = await invoke<{ id: string }>(routes.project.create, {
      name: 'Archive isolated project',
      description: ''
    })
    await invoke(routes.project.membership, {
      project_id: project.id,
      principal_id: person.id,
      role: 'contributor'
    })
    const task = await invoke<{ id: string }>(routes.work.create, {
      project_id: project.id,
      title: 'Archive isolated task',
      content: ''
    })
    await invoke(
      routes.work.assign,
      {
        assignee_id: person.id,
        priority: 'medium',
        blockers: [],
        context: [],
        expected_revision: 1
      },
      { id: task.id }
    )
    const revision = (await snap()).tasks.find(
      item => item.task_id === task.id
    )!.revision
    await expect(
      invoke(
        routes.run.queue,
        {
          expected_revision: revision,
          request_key: randomUUID(),
          estimated_cents: 0
        },
        { id: task.id }
      )
    ).rejects.toThrow('local planner cannot perform')
    await invoke(
      playbook.update,
      { ...bookInput, archived: true, expected_revision: 1 },
      { id: book.id }
    )
    await expect(
      invoke(routes.people.create, {
        name: 'Cannot bind',
        role: 'contributor',
        adapter: 'cli',
        reports_to: owner,
        instructions: '',
        budget_cents: 0,
        playbook_ids: [book.id]
      })
    ).rejects.toThrow('Archived')
    expect(
      (await snap()).playbooks.find(item => item.id === book.id)?.archived
    ).toBe(true)
    const run = await invoke<Run>(
      routes.run.queue,
      {
        expected_revision: revision,
        request_key: randomUUID(),
        estimated_cents: 0
      },
      { id: task.id }
    )
    expect(run.playbooks).toEqual([])
    await invoke(routes.run.plan, undefined, { id: run.id })
    const planned = await invoke<Run>(routes.run.get, undefined, { id: run.id })
    expect(planned.result).toContain('Original planner instructions')
    expect(planned.status).toBe('review')
  })
})
