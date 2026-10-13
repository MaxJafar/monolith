import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import {
  assignments,
  principals
} from '../../../zillion--agents/server/schema.drizzle'
import forge from '../forge'
import { tasksInput } from '../models'
import { columns, tasks } from '../schema.drizzle'

const output = tasksInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = forge
  .query({
    description: 'List projects tasks belonging to the current user',
    output: {
      OK: z.array(
        output.extend({
          assignee_name: z.string().nullable(),
          agent_state: z.string().nullable()
        })
      )
    }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select({
            task: tasks,
            assignee_name: principals.name,
            agent_state: assignments.status
          })
          .from(tasks)
          .leftJoin(
            assignments,
            and(
              eq(assignments.task_id, tasks.id),
              eq(assignments.owner_id, owner)
            )
          )
          .leftJoin(
            principals,
            and(
              eq(principals.id, assignments.assignee_id),
              eq(principals.owner_id, owner)
            )
          )
          .where(eq(tasks.owner_id, owner))
          .orderBy(desc(tasks.updated))
      ).map(({ task, assignee_name, agent_state }) => ({
        ...output.parse(task),
        assignee_name,
        agent_state
      }))
    )
  })

export const create = forge
  .mutation({
    description: 'create projects tasks',
    input: { body: tasksInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    if (body.column_id) {
      const [target] = await db
        .select()
        .from(columns)
        .where(and(eq(columns.id, body.column_id), eq(columns.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(tasks)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update projects tasks',
    input: { query: z.object({ id: z.uuid() }), body: tasksInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, query.id), eq(tasks.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.column_id) {
      const [target] = await db
        .select()
        .from(columns)
        .where(and(eq(columns.id, body.column_id), eq(columns.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(tasks)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(tasks.id, query.id), eq(tasks.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete projects tasks',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.id, query.id), eq(tasks.owner_id, owner)))
      .returning({ id: tasks.id })

    if (!deleted.length) return response.notFound()

    return response.noContent()
  })
