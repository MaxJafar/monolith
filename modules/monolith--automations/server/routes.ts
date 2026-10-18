import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { ClientError } from '@monolith/server-utils'

import endpoints from '../../monolith--databases/server/endpoints'
import { ownerId } from '../../monolith--databases/server/model'
import {
  type Store,
  workspaceAccess
} from '../../monolith--databases/server/workspaceStore'
import {
  payloadSchema,
  runSchema,
  scopeSchema,
  validateGraph,
  workflowSchema
} from '../shared'
import { executeGraph } from './engine'
import { requestHTTP } from './http'
import { runs, workflows } from './schema.drizzle'

const row = (value: typeof workflows.$inferSelect) => ({
  ...value,
  created: value.created.toISOString(),
  updated: value.updated.toISOString()
})
const identity = scopeSchema.extend({ id: z.string().uuid() })
const draft = workflowSchema.pick({
  title: true,
  description: true,
  graph: true,
  interval_minutes: true
})

async function access(
  db: Store,
  actor: string,
  workspace: string,
  write = false
) {
  const scope = await workspaceAccess(db, actor, workspace, write)
  if (!scope.enabled_modules.includes('automations'))
    throw new ClientError('Enable Automations in this workspace first', 403)
  return scope
}
export const list = endpoints
  .query({
    description: 'List workspace automations',
    input: { query: scopeSchema },
    output: { OK: z.array(workflowSchema) }
  })
  .callback(async ({ db, res, query, response }) => {
    await access(db, ownerId(res), query.workspace_id)
    return response.ok(
      (
        await db
          .select()
          .from(workflows)
          .where(eq(workflows.workspace_id, query.workspace_id))
          .orderBy(desc(workflows.updated))
      ).map(row)
    )
  })
export const create = endpoints
  .mutation({
    description: 'Create a disabled workflow',
    input: { query: scopeSchema, body: draft },
    output: { OK: workflowSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const scope = await access(db, ownerId(res), query.workspace_id, true)
    const graph = validateGraph(body.graph)
    const [value] = await db
      .insert(workflows)
      .values({
        ...body,
        graph,
        owner_id: scope.owner_id,
        workspace_id: scope.id
      })
      .returning()
    return response.ok(row(value!))
  })
export const save = endpoints
  .mutation({
    description: 'Save a workflow at its current revision',
    input: {
      query: identity,
      body: draft.extend({
        expected_revision: z.number().int().positive(),
        enabled: z.boolean()
      })
    },
    output: { OK: workflowSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    await access(db, ownerId(res), query.workspace_id, true)
    const { expected_revision, ...changes } = body
    const graph = validateGraph(changes.graph)
    const [value] = await db
      .update(workflows)
      .set({
        ...changes,
        graph,
        revision: sql`${workflows.revision}+1`,
        updated: sql`now()`,
        next_run:
          changes.enabled && changes.interval_minutes > 0
            ? sql`now()+${changes.interval_minutes}*interval '1 minute'`
            : null
      })
      .where(
        and(
          eq(workflows.workspace_id, query.workspace_id),
          eq(workflows.id, query.id),
          eq(workflows.revision, expected_revision)
        )
      )
      .returning()
    if (!value)
      throw new ClientError(
        'Workflow changed in another session. Export your draft and reload.',
        409
      )
    return response.ok(row(value))
  })
export const remove = endpoints
  .mutation({
    description: 'Delete workflow and its execution history',
    input: {
      query: identity,
      body: z.object({ expected_revision: z.number().int().positive() })
    },
    output: { OK: z.boolean() }
  })
  .callback(async ({ db, res, query, body, response }) => {
    await access(db, ownerId(res), query.workspace_id, true)
    const result = await db
      .delete(workflows)
      .where(
        and(
          eq(workflows.workspace_id, query.workspace_id),
          eq(workflows.id, query.id),
          eq(workflows.revision, body.expected_revision)
        )
      )
      .returning({ id: workflows.id })
    if (!result.length)
      throw new ClientError('Workflow changed or no longer exists', 409)
    return response.ok(true)
  })
export const history = endpoints
  .query({
    description: 'Read the latest 50 workflow executions',
    input: { query: identity },
    output: { OK: z.array(runSchema) }
  })
  .callback(async ({ db, res, query, response }) => {
    await access(db, ownerId(res), query.workspace_id)
    const values = await db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.workspace_id, query.workspace_id),
          eq(runs.workflow_id, query.id)
        )
      )
      .orderBy(desc(runs.started))
      .limit(50)
    return response.ok(
      values.map(v => ({
        ...v.result,
        id: v.id,
        workflow_id: v.workflow_id,
        revision: v.revision,
        trigger: v.trigger,
        started: v.started.toISOString()
      }))
    )
  })
export const run = endpoints
  .mutation({
    description:
      'Execute saved workflow with authenticated input; event runs require an enabled workflow',
    input: {
      query: identity,
      body: z.object({
        input: payloadSchema,
        trigger: z.enum(['manual', 'event']).default('manual'),
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: runSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    await access(db, ownerId(res), query.workspace_id, true)
    // A transaction-scoped lock prevents simultaneous runs and conflicts with edits.
    const [lock] = await db.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtextextended(${query.id},0)) as locked`
    )
    if (!lock?.locked)
      throw new ClientError('This workflow is already running', 409)
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.workspace_id, query.workspace_id),
          eq(workflows.id, query.id)
        )
      )
      .for('update')
    if (!workflow) throw new ClientError('Workflow not found', 404)
    if (workflow.revision !== body.expected_revision)
      throw new ClientError(
        'Save or reload the latest workflow before running',
        409
      )
    if (body.trigger === 'event' && !workflow.enabled)
      throw new ClientError('This workflow is paused', 409)
    const result = await executeGraph(workflow.graph, body.input, requestHTTP)
    const [record] = await db
      .insert(runs)
      .values({
        owner_id: workflow.owner_id,
        workspace_id: workflow.workspace_id,
        workflow_id: workflow.id,
        revision: workflow.revision,
        trigger: body.trigger,
        result
      })
      .returning()
    return response.ok({
      ...result,
      id: record!.id,
      workflow_id: workflow.id,
      revision: workflow.revision,
      trigger: body.trigger,
      started: record!.started.toISOString()
    })
  })
