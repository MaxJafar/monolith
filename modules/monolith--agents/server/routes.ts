import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import z from 'zod'

import { contentText } from '@monolith/blocks'

import {
  ADAPTERS,
  type AgentSnapshot,
  ROLES,
  RUN_STATES,
  WORK_STATES
} from '../shared'
import { createAgentToken } from './auth'
import endpoints from './endpoints'
import { recordUsage, usageHistory, usageOutput } from './metering'
import {
  playbookIds,
  playbookOutput,
  qualityOutput,
  replacePlaybooks
} from './playbooks'
import {
  assignments,
  credentials,
  members,
  principals,
  runs
} from './schema.drizzle'
import {
  actor,
  assertManager,
  audit,
  cancelActive,
  claim,
  complete,
  fail,
  ownedProject,
  ownedRun,
  principal,
  publicRun,
  queue,
  snapshot as readSnapshot,
  replaceContext,
  replaceDependencies,
  setWorkState,
  sourceTask,
  usage,
  validateRunAccess,
  writableMember
} from './store'
import { columns, entries as projects, tasks } from './workSchema'

export { playbook } from './playbooks'

const idQuery = z.object({ id: z.uuid() })
const profile = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: z.enum(ROLES),
    adapter: z.enum(ADAPTERS),
    reports_to: z.uuid().nullable(),
    instructions: z.string().max(20000),
    playbook_ids: playbookIds.optional(),
    budget_cents: z.number().int().min(0).max(100000000)
  })
  .strict()
const workInput = z
  .object({
    assignee_id: z.uuid().nullable(),
    priority: z.enum(['low', 'medium', 'high']),
    blockers: z
      .array(z.uuid())
      .max(40)
      .refine(v => new Set(v).size === v.length),
    context: z
      .array(z.string().regex(/^(document|record|note):[0-9a-f-]{36}$/))
      .max(40)
      .refine(v => new Set(v).size === v.length),
    expected_revision: z.number().int().min(0),
    auto_dispatch: z.boolean().default(false),
    run_budget_cents: z.number().int().min(0).max(10000000).default(0),
    auto_approve: z.boolean().default(false)
  })
  .strict()
const runOutput = z.object({
  task_title: z.string(),
  id: z.uuid(),
  task_id: z.uuid(),
  principal_id: z.uuid(),
  status: z.enum(RUN_STATES),
  estimated_cents: z.number(),
  cost_cents: z.number(),
  result: z.string(),
  error: z.string(),
  decision_note: z.string(),
  created: z.string(),
  heartbeat_at: z.string().nullable(),
  lease_expires: z.string().nullable(),
  adapter: z.enum(ADAPTERS),
  auto_approve: z.boolean(),
  playbooks: z.array(
    playbookOutput.omit({
      archived: true,
      instructions: true,
      description: true
    })
  ),
  quality_report: z.array(qualityOutput)
})

const snapshotOutput = z.object({
  playbooks: z.array(playbookOutput),
  principals: z.array(
    profile.extend({
      id: z.uuid(),
      kind: z.enum(['human', 'agent']),
      status: z.enum(['active', 'paused']),
      revision: z.number().int()
    })
  ),
  projects: z.array(z.object({ id: z.uuid(), name: z.string() })),
  members: z.array(
    z.object({
      id: z.uuid(),
      principal_id: z.uuid(),
      project_id: z.uuid(),
      role: z.enum(ROLES)
    })
  ),
  tasks: z.array(
    z.object({
      id: z.uuid(),
      task_id: z.uuid(),
      project_id: z.uuid(),
      title: z.string(),
      content: z.string(),
      completed: z.boolean(),
      assignee_id: z.uuid().nullable(),
      status: z.enum(WORK_STATES),
      priority: z.enum(['low', 'medium', 'high']),
      revision: z.number().int(),
      blockers: z.array(z.uuid()),
      context: z.array(z.string()),
      auto_dispatch: z.boolean(),
      run_budget_cents: z.number(),
      auto_approve: z.boolean()
    })
  ),
  runs: z.array(runOutput),
  activity: z.array(
    z.object({
      id: z.uuid(),
      actor_id: z.uuid(),
      task_id: z.uuid().nullable(),
      run_id: z.uuid().nullable(),
      action: z.string(),
      message: z.string(),
      created: z.string()
    })
  ),
  credentials: z.array(
    z.object({
      id: z.uuid(),
      principal_id: z.uuid(),
      name: z.string(),
      expires: z.string(),
      revoked: z.boolean(),
      last_used: z.string().nullable()
    })
  ),
  pages: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      kind: z.enum(['document', 'record', 'note', 'redraw'])
    })
  ),
  usage: z.array(
    z.object({
      principal_id: z.uuid(),
      spent_cents: z.number().int(),
      reserved_cents: z.number().int()
    })
  )
}) satisfies z.ZodType<AgentSnapshot>

