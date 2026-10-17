import { and, eq, sql } from 'drizzle-orm'
import z from 'zod'

import {
  type CanvasPage,
  canvasKey,
  validateCanvasPage
} from '@monolith/blocks'
import { ClientError } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

const keySchema = z.string().refine(canvasKey, 'Use a workspace page path')
const pageSchema = z.custom<CanvasPage>(value => {
  try {
    validateCanvasPage(value)

    return true
  } catch {
    return false
  }
}, 'Invalid block page')

export const get = endpoints
  .query({
    description: 'Get an owned block page',
    input: { query: z.object({ key: keySchema }) },
    output: { OK: z.object({ page: pageSchema.nullable() }) }
  })
  .callback(async ({ db, res, query: { key }, response }) => {
    const [user] = await db
      .select({ pages: users.workspacePages })
      .from(users)
      .where(eq(users.id, res.locals.userId as string))
      .limit(1)

    if (!user) return response.unauthorized()

    return response.ok({ page: user.pages[key] ?? null })
  })

export const list = endpoints
  .query({
    description: 'List owned workspace pages',
    input: {},
    output: {
      OK: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          icon: z.string(),
          revision: z.number()
        })
      )
    }
  })
  .callback(async ({ db, res, response }) => {
    const [user] = await db
      .select({ pages: users.workspacePages })
      .from(users)
      .where(eq(users.id, res.locals.userId as string))
      .limit(1)

    if (!user) return response.unauthorized()

    return response.ok(
      Object.entries(user.pages).map(([key, page]) => ({
        key,
        title: page.title,
        icon: page.icon,
        revision: page.revision
      }))
    )
  })

export const save = endpoints
  .mutation({
    description: 'Save an owned block page with optimistic revision protection',
    input: {
      body: z.object({
        key: keySchema,
        page: pageSchema,
        expected_revision: z.number().int().min(0)
      })
    },
    output: { OK: z.object({ page: pageSchema }) }
  })
  .callback(
    async ({ db, res, body: { key, page, expected_revision }, response }) => {
      const saved: CanvasPage = {
        ...page,
        revision: expected_revision + 1,
        updated: new Date().toISOString()
      }
      const [row] = await db
        .update(users)
        .set({
          workspacePages: sql`jsonb_set(coalesce(${users.workspacePages}, '{}'::jsonb), ARRAY[${key}]::text[], ${JSON.stringify(saved)}::jsonb, true)`
        })
        .where(
          and(
            eq(users.id, res.locals.userId as string),
            sql`coalesce((${users.workspacePages}->${key}->>'revision')::integer,0)=${expected_revision}`,
            sql`pg_column_size(coalesce(${users.workspacePages},'{}'::jsonb)) < 10000000`
          )
        )
        .returning({ id: users.id })

      if (!row)
        throw new ClientError(
          'This page changed in another session. Reload before saving.',
          409
        )

      return response.ok({ page: saved })
    }
  )
