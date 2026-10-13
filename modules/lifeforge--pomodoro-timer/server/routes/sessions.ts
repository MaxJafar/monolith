import { and, count, desc, eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import type { BuiltModuleSchema } from '@lifeforge/drizzle'
import { requireResult } from '@lifeforge/server-utils'

import forge, { type PomodoroTimerSchema } from '../forge'
import { pomodoroSessions, pomodoroSubSessions } from '../schema.drizzle'

const sessionStatusDto = createSelectSchema(pomodoroSessions).shape.status
const subSessionTypeDto = createSelectSchema(pomodoroSubSessions).shape.type

const sessionDto = createSelectSchema(pomodoroSessions)

const subSessionDto = createSelectSchema(pomodoroSubSessions)

const sessionAggregatedDto = z.object({
  id: z.string(),
  workDuration: z.number(),
  shortBreakDuration: z.number(),
  longBreakDuration: z.number(),
  sessionUntilLongBreak: z.number(),
  name: z.string(),
  status: sessionStatusDto,
  created: z.date(),
  pomodoroCount: z.number(),
  totalTimeElapsed: z.number()
})

async function fetchAggregated(
  db: PostgresJsDatabase<BuiltModuleSchema<PomodoroTimerSchema>>,
  id?: string
) {
  const base = db
    .select({
      id: pomodoroSessions.id,
      workDuration: pomodoroSessions.workDuration,
      shortBreakDuration: pomodoroSessions.shortBreakDuration,
      longBreakDuration: pomodoroSessions.longBreakDuration,
      sessionUntilLongBreak: pomodoroSessions.sessionUntilLongBreak,
      name: pomodoroSessions.name,
      status: pomodoroSessions.status,
      created: pomodoroSessions.created,
      pomodoroCount: count(pomodoroSubSessions.id),
      totalTimeElapsed:
        sql<number>`COALESCE(SUM(${pomodoroSubSessions.durationElapsed}), 0)`.mapWith(
          Number
        )
    })
    .from(pomodoroSessions)
    .leftJoin(
      pomodoroSubSessions,
      and(
        eq(pomodoroSubSessions.sessionId, pomodoroSessions.id),
        eq(pomodoroSubSessions.type, 'work'),
        eq(pomodoroSubSessions.isCompleted, true)
      )
    )

  const rows = await (id ? base.where(eq(pomodoroSessions.id, id)) : base)
    .groupBy(pomodoroSessions.id)
    .orderBy(desc(pomodoroSessions.created))

  return rows
}

export const getById = forge
  .query({
    description: 'Get pomodoro session by ID',
    input: {
      query: z.object({
        id: z.string()
      })
    },
    output: {
      OK: sessionAggregatedDto.extend({
        lastSubSessionType: subSessionTypeDto
      })
    }
  })
  .callback(async ({ query: { id }, db, response }) => {
    const [session] = await fetchAggregated(db, id)

    if (!session) {
      return response.notFound()
    }

    const lastSubSession = await db.query.subSessions.findFirst({
      where: { sessionId: id },
      orderBy: { created: 'desc' }
    })

    return response.ok({
      ...session,
      lastSubSessionType: lastSubSession?.type ?? 'short_break'
    })
  })

export const list = forge
  .query({
    description: 'List all pomodoro sessions',
    output: {
      OK: z.array(sessionAggregatedDto)
    }
  })
  .callback(async ({ db, response }) => response.ok(await fetchAggregated(db)))

export const create = forge
  .mutation({
    description: 'Create a new pomodoro session',
    input: {
      body: z.object({
        name: z.string(),
        workDuration: z.number().min(1).max(120),
        shortBreakDuration: z.number().min(1).max(60),
        longBreakDuration: z.number().min(1).max(120),
        sessionUntilLongBreak: z.number().min(1).max(10)
      })
    },
    output: {
      CREATED: sessionDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (
        await db
          .insert(pomodoroSessions)
          .values({
            ...body,
            status: 'new'
          })
          .returning()
      )[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update a pomodoro session',
    input: {
      query: z.object({
        id: z.string()
      }),
      body: z.object({
        name: z.string()
      })
    },
    output: {
      OK: sessionDto
    }
  })
  .callback(async ({ query: { id }, body, db, response }) => {
    const updated = requireResult(
      (
        await db
          .update(pomodoroSessions)
          .set({ name: body.name })
          .where(eq(pomodoroSessions.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const changeStatus = forge
  .mutation({
    description: 'Change status of a pomodoro session',
    input: {
      query: z.object({
        id: z.string()
      }),
      body: z.object({
        status: sessionStatusDto,
        subSessions: z
          .array(
            z.object({
              type: subSessionTypeDto,
              durationElapsed: z.number().finite().nonnegative(),
              ended: z
                .string()
                .refine(
                  value => !Number.isNaN(Date.parse(value)),
                  'Invalid end date'
                ),
              isCompleted: z.boolean()
            })
          )
          .optional(),
        pomodoroCount: z.number().optional()
      })
    },
    output: {
      OK: sessionAggregatedDto
    }
  })
  .callback(
    async ({ query: { id }, body: { status, subSessions }, db, response }) => {
      // Concurrent completion requests must observe the committed session status.
      const [session] = await db
        .select()
        .from(pomodoroSessions)
        .where(eq(pomodoroSessions.id, id))
        .for('update')

      if (!session) {
        return response.notFound()
      }

      if (
        status === 'completed' &&
        session.status !== 'completed' &&
        subSessions &&
        subSessions.length > 0
      ) {
        await db.insert(pomodoroSubSessions).values(
          subSessions.map(subSession => ({
            sessionId: id,
            type: subSession.type,
            durationElapsed: subSession.durationElapsed,
            ended: new Date(subSession.ended),
            isCompleted: subSession.isCompleted
          }))
        )
      }

      await db
        .update(pomodoroSessions)
        .set({ status })
        .where(eq(pomodoroSessions.id, id))

      const [aggregated] = await fetchAggregated(db, id)

      return response.ok(requireResult(aggregated))
    }
  )

export const remove = forge
  .mutation({
    description: 'Delete a pomodoro session',
    input: {
      query: z.object({
        id: z.string()
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ query: { id }, db, response }) => {
    requireResult(
      (
        await db
          .delete(pomodoroSessions)
          .where(eq(pomodoroSessions.id, id))
          .returning()
      )[0]
    )

    return response.noContent()
  })

export const listSubSessions = forge
  .query({
    description: 'List sub-sessions for a pomodoro session',
    input: {
      query: z.object({
        sessionId: z.string()
      })
    },
    output: {
      OK: z.array(subSessionDto)
    }
  })
  .callback(async ({ query: { sessionId }, db, response }) => {
    const session = await db.query.sessions.findFirst({
      where: { id: sessionId }
    })

    if (!session) {
      return response.notFound()
    }

    const subSessions = await db.query.subSessions.findMany({
      where: { sessionId },
      orderBy: { created: 'asc' }
    })

    return response.ok(subSessions)
  })
