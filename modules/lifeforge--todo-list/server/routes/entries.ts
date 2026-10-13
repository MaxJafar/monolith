import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lt,
  lte,
  or,
  sql
} from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { requireResult } from '@lifeforge/server-utils'

import forge from '../forge'
import {
  todoEntries,
  todoLists,
  todoPriorities,
  todoTags
} from '../schema.drizzle'

dayjs.extend(utc)

const entryDto = createSelectSchema(todoEntries).extend({
  tags: z.array(z.string())
})

const entryInputDto = z.object({
  summary: z.string().trim().min(1),
  notes: z.string().optional(),
  due_date: z
    .string()
    .refine(value => !value || dayjs(value).isValid(), 'Invalid due date')
    .optional(),
  due_date_has_time: z.boolean().optional(),
  list: z
    .union([forge.existsIn(z.string().uuid(), todoLists), z.literal('')])
    .optional(),
  tags: forge.existsIn(z.array(z.string().uuid()), todoTags).optional(),
  priority: z
    .union([forge.existsIn(z.string().uuid(), todoPriorities), z.literal('')])
    .optional()
})

function statusCondition(status: string) {
  const now = dayjs().utc()

  switch (status) {
    case 'today':
      return and(
        eq(todoEntries.done, false),
        isNotNull(todoEntries.due_date),
        gte(todoEntries.due_date, dayjs().startOf('day').utc().toDate()),
        lte(
          todoEntries.due_date,
          dayjs().endOf('day').utc().add(1, 'second').toDate()
        )
      )
    case 'scheduled':
      return and(
        eq(todoEntries.done, false),
        isNotNull(todoEntries.due_date),
        gte(todoEntries.due_date, now.toDate())
      )
    case 'overdue':
      return and(
        eq(todoEntries.done, false),
        isNotNull(todoEntries.due_date),
        lt(todoEntries.due_date, now.toDate())
      )
    case 'completed':
      return eq(todoEntries.done, true)
    default:
      return eq(todoEntries.done, false)
  }
}

function mapEntry(body: z.infer<typeof entryInputDto>) {
  let dueDate: Date | null = null

  if (body.due_date) {
    dueDate = body.due_date_has_time
      ? new Date(body.due_date)
      : dayjs(body.due_date).endOf('day').toDate()
  }

  return {
    summary: body.summary,
    notes: body.notes ?? '',
    due_date: dueDate,
    due_date_has_time: body.due_date_has_time ?? false,
    list: body.list || null,
    tags: body.tags ?? [],
    priority: body.priority || null
  }
}

export const getStatusCounter = forge
  .query({
    description: 'Get todo counts by status',
    output: {
      OK: z.object({
        all: z.number(),
        today: z.number(),
        scheduled: z.number(),
        overdue: z.number(),
        completed: z.number()
      })
    }
  })
  .callback(async ({ db, response }) => {
    const statuses = ['all', 'today', 'scheduled', 'overdue', 'completed']

    const counters: Record<string, number> = {}

    for (const status of statuses) {
      const [row] = await db
        .select({ value: count() })
        .from(todoEntries)
        .where(statusCondition(status))

      counters[status] = row?.value ?? 0
    }

    return response.ok(counters as never)
  })

export const getById = forge
  .query({
    description: 'Get a specific todo by ID',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoEntries)
      })
    },
    output: {
      OK: entryDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const entry = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )

    return response.ok(entry)
  })

export const list = forge
  .query({
    description: 'Get todos with filters',
    input: {
      query: z.object({
        list: z.string().optional(),
        status: z.string().optional().default('all'),
        priority: z.string().optional(),
        tag: z.string().optional(),
        query: z.string().optional()
      })
    },
    output: {
      OK: z.array(entryDto)
    }
  })
  .callback(
    async ({ db, query: { status, tag, list, priority, query }, response }) => {
      const conditions = [statusCondition(status)]

      if (tag) {
        conditions.push(sql`jsonb_exists(${todoEntries.tags}, ${tag})`)
      }

      if (list) {
        conditions.push(eq(todoEntries.list, list))
      }

      if (priority) {
        conditions.push(eq(todoEntries.priority, priority))
      }

      if (query) {
        conditions.push(
          or(
            ilike(todoEntries.summary, `%${query}%`),
            ilike(todoEntries.notes, `%${query}%`)
          )
        )
      }

      const rows = await db
        .select()
        .from(todoEntries)
        .where(and(...conditions))
        .orderBy(desc(todoEntries.created))

      return response.ok(rows)
    }
  )

export const create = forge
  .mutation({
    description: 'Create a new todo',
    input: {
      body: entryInputDto
    },
    output: {
      CREATED: entryDto
    }
  })
  .callback(async ({ db, body, response }) => {
    const created = requireResult(
      (await db.insert(todoEntries).values(mapEntry(body)).returning())[0],
      'Insert returned no row',
      500
    )

    return response.created(created)
  })

export const update = forge
  .mutation({
    description: 'Update todo details',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoEntries)
      }),
      body: entryInputDto
    },
    output: {
      OK: entryDto
    }
  })
  .callback(async ({ db, query: { id }, body, response }) => {
    const updated = requireResult(
      (
        await db
          .update(todoEntries)
          .set({ ...mapEntry(body), updated: new Date() })
          .where(eq(todoEntries.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })

export const remove = forge
  .mutation({
    description: 'Delete a todo',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoEntries)
      })
    },
    output: {
      NO_CONTENT: true
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    await db.delete(todoEntries).where(eq(todoEntries.id, id))

    return response.noContent()
  })

export const toggleEntry = forge
  .mutation({
    description: 'Toggle todo completion status',
    input: {
      query: z.object({
        id: forge.existsIn(z.string(), todoEntries)
      })
    },
    output: {
      OK: entryDto
    }
  })
  .callback(async ({ db, query: { id }, response }) => {
    const entry = requireResult(
      await db.query.entries.findFirst({ where: { id } })
    )

    const updated = requireResult(
      (
        await db
          .update(todoEntries)
          .set({
            done: !entry.done,
            completed_at: entry.done ? null : dayjs().utc().toDate(),
            updated: new Date()
          })
          .where(eq(todoEntries.id, id))
          .returning()
      )[0]
    )

    return response.ok(updated)
  })
