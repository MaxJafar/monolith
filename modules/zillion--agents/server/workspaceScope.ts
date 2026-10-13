import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

import { ClientError, type ForgeContract } from '@lifeforge/server-utils'

import { drainNativeChanges } from '../../zillion--databases/server/itemBridge'
import {
  bases,
  recordSources,
  records
} from '../../zillion--databases/server/schema.drizzle'
import {
  type Store as WorkspaceStore,
  inWorkspace,
  workspaceAccess
} from '../../zillion--databases/server/workspaceStore'
import type { AgentSnapshot } from '../shared'
import { assignments, runs } from './schema.drizzle'

/** Agent identities are reusable; projects, work and run activity belong to a workspace. */
export function scopeAgentRoutes<T>(tree: T, path: string[] = []): T {
  if (!tree || typeof tree !== 'object') return tree
  if ('__isForgeContract' in tree) {
    const route = tree as unknown as ForgeContract,
      config = route.getValue()
    return {
      ...route,
      getValue() {
        return {
          ...config,
          schema: {
            ...config.schema,
            query: (
              (config.schema.query as z.ZodObject) ?? z.object({})
            ).extend({ workspace_id: z.string().uuid().optional() })
          },
          callback: async (context: Parameters<typeof config.callback>[0]) => {
            const query = context.query as Record<string, unknown>,
              workspaceId = query.workspace_id
            if (typeof workspaceId !== 'string') return config.callback(context)
            const owner = String(context.res.locals.userId ?? ''),
              db = context.db as WorkspaceStore
            const workspace = await workspaceAccess(
              db,
              owner,
              workspaceId,
              config.method !== 'get'
            )
            if (workspace.owner_id !== owner)
              throw new ClientError(
                'Agent controls are managed by the workspace owner',
                403
              )
            if (!workspace.enabled_modules.includes('agents'))
              throw new ClientError(
                'Agents are excluded from this workspace',
                403
              )
            return inWorkspace(db, workspace.id, async () => {
              await drainNativeChanges(db, owner)
              const source = await db
                .select({
                  kind: recordSources.kind,
                  native_id: recordSources.native_id
                })
                .from(recordSources)
                .innerJoin(records, eq(recordSources.record_id, records.id))
                .innerJoin(bases, eq(records.base_id, bases.id))
                .where(
                  and(
                    eq(bases.workspace_id, workspace.id),
                    eq(recordSources.owner_id, owner)
                  )
                )
              const projects = new Set(
                source
                  .filter(item => item.kind === 'project')
                  .map(item => item.native_id)
              )
              const tasks = new Set(
                source
                  .filter(item => item.kind === 'project-task')
                  .map(item => item.native_id)
              )
              const work = tasks.size
                ? await db
                    .select()
                    .from(assignments)
                    .where(
                      and(
                        eq(assignments.owner_id, owner),
                        inArray(assignments.task_id, [...tasks])
                      )
                    )
                : []
              const workIds = new Set(work.map(item => item.id))
              const scopedRuns = workIds.size
                ? await db
                    .select()
                    .from(runs)
                    .where(
                      and(
                        eq(runs.owner_id, owner),
                        inArray(runs.task_id, [...workIds])
                      )
                    )
                : []
              const runIds = new Set(scopedRuns.map(run => run.id))
              const body = context.body as Record<string, unknown> | undefined
              if (
                typeof body?.project_id === 'string' &&
                !projects.has(body.project_id)
              )
                throw new ClientError(
                  'Project not found in this workspace',
                  404
                )
              if (typeof query.id === 'string') {
                const target =
                  path[0] === 'work' ||
                  (path[0] === 'run' && path[1] === 'queue')
                    ? tasks
                    : ['run', 'runtime'].includes(path[0] ?? '')
                      ? runIds
                      : null
                if (target && !target.has(query.id))
                  throw new ClientError(
                    'Work item not found in this workspace',
                    404
                  )
              }
              for (const blocker of (body?.blockers ?? []) as string[])
                if (!tasks.has(blocker))
                  throw new ClientError(
                    'Dependency belongs to another workspace',
                    404
                  )
              const result = await config.callback(context)
              if (result.$status >= 400) return result
              await drainNativeChanges(db, owner, true)
              if (path[0] === 'snapshot') {
                const snapshot = result.payload as AgentSnapshot
                return {
                  ...result,
                  payload: {
                    ...snapshot,
                    projects: snapshot.projects.filter(item =>
                      projects.has(item.id)
                    ),
                    members: snapshot.members.filter(member =>
                      projects.has(member.project_id)
                    ),
                    tasks: snapshot.tasks.filter(task =>
                      tasks.has(task.task_id)
                    ),
                    runs: snapshot.runs.filter(run => runIds.has(run.id)),
                    activity: snapshot.activity.filter(
                      event =>
                        (event.task_id && tasks.has(event.task_id)) ||
                        (event.run_id && runIds.has(event.run_id))
                    )
                  }
                }
              }
              if (
                path.join('/') === 'runtime/inbox' &&
                Array.isArray(result.payload)
              )
                return {
                  ...result,
                  payload: result.payload.filter(run =>
                    workIds.has(run.task_id)
                  )
                }
              return result
            })
          }
        }
      }
    } as T
  }
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      scopeAgentRoutes(value, [...path, key])
    ])
  ) as T
}