export const snapshot = endpoints
  .query({
    description:
      'Workspace people, agents, project assignments and run activity',
    output: { OK: snapshotOutput }
  })
  .callback(async ({ db, res, response }) => {
    const who = await actor(db, res.locals)

    return response.ok(await readSnapshot(db, who))
  })

export const people = {
  create: endpoints
    .mutation({
      description: 'Register an agent as a workspace principal',
      input: { body: profile },
      output: { CREATED: z.object({ id: z.uuid() }) }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals)
      await assertManager(db, who.owner, null, body.reports_to)
      const { playbook_ids, ...profile } = body
      const [person] = await db
        .insert(principals)
        .values({ ...profile, owner_id: who.owner, kind: 'agent' })
        .returning()

      if (!person) return fail('Agent could not be created', 500)
      await replacePlaybooks(db, who.owner, person.id, playbook_ids ?? [])
      await audit(db, who, 'agent.created', person.name)

      return response.created({ id: person.id })
    }),
  update: endpoints
    .mutation({
      description: 'Update an agent with revision protection',
      input: {
        query: idQuery,
        body: profile.extend({
          expected_revision: z.number().int().positive(),
          status: z.enum(['active', 'paused'])
        })
      },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals),
        existing = await principal(db, who.owner, query.id)

      if (existing.kind !== 'agent')
        fail('The owner profile cannot be edited here', 403)
      if (existing.revision !== body.expected_revision)
        fail('Agent changed. Reload before saving.')
      await assertManager(db, who.owner, existing.id, body.reports_to)
      const activeRuns = await db
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.owner_id, who.owner),
            eq(runs.principal_id, existing.id),
            inArray(runs.status, ['queued', 'running', 'review'])
          )
        )

      if (existing.adapter !== body.adapter && activeRuns.length)
        fail('Cancel active runs before changing adapters')

      if (body.status === 'paused' || body.role === 'observer') {
        for (const run of activeRuns)
          await cancelActive(
            db,
            who,
            run.task_id,
            'Agent paused or changed to observer'
          )
      }

      const spent = await usage(db, who.owner, existing.id)

      if (body.budget_cents < spent.spent_cents + spent.reserved_cents)
        fail('Budget must cover current spend and reservations')

      const { expected_revision: _expected, playbook_ids, ...updates } = body

      if (playbook_ids)
        await replacePlaybooks(db, who.owner, existing.id, playbook_ids)
      await db
        .update(principals)
        .set({ ...updates, revision: existing.revision + 1 })
        .where(eq(principals.id, existing.id))
      await audit(db, who, 'agent.updated', existing.name)

      return response.noContent()
    })
}

