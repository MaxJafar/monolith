import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'

import { contentText } from '@lifeforge/blocks'
import type { BuiltModuleSchema } from '@lifeforge/drizzle'
import { ClientError } from '@lifeforge/server-utils'

import {
  columns,
  entries as projects,
  tasks
} from '../../lifeforge--projects/server/schema.drizzle'
import { pageCatalog } from '../../zillion--databases/server/knowledge'
import {
  compilePlaybookInstructions,
  requiredChecks,
  validateQualityEvidence
} from '../playbookPolicy'
import type {
  Principal,
  QualityEvidence,
  TokenUsage,
  WorkItem
} from '../shared'
import { hashSecret, newLease } from './auth'
import { backfillUsage, recordUsage } from './metering'
import * as schema from './schema.drizzle'
import {
  activity,
  assignments,
  contextLinks,
  credentials,
  dependencies,
  members,
  playbookBindings,
  playbooks,
  principals,
  runs,
  usageRecords
} from './schema.drizzle'

export type Database = PostgresJsDatabase<BuiltModuleSchema<typeof schema>>

export type Store = Pick<
  Database,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>

export type Actor = {
  owner: string
  id: string
  kind: 'human' | 'agent'
  credentialId?: string
}

const active = ['queued', 'running', 'review'] as const

export function fail(message: string, code = 409): never {
  throw new ClientError(message, code)
}