export const project = {
  create: endpoints
    .mutation({
      description: 'Create a project in the shared Projects module',
      input: {
        body: z
          .object({
            name: z.string().trim().min(1).max(255),
            description: z.string().max(100000)
          })
          .strict()
      },
      output: { CREATED: z.object({ id: z.uuid() }) }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals)
      const [row] = await db
        .insert(projects)
        .values({
          ...body,
          owner_id: who.owner,
          icon: 'tabler:briefcase',
          color: '#f58a38'
        })
        .returning()

      if (!row) return fail('Project could not be created', 500)
      await db.insert(columns).values({
        owner_id: who.owner,
        project_id: row.id,
        name: 'Inbox',
        icon: 'tabler:inbox',
        color: '#f58a38'
      })
      await audit(db, who, 'project.created', row.name)

      return response.created({ id: row.id })
    }),
  membership: endpoints
    .mutation({
      description: 'Grant, change or revoke project access for an agent',
      input: {
        body: z
          .object({
            project_id: z.uuid(),
            principal_id: z.uuid(),
            role: z.enum(ROLES).nullable()
          })
          .strict()
      },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals)
      await ownedProject(db, who.owner, body.project_id)
      const person = await principal(db, who.owner, body.principal_id)

      if (person.kind !== 'agent')
        fail('The owner already has project access', 400)

      if (body.role === null || body.role === 'observer') {
        const activeTasks = await db
          .select({ id: tasks.id })
          .from(tasks)
          .innerJoin(columns, eq(tasks.column_id, columns.id))
          .where(
            and(
              eq(tasks.owner_id, who.owner),
              eq(columns.owner_id, who.owner),
              eq(columns.project_id, body.project_id)
            )
          )

        for (const task of activeTasks) {
          const [work] = await db
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.task_id, task.id),
                eq(assignments.owner_id, who.owner)
              )
            )

          if (work?.assignee_id === person.id)
            await cancelActive(
              db,
              who,
              task.id,
              'Project contributor access revoked'
            )
        }
      }
      await db
        .delete(members)
        .where(
          and(
            eq(members.owner_id, who.owner),
            eq(members.principal_id, person.id),
            eq(members.project_id, body.project_id)
          )
        )
      if (body.role)
        await db.insert(members).values({
          owner_id: who.owner,
          principal_id: person.id,
          project_id: body.project_id,
          role: body.role
        })
      await audit(
        db,
        who,
        'project.access_changed',
        `${person.name}: ${body.role ?? 'revoked'}`
      )

      return response.noContent()
    })
}

export const work = {
  create: endpoints
    .mutation({
      description: 'Create a shared project task',
      input: {
        body: z
          .object({
            project_id: z.uuid(),
            title: z.string().trim().min(1).max(255),
            content: z.string().max(100000)
          })
          .strict()
      },
      output: { CREATED: z.object({ id: z.uuid() }) }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals)
      await ownedProject(db, who.owner, body.project_id)
      const [column] = await db
        .select()
        .from(columns)
        .where(
          and(
            eq(columns.owner_id, who.owner),
            eq(columns.project_id, body.project_id)
          )
        )
        .orderBy(asc(columns.created))
        .limit(1)

      if (!column)
        fail('Create a project board column before adding a task', 400)

      const [task] = await db
        .insert(tasks)
        .values({
          owner_id: who.owner,
          column_id: column.id,
          title: body.title,
          content: body.content
        })
        .returning()

      if (!task) return fail('Task could not be created', 500)
      await db
        .insert(assignments)
        .values({ owner_id: who.owner, task_id: task.id })
      await audit(db, who, 'task.created', task.title, task.id)

      return response.created({ id: task.id })
    }),
  assign: endpoints
    .mutation({
      description:
        'Assign people or agents, dependencies and owned knowledge context',
      input: { query: idQuery, body: workInput },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals),
        source = await sourceTask(db, who.owner, query.id)
      const [old] = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.owner_id, who.owner),
            eq(assignments.task_id, query.id)
          )
        )

      if ((old?.revision ?? 0) !== body.expected_revision)
        fail('Assignment changed. Reload before saving.')

      const active = await db
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.owner_id, who.owner),
            eq(runs.task_id, query.id),
            inArray(runs.status, ['queued', 'running', 'review'])
          )
        )

      if (active.length)
        fail('Cancel the active run before changing this assignment')
      if (body.assignee_id)
        await writableMember(db, who.owner, body.assignee_id, source.projectId)

      if (body.auto_dispatch || body.auto_approve) {
        if (!body.assignee_id)
          fail('Assign an agent before enabling automation', 400)

        const selected = await principal(db, who.owner, body.assignee_id)

        if (
          selected.kind !== 'agent' ||
          (body.auto_dispatch && selected.adapter === 'planner')
        )
          fail('Automatic dispatch requires a connected worker', 400)
      }

      const updates = {
        assignee_id: body.assignee_id,
        priority: body.priority,
        auto_dispatch: body.auto_dispatch,
        run_budget_cents: body.run_budget_cents,
        auto_approve: body.auto_approve,
        status: source.task.completed ? ('done' as const) : ('ready' as const),
        revision: (old?.revision ?? 0) + 1
      }

      if (old)
        await db
          .update(assignments)
          .set(updates)
          .where(eq(assignments.id, old.id))
      else
        await db
          .insert(assignments)
          .values({ ...updates, owner_id: who.owner, task_id: query.id })
      await replaceDependencies(
        db,
        who,
        query.id,
        source.projectId,
        body.blockers
      )
      await replaceContext(db, who, query.id, body.context)
      await audit(
        db,
        who,
        'task.assigned',
        body.assignee_id
          ? (await principal(db, who.owner, body.assignee_id)).name
          : 'Unassigned',
        query.id
      )

      return response.noContent()
    }),
  comment: endpoints
    .mutation({
      description: 'Add an owner comment to task activity',
      input: {
        query: idQuery,
        body: z.object({ message: z.string().trim().min(1).max(8000) }).strict()
      },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals)
      await sourceTask(db, who.owner, query.id)
      await audit(db, who, 'task.comment', body.message, query.id)

      return response.noContent()
    })
}

export const run = {
  get: endpoints
    .query({
      description: 'Read an owned run beyond the recent workspace snapshot',
      input: { query: idQuery },
      output: { OK: runOutput }
    })
    .callback(async ({ db, res, query, response }) => {
      const who = await actor(db, res.locals)

      return response.ok(publicRun(await ownedRun(db, who, query.id)))
    }),
  queue: endpoints
    .mutation({
      description: 'Dispatch an idempotent task run with budget reservation',
      input: {
        query: idQuery,
        body: z
          .object({
            expected_revision: z.number().int().positive(),
            request_key: z.uuid(),
            estimated_cents: z.number().int().min(0).max(10000000)
          })
          .strict()
      },
      output: { CREATED: runOutput }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals)

      return response.created(
        publicRun(
          await queue(
            db,
            who,
            query.id,
            body.expected_revision,
            body.request_key,
            body.estimated_cents
          )
        )
      )
    }),
  plan: endpoints
    .mutation({
      description: 'Execute the built-in deterministic workspace planner',
      input: { query: idQuery },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, response }) => {
      const who = await actor(db, res.locals),
        queued = await ownedRun(db, who, query.id),
        person = await principal(db, who.owner, queued.principal_id)

      if (person.adapter !== 'planner')
        fail('This run needs a connected external worker', 400)

      const claimed = await claim(db, who, query.id),
        agentActor = { ...who, id: person.id, kind: 'agent' as const }
      const result = `# ${queued.task_snapshot.title}\n\nBuilt-in workspace planner · ${person.name}\n\n## Brief\n${contentText(queued.task_snapshot.content) || 'No additional task details.'}\n\n## Working instructions\n${queued.instructions_snapshot || 'Prepare a practical plan and submit it for review.'}\n\n## Linked context\n${queued.context_snapshot.map(p => `- ${p.title} (${p.key})\n  ${p.content.slice(0, 800).replaceAll('\n', ' ')}`).join('\n') || 'No context pages linked.'}\n\n## Plan\n- [ ] Confirm the intended outcome and constraints.\n- [ ] Work through the brief using the linked context.\n- [ ] Verify the result against the task requirements.\n- [ ] Submit evidence and remaining questions for human review.\n\nThis local adapter organizes the task; it does not invoke an AI model or perform the checklist work.`
      await complete(db, agentActor, query.id, claimed.lease, result, 0)

      return response.noContent()
    }),
  cancel: endpoints
    .mutation({
      description: 'Cancel an active run and invalidate its worker lease',
      input: { query: idQuery },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, response }) => {
      const who = await actor(db, res.locals),
        current = await ownedRun(db, who, query.id)

      if (!['queued', 'running', 'review'].includes(current.status))
        fail('This run is already closed')
      await cancelActive(
        db,
        who,
        current.task_id,
        'Cancelled by workspace owner'
      )

      return response.noContent()
    }),
  review: endpoints
    .mutation({
      description: 'Approve or reject an agent result as the human owner',
      input: {
        query: idQuery,
        body: z
          .object({ approve: z.boolean(), note: z.string().max(8000) })
          .strict()
      },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals),
        current = await ownedRun(db, who, query.id)

      if (current.status !== 'review')
        fail('This run is no longer waiting for review')

      if (body.approve) {
        await validateRunAccess(db, who, current)
        await db
          .update(tasks)
          .set({
            completed: true,
            updated: sql`greatest(now()::timestamp, ${tasks.updated} + interval '1 millisecond')`
          })
          .where(
            and(eq(tasks.id, current.task_id), eq(tasks.owner_id, who.owner))
          )
      }
      await db
        .update(runs)
        .set({
          status: body.approve ? 'approved' : 'rejected',
          decision_note: body.note
        })
        .where(eq(runs.id, current.id))
      await recordUsage(
        db,
        current,
        undefined,
        current.cost_cents,
        body.approve ? 'approved' : 'rejected'
      )
      await setWorkState(
        db,
        who.owner,
        current.task_id,
        body.approve ? 'done' : 'blocked'
      )
      await audit(
        db,
        who,
        body.approve ? 'run.approved' : 'run.rejected',
        body.note,
        current.task_id,
        current.id
      )

      return response.noContent()
    })
}