export async function lock(db: Store, owner: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${'agents:' + owner}, 0))`
  )
}

export async function principal(db: Store, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(principals)
    .where(and(eq(principals.id, id), eq(principals.owner_id, owner)))

  return row || fail('Workspace member not found', 404)
}

export async function actor(
  db: Store,
  locals: Record<string, unknown>,
  runtime = false
): Promise<Actor> {
  const owner = locals.userId

  if (typeof owner !== 'string') fail('Authentication required', 401)
  await lock(db, owner)

  if (locals.actorType === 'agent') {
    if (!runtime) fail('Only the workspace owner can manage agents', 403)

    const agent = await principal(db, owner, String(locals.principalId))
    const [key] = await db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.id, String(locals.credentialId)),
          eq(credentials.owner_id, owner),
          eq(credentials.principal_id, agent.id)
        )
      )

    if (
      agent.kind !== 'agent' ||
      agent.status !== 'active' ||
      !key ||
      key.revoked ||
      key.expires <= new Date()
    )
      fail('Agent access is unavailable', 401)
    await db
      .update(credentials)
      .set({ last_used: new Date() })
      .where(eq(credentials.id, key.id))

    return {
      owner: owner,
      id: agent.id,
      kind: 'agent',
      credentialId: key.id
    }
  }
  if (runtime) fail('An agent credential is required', 401)
  await db
    .insert(principals)
    .values({
      id: owner,
      owner_id: owner,
      name: 'You',
      kind: 'human',
      role: 'lead',
      adapter: 'planner'
    })
    .onConflictDoNothing()

  return { owner: owner, id: owner, kind: 'human' }
}

export async function audit(
  db: Store,
  who: Actor,
  action: string,
  message = '',
  task_id: string | null = null,
  run_id: string | null = null
) {
  await db.insert(activity).values({
    owner_id: who.owner,
    actor_id: who.id,
    action,
    message,
    task_id,
    run_id
  })
}

export async function ownedProject(db: Store, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.owner_id, owner)))

  return row || fail('Project not found', 404)
}

export async function sourceTask(db: Store, owner: string, id: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.owner_id, owner)))
    .for('update')

  if (!task) return fail('Task not found', 404)

  const [column] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, task.column_id), eq(columns.owner_id, owner)))
    .for('key share')

  if (!column) return fail('Project column not found', 404)
  await ownedProject(db, owner, column.project_id)

  return { task, projectId: column.project_id }
}

export async function writableMember(
  db: Store,
  owner: string,
  id: string,
  projectId: string
) {
  const person = await principal(db, owner, id)

  if (person.kind === 'human') return person

  const [membership] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.owner_id, owner),
        eq(members.principal_id, id),
        eq(members.project_id, projectId)
      )
    )

  if (
    !membership ||
    membership.role === 'observer' ||
    person.role === 'observer' ||
    person.status !== 'active'
  )
    fail('Agent needs active contributor access to this project', 403)

  return person
}

export async function assignment(db: Store, owner: string, taskId: string) {
  const [row] = await db
    .select()
    .from(assignments)
    .where(
      and(eq(assignments.owner_id, owner), eq(assignments.task_id, taskId))
    )

  return row || fail('Task has no assignment', 404)
}

export async function setWorkState(
  db: Store,
  owner: string,
  taskId: string,
  status: (typeof assignments.$inferSelect)['status']
) {
  await db
    .update(assignments)
    .set({ status, revision: sql`${assignments.revision} + 1` })
    .where(
      and(eq(assignments.owner_id, owner), eq(assignments.task_id, taskId))
    )
}

export async function reap(db: Store, who: Actor) {
  const expired = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.owner_id, who.owner),
        eq(runs.status, 'running'),
        sql`${runs.lease_expires} <= now()`
      )
    )

  for (const run of expired) {
    await recordUsage(db, run, undefined, run.cost_cents, 'failed')
    await db
      .update(runs)
      .set({
        status: 'failed',
        error: 'Heartbeat lease expired',
        lease_hash: null,
        lease_expires: null
      })
      .where(eq(runs.id, run.id))
    await setWorkState(db, who.owner, run.task_id, 'blocked')
    await audit(
      db,
      who,
      'run.expired',
      'Heartbeat lease expired; retry requires a new run.',
      run.task_id,
      run.id
    )
  }
}

export async function cancelActive(
  db: Store,
  who: Actor,
  taskId: string,
  reason: string
) {
  const current = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.owner_id, who.owner),
        eq(runs.task_id, taskId),
        inArray(runs.status, [...active])
      )
    )

  for (const run of current) {
    await recordUsage(db, run, undefined, run.cost_cents, 'cancelled')
    await db
      .update(runs)
      .set({
        status: 'cancelled',
        error: reason,
        lease_hash: null,
        lease_expires: null
      })
      .where(eq(runs.id, run.id))
    await audit(db, who, 'run.cancelled', reason, taskId, run.id)
  }
  if (current.length) await setWorkState(db, who.owner, taskId, 'blocked')
}

export async function usage(db: Store, owner: string, id: string) {
  await backfillUsage(db, owner)
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.owner_id, owner), eq(runs.principal_id, id)))
  const month = new Date().toISOString().slice(0, 7)
  const history = await db
    .select()
    .from(usageRecords)
    .where(
      and(eq(usageRecords.owner_id, owner), eq(usageRecords.principal_id, id))
    )

  return {
    principal_id: id,
    spent_cents: history
      .filter(r => r.charged_at.toISOString().slice(0, 7) === month)
      .reduce((sum, r) => sum + r.cost_cents, 0),
    reserved_cents: rows
      .filter(r => r.status === 'queued' || r.status === 'running')
      .reduce(
        (sum, r) => sum + Math.max(0, r.estimated_cents - r.cost_cents),
        0
      )
  }
}

export async function assertManager(
  db: Store,
  owner: string,
  id: string | null,
  manager: string | null
) {
  const seen = new Set(id ? [id] : [])

  let current = manager

  while (current) {
    if (seen.has(current) || seen.size > 32)
      fail('Reporting lines cannot contain a cycle or exceed 32 levels')
    seen.add(current)
    current = (await principal(db, owner, current)).reports_to
  }
}

export async function replaceDependencies(
  db: Store,
  who: Actor,
  taskId: string,
  projectId: string,
  blockers: string[]
) {
  for (const id of blockers) {
    if (id === taskId) fail('A task cannot block itself', 400)

    const target = await sourceTask(db, who.owner, id)

    if (target.projectId !== projectId)
      fail('Dependencies must belong to the same project', 400)
  }

  const existing = await db
    .select()
    .from(dependencies)
    .where(eq(dependencies.owner_id, who.owner))
  const edges = [
    ...existing.filter(d => d.task_id !== taskId),
    ...blockers.map(blocker_id => ({ task_id: taskId, blocker_id }))
  ]
  const adjacency = new Map<string, string[]>()

  for (const edge of edges)
    adjacency.set(edge.task_id, [
      ...(adjacency.get(edge.task_id) ?? []),
      edge.blocker_id
    ])

  const visiting = new Set<string>(),
    depths = new Map<string, number>()
  const visit = (id: string): number => {
    if (visiting.has(id) || visiting.size > 64)
      fail('Task dependencies cannot contain a cycle or exceed 64 levels', 400)

    const cached = depths.get(id)

    if (cached !== undefined) return cached
    visiting.add(id)
    let depth = 0
    for (const child of adjacency.get(id) ?? [])
      depth = Math.max(depth, 1 + visit(child))
    if (depth > 64) fail('Task dependencies cannot exceed 64 levels', 400)
    visiting.delete(id)
    depths.set(id, depth)

    return depth
  }
  visit(taskId)
  await db
    .delete(dependencies)
    .where(
      and(
        eq(dependencies.owner_id, who.owner),
        eq(dependencies.task_id, taskId)
      )
    )
  if (blockers.length)
    await db.insert(dependencies).values(
      blockers.map(blocker_id => ({
        owner_id: who.owner,
        task_id: taskId,
        blocker_id
      }))
    )
}

export async function replaceContext(
  db: Store,
  who: Actor,
  taskId: string,
  keys: string[]
) {
  const pages = await pageCatalog(db, who.owner)

  for (const key of keys)
    if (!pages.some(p => p.key === key)) fail('Context page not found', 404)
  await db
    .delete(contextLinks)
    .where(
      and(
        eq(contextLinks.owner_id, who.owner),
        eq(contextLinks.task_id, taskId)
      )
    )
  if (keys.length)
    await db.insert(contextLinks).values(
      keys.map(page_key => {
        const [kind, id] = page_key.split(':')

        return {
          owner_id: who.owner,
          task_id: taskId,
          page_key,
          document_id: kind === 'document' ? id : null,
          record_id: kind === 'record' ? id : null,
          note_id: kind === 'note' ? id : null
        }
      })
    )
}

export async function queue(
  db: Store,
  who: Actor,
  taskId: string,
  expectedRevision: number,
  requestKey: string,
  estimate: number
) {
  await reap(db, who)
  const [retry] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.owner_id, who.owner), eq(runs.request_key, requestKey)))

  if (retry) {
    if (retry.task_id !== taskId || retry.estimated_cents !== estimate)
      fail('This request key belongs to another run', 409)

    return retry
  }

  const source = await sourceTask(db, who.owner, taskId)
  const work = await assignment(db, who.owner, taskId)

  if (work.revision !== expectedRevision)
    fail('Assignment changed. Reload before dispatching.')
  if (!work.assignee_id || source.task.completed)
    fail('Assign an unfinished task before dispatching')

  const person = await writableMember(
    db,
    who.owner,
    work.assignee_id,
    source.projectId
  )

  if (person.kind !== 'agent') fail('Choose an agent to run this task', 400)

  const blocked = await db
    .select({ completed: tasks.completed })
    .from(dependencies)
    .innerJoin(tasks, eq(dependencies.blocker_id, tasks.id))
    .where(
      and(
        eq(dependencies.owner_id, who.owner),
        eq(dependencies.task_id, taskId),
        eq(tasks.owner_id, who.owner)
      )
    )

  if (blocked.some(b => !b.completed))
    fail('Finish the blocking tasks before dispatching')

  const already = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.owner_id, who.owner),
        eq(runs.task_id, taskId),
        inArray(runs.status, [...active])
      )
    )

  if (already.length) fail('This task already has an active run')
  if (person.adapter === 'planner' && estimate !== 0)
    fail('The built-in planner has no provider cost', 400)

  const budget = await usage(db, who.owner, person.id)

  if (
    budget.spent_cents + budget.reserved_cents + estimate >
    person.budget_cents
  )
    fail('Agent monthly budget would be exceeded')

  const contexts = await db
    .select()
    .from(contextLinks)
    .where(
      and(
        eq(contextLinks.owner_id, who.owner),
        eq(contextLinks.task_id, taskId)
      )
    )
  const pages = await pageCatalog(db, who.owner)
  const boundPlaybooks = await db
    .select({ book: playbooks })
    .from(playbookBindings)
    .innerJoin(playbooks, eq(playbookBindings.playbook_id, playbooks.id))
    .where(
      and(
        eq(playbookBindings.owner_id, who.owner),
        eq(playbookBindings.principal_id, person.id),
        eq(playbooks.owner_id, who.owner),
        eq(playbooks.archived, false)
      )
    )
    .orderBy(asc(playbookBindings.position))
  const policies = boundPlaybooks.map(
    ({
      book: {
        owner_id: _owner,
        created: _created,
        archived: _archived,
        ...book
      }
    }) => book
  )

  if (person.adapter === 'planner' && requiredChecks(policies).length)
    fail(
      'Required quality checks need a connected worker. The local planner cannot perform verification.',
      400
    )

  const [run] = await db
    .insert(runs)
    .values({
      owner_id: who.owner,
      task_id: taskId,
      principal_id: person.id,
      request_key: requestKey,
      estimated_cents: estimate,
      adapter: person.adapter,
      auto_approve:
        work.auto_approve && !policies.some(book => book.require_review),
      task_snapshot: {
        title: source.task.title,
        content: source.task.content,
        column_id: source.task.column_id,
        updated: source.task.updated.toISOString()
      },
      instructions_snapshot: compilePlaybookInstructions(
        person.instructions,
        policies
      ),
      playbook_snapshot: policies,
      context_snapshot: pages
        .filter(p => contexts.some(c => c.page_key === p.key))
        .map(p => ({
          key: p.key,
          title: p.title,
          content: contentText(p.content).slice(0, 20000)
        }))
    })
    .returning()

  if (!run) return fail('Run could not be created', 500)
  await recordUsage(db, run)
  await setWorkState(db, who.owner, taskId, 'ready')
  await audit(
    db,
    who,
    'run.queued',
    `Assigned to ${person.name}`,
    taskId,
    run.id
  )

  return run
}

export async function ownedRun(db: Store, who: Actor, id: string) {
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.owner_id, who.owner), eq(runs.id, id)))

  if (!run || (who.kind === 'agent' && run.principal_id !== who.id))
    return fail('Run not found', 404)

  return run
}

export async function validateRunAccess(
  db: Store,
  who: Actor,
  run: typeof runs.$inferSelect
) {
  const source = await sourceTask(db, who.owner, run.task_id)
  const work = await assignment(db, who.owner, run.task_id)
  await writableMember(db, who.owner, run.principal_id, source.projectId)
  if (work.assignee_id !== run.principal_id || source.task.completed)
    fail('This assignment is no longer available')

  const contexts = await db
    .select()
    .from(contextLinks)
    .where(
      and(
        eq(contextLinks.owner_id, who.owner),
        eq(contextLinks.task_id, run.task_id)
      )
    )
  const pages = await pageCatalog(db, who.owner)

  if (
    run.context_snapshot.some(
      page =>
        !contexts.some(link => link.page_key === page.key) ||
        !pages.some(current => current.key === page.key)
    )
  )
    fail(
      'Linked context is no longer available. Cancel and dispatch the latest version.'
    )

  const baseline = run.task_snapshot

  if (
    source.task.title !== baseline.title ||
    source.task.content !== baseline.content ||
    source.task.column_id !== baseline.column_id ||
    source.task.updated.toISOString() !== baseline.updated
  )
    fail('Task changed since dispatch. Cancel and dispatch its latest version.')

  return source
}

export async function claim(db: Store, who: Actor, id: string) {
  const run = await ownedRun(db, who, id)

  if (run.status !== 'queued')
    fail('This run has already been claimed or closed')

  const person = await principal(db, who.owner, run.principal_id)

  if (who.kind === 'agent' && person.adapter === 'planner')
    fail('This adapter runs inside Zillion', 403)
  await validateRunAccess(db, who, run)
  const budget = await usage(db, who.owner, person.id)

  if (budget.spent_cents + budget.reserved_cents > person.budget_cents)
    fail('Agent budget is exhausted')

  const lease = newLease(),
    now = new Date()
  const [claimed] = await db
    .update(runs)
    .set({
      status: 'running',
      credential_id: who.credentialId ?? null,
      lease_hash: hashSecret(lease),
      heartbeat_at: now,
      lease_expires: new Date(now.getTime() + 120000)
    })
    .where(eq(runs.id, id))
    .returning()
  await setWorkState(db, who.owner, run.task_id, 'running')
  await audit(db, who, 'run.claimed', '', run.task_id, id)

  return { run: claimed!, lease }
}

export async function leasedRun(
  db: Store,
  who: Actor,
  id: string,
  lease: string
) {
  const run = await ownedRun(db, who, id)

  if (
    run.status !== 'running' ||
    !run.lease_expires ||
    run.lease_expires <= new Date() ||
    run.lease_hash !== hashSecret(lease) ||
    (who.kind === 'agent' && run.credential_id !== (who.credentialId ?? null))
  )
    fail('Run lease is no longer valid', 409)
  await validateRunAccess(db, who, run)

  return run
}

export async function complete(
  db: Store,
  who: Actor,
  id: string,
  lease: string,
  result: string,
  cost: number,
  report?: TokenUsage,
  qualityReport: QualityEvidence[] = []
) {
  const run = await leasedRun(db, who, id, lease)

  if (cost > run.estimated_cents)
    fail('Reported cost exceeds the reserved budget', 400)

  const qualityError = validateQualityEvidence(
    run.playbook_snapshot,
    qualityReport
  )

  if (qualityError) fail(qualityError, 400)

  const status = run.auto_approve ? 'approved' : 'review'
  await recordUsage(db, run, report, cost, status)
  if (run.auto_approve)
    await db
      .update(tasks)
      .set({
        completed: true,
        updated: sql`greatest(now()::timestamp, ${tasks.updated} + interval '1 millisecond')`
      })
      .where(and(eq(tasks.id, run.task_id), eq(tasks.owner_id, who.owner)))
  await db
    .update(runs)
    .set({
      status,
      result,
      quality_report: qualityReport,
      cost_cents: cost,
      settled_at: new Date(),
      lease_hash: null,
      lease_expires: null
    })
    .where(eq(runs.id, id))
  await setWorkState(
    db,
    who.owner,
    run.task_id,
    run.auto_approve ? 'done' : 'review'
  )
  await audit(
    db,
    who,
    run.auto_approve ? 'run.auto_approved' : 'run.review_requested',
    run.auto_approve
      ? 'Completed under the owner-selected automatic completion policy.'
      : 'Result is ready for human review.',
    run.task_id,
    id
  )
}

export const publicPrincipal = ({
  owner_id: _owner,
  created: _created,
  ...p
}: typeof principals.$inferSelect): Principal => p

export const publicRun = (run: typeof runs.$inferSelect) => ({
  task_title: run.task_snapshot.title,
  id: run.id,
  task_id: run.task_id,
  principal_id: run.principal_id,
  status: run.status,
  estimated_cents: run.estimated_cents,
  cost_cents: run.cost_cents,
  result: run.result,
  error: run.error,
  decision_note: run.decision_note,
  created: run.created.toISOString(),
  heartbeat_at: run.heartbeat_at?.toISOString() ?? null,
  lease_expires: run.lease_expires?.toISOString() ?? null,
  adapter: run.adapter,
  auto_approve: run.auto_approve,
  playbooks: run.playbook_snapshot.map(
    ({ instructions: _instructions, description: _description, ...policy }) =>
      policy
  ),
  quality_report: run.quality_report
})

export async function snapshot(db: Store, who: Actor) {
  await reap(db, who)
  const people = await db
    .select()
    .from(principals)
    .where(eq(principals.owner_id, who.owner))
    .orderBy(asc(principals.created))
  const work = await db
    .select({ task: tasks, column: columns })
    .from(tasks)
    .innerJoin(columns, eq(tasks.column_id, columns.id))
    .where(and(eq(tasks.owner_id, who.owner), eq(columns.owner_id, who.owner)))
    .orderBy(desc(tasks.updated))
  const allAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.owner_id, who.owner))
  const deps = await db
    .select()
    .from(dependencies)
    .where(eq(dependencies.owner_id, who.owner))
  const contexts = await db
    .select()
    .from(contextLinks)
    .where(eq(contextLinks.owner_id, who.owner))
  const bindings = await db
    .select()
    .from(playbookBindings)
    .where(eq(playbookBindings.owner_id, who.owner))
    .orderBy(asc(playbookBindings.position))

  return {
    playbooks: (
      await db
        .select()
        .from(playbooks)
        .where(eq(playbooks.owner_id, who.owner))
        .orderBy(asc(playbooks.created))
    ).map(({ owner_id: _owner, created: _created, ...book }) => book),
    principals: people.map(person => ({
      ...publicPrincipal(person),
      playbook_ids: bindings
        .filter(binding => binding.principal_id === person.id)
        .map(binding => binding.playbook_id)
    })),
    projects: await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.owner_id, who.owner)),
    members: (
      await db.select().from(members).where(eq(members.owner_id, who.owner))
    ).map(({ owner_id: _owner, ...m }) => m),
    tasks: work.map<WorkItem>(({ task: t, column: c }) => {
      const a = allAssignments.find(a => a.task_id === t.id)

      return {
        id: a?.id ?? t.id,
        task_id: t.id,
        project_id: c.project_id,
        title: t.title,
        content: t.content,
        completed: t.completed,
        assignee_id: a?.assignee_id ?? null,
        status: t.completed
          ? 'done'
          : a?.status === 'done'
            ? 'ready'
            : (a?.status ?? 'ready'),
        priority: a?.priority ?? 'medium',
        revision: a?.revision ?? 0,
        blockers: deps.filter(d => d.task_id === t.id).map(d => d.blocker_id),
        context: contexts.filter(c => c.task_id === t.id).map(c => c.page_key),
        auto_dispatch: a?.auto_dispatch ?? false,
        run_budget_cents: a?.run_budget_cents ?? 0,
        auto_approve: a?.auto_approve ?? false
      }
    }),
    runs: (
      await db
        .select()
        .from(runs)
        .where(eq(runs.owner_id, who.owner))
        .orderBy(desc(runs.created))
        .limit(200)
    ).map(publicRun),
    activity: (
      await db
        .select()
        .from(activity)
        .where(eq(activity.owner_id, who.owner))
        .orderBy(desc(activity.created))
        .limit(200)
    ).map(({ owner_id: _owner, ...e }) => ({
      ...e,
      created: e.created.toISOString()
    })),
    credentials: (
      await db
        .select()
        .from(credentials)
        .where(eq(credentials.owner_id, who.owner))
    ).map(({ id, principal_id, name, expires, revoked, last_used }) => ({
      id,
      principal_id,
      name,
      expires: expires.toISOString(),
      revoked,
      last_used: last_used?.toISOString() ?? null
    })),
    pages: (await pageCatalog(db, who.owner))
      .filter(page => !page.aliasOf)
      .map(({ key, title, kind }) => ({
        key,
        title,
        kind
      })),
    usage: await Promise.all(
      people
        .filter(p => p.kind === 'agent')
        .map(p => usage(db, who.owner, p.id))
    )
  }
}

export async function dispatchAutomatic(db: Store, who: Actor) {
  await reap(db, who)
  const [scope] = await db.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )
  const eligible = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.owner_id, who.owner),
        eq(assignments.assignee_id, who.id),
        eq(assignments.auto_dispatch, true),
        eq(assignments.status, 'ready'),
        ...(scope?.id
          ? [
              sql`exists(select 1 from zillion_databases__record_sources s join zillion_databases__records r on r.id=s.record_id join zillion_databases__bases b on b.id=r.base_id where s.owner_id=${who.owner} and s.kind='project-task' and s.native_id=${assignments.task_id} and b.workspace_id=${scope.id})`
            ]
          : [])
      )
    )
    .orderBy(
      sql`case ${assignments.priority} when 'high' then 0 when 'medium' then 1 else 2 end`,
      asc(assignments.id)
    )

  for (const item of eligible) {
    try {
      await queue(
        db,
        who,
        item.task_id,
        item.revision,
        randomUUID(),
        item.run_budget_cents
      )
      break
    } catch (failure) {
      if (!(failure instanceof ClientError)) throw failure
    }
  }
}