export const accessKeys = {
  create: endpoints
    .mutation({
      description:
        'Issue a scoped machine credential; plaintext is returned once',
      input: {
        body: z
          .object({
            principal_id: z.uuid(),
            name: z.string().trim().min(1).max(120),
            days: z.number().int().min(1).max(30)
          })
          .strict()
      },
      output: {
        CREATED: z.object({
          id: z.uuid(),
          token: z.string(),
          expires: z.string()
        })
      }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals),
        person = await principal(db, who.owner, body.principal_id)

      if (
        person.kind !== 'agent' ||
        person.adapter === 'planner' ||
        person.status !== 'active'
      )
        fail('Choose an active external agent', 400)

      const token = createAgentToken(who.owner),
        expires = new Date(Date.now() + body.days * 86400000)
      await db.insert(credentials).values({
        id: token.id,
        owner_id: who.owner,
        principal_id: person.id,
        name: body.name,
        token_hash: token.token_hash,
        expires
      })
      await audit(db, who, 'credential.created', `${person.name}: ${body.name}`)

      return response.created({
        id: token.id,
        token: token.token,
        expires: expires.toISOString()
      })
    }),
  revoke: endpoints
    .mutation({
      description: 'Revoke a machine credential immediately',
      input: { query: idQuery },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, response }) => {
      const who = await actor(db, res.locals)
      const [existing] = await db
        .select()
        .from(credentials)
        .where(
          and(eq(credentials.id, query.id), eq(credentials.owner_id, who.owner))
        )

      if (!existing) fail('Credential not found', 404)
      await db
        .update(credentials)
        .set({ revoked: true })
        .where(eq(credentials.id, query.id))
      const held = await db
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.owner_id, who.owner),
            eq(runs.credential_id, query.id),
            eq(runs.status, 'running')
          )
        )

      for (const current of held)
        await cancelActive(
          db,
          who,
          current.task_id,
          'Worker credential revoked'
        )
      await audit(db, who, 'credential.revoked', existing.name)

      return response.noContent()
    })
}

export const metering = {
  list: endpoints
    .query({
      description:
        'Durable token and cost history with filtered aggregate totals',
      input: {
        query: z.object({
          principal_id: z.uuid().optional(),
          month: z
            .string()
            .regex(/^20\d{2}-(0[1-9]|1[0-2])$/)
            .optional(),
          offset: z.coerce.number().int().min(0).max(1000000).default(0),
          limit: z.coerce.number().int().min(1).max(100).default(50)
        })
      },
      output: {
        OK: z.object({
          rows: z.array(usageOutput),
          has_more: z.boolean(),
          totals: z.object({
            runs: z.number(),
            metered_runs: z.number(),
            input_tokens: z.number(),
            cached_input_tokens: z.number(),
            output_tokens: z.number(),
            total_tokens: z.number(),
            cost_cents: z.number()
          })
        })
      }
    })
    .callback(async ({ db, res, query, response }) => {
      const who = await actor(db, res.locals)

      return response.ok(await usageHistory(db, who.owner, query))
    })
}
