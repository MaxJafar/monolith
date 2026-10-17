import { ClientError } from '@monolith/server-utils'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import endpoints from '../../monolith--databases/server/endpoints'
import { ownerId } from '../../monolith--databases/server/model'
import {
  type Store,
  withWorkspaceOwner,
  workspaceAccess
} from '../../monolith--databases/server/workspaceStore'
import {
  documentSchema,
  projectSchema,
  saveSchema,
  scopeSchema,
  summarySchema
} from '../shared'
import { projects } from './schema.drizzle'

const row = (value: typeof projects.$inferSelect) => ({
  ...value,
  created: value.created.toISOString(),
  updated: value.updated.toISOString()
})

async function scoped<T>(
  db: Store,
  actor: string,
  workspaceId: string,
  write: boolean,
  action: (owner: string) => Promise<T>
) {
  const workspace = await workspaceAccess(db, actor, workspaceId, write)

  return withWorkspaceOwner(db, actor, workspace.owner_id, () =>
    action(workspace.owner_id)
  )
}

const identity = z.object({
  id: z.string().uuid(),
  expected_revision: z.number().int().positive()
})
const conflict = () =>
  new ClientError(
    'This project changed in another session. Export your draft and reload before saving.',
    409
  )

export const list = endpoints
  .query({
    description: 'List Redraw projects in an accessible workspace',
    input: {
      query: scopeSchema.extend({
        archived: z.enum(['true', 'false']).default('false')
      })
    },
    output: { OK: z.array(summarySchema) }
  })
  .callback(async ({ db, res, query, response }) =>
    scoped(db, ownerId(res), query.workspace_id, false, async () => {
      const values = await db
        .select({
          id: projects.id,
          workspace_id: projects.workspace_id,
          title: projects.title,
          revision: projects.revision,
          starred: projects.starred,
          archived: projects.archived,
          created: projects.created,
          updated: projects.updated,
          tags: sql<
            string[]
          >`coalesce(${projects.document}->'tags','[]'::jsonb)`,
          modes: sql<
            ('canvas' | 'blackboard')[]
          >`ARRAY(SELECT DISTINCT p->>'mode' FROM jsonb_array_elements(${projects.document}->'pages') p)`,
          objects: sql<number>`(SELECT coalesce(sum(jsonb_array_length(p->'elements')),0)::int FROM jsonb_array_elements(${projects.document}->'pages') p)`
        })
        .from(projects)
        .where(
          and(
            eq(projects.workspace_id, query.workspace_id),
            eq(projects.archived, query.archived === 'true')
          )
        )
        .orderBy(desc(projects.starred), desc(projects.updated))

      return response.ok(
        values.map(value => ({
          ...value,
          created: value.created.toISOString(),
          updated: value.updated.toISOString()
        }))
      )
    })
  )

export const get = endpoints
  .query({
    description: 'Open a Redraw project',
    input: { query: scopeSchema.extend({ id: z.string().uuid() }) },
    output: { OK: projectSchema }
  })
  .callback(async ({ db, res, query, response }) =>
    scoped(db, ownerId(res), query.workspace_id, false, async () => {
      const [value] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.workspace_id, query.workspace_id),
            eq(projects.id, query.id)
          )
        )

      if (!value) throw new ClientError('Project not found', 404)

      return response.ok(row(value))
    })
  )

export const create = endpoints
  .mutation({
    description: 'Create a Redraw project',
    input: {
      query: scopeSchema,
      body: z.object({
        title: projectSchema.shape.title,
        document: documentSchema
      })
    },
    output: { OK: projectSchema }
  })
  .callback(async ({ db, res, query, body, response }) =>
    scoped(db, ownerId(res), query.workspace_id, true, async owner => {
      const [value] = await db
        .insert(projects)
        .values({ ...body, owner_id: owner, workspace_id: query.workspace_id })
        .returning()

      if (!value) throw new Error('Project could not be created')

      return response.ok(row(value))
    })
  )

export const save = endpoints
  .mutation({
    description: 'Save a Redraw document if its revision is current',
    input: { query: scopeSchema, body: saveSchema },
    output: { OK: projectSchema }
  })
  .callback(async ({ db, res, query, body, response }) =>
    scoped(db, ownerId(res), query.workspace_id, true, async () => {
      const [value] = await db
        .update(projects)
        .set({
          title: body.title,
          document: body.document,
          revision: sql`${projects.revision} + 1`,
          updated: sql`now()`
        })
        .where(
          and(
            eq(projects.workspace_id, query.workspace_id),
            eq(projects.id, body.id),
            eq(projects.revision, body.expected_revision),
            eq(projects.archived, false)
          )
        )
        .returning()

      if (!value) throw conflict()

      return response.ok(row(value))
    })
  )

export const update = endpoints
  .mutation({
    description:
      'Star, archive or restore a Redraw project without deleting its document',
    input: {
      query: scopeSchema,
      body: identity.extend({
        starred: z.boolean().optional(),
        archived: z.boolean().optional()
      })
    },
    output: { OK: projectSchema }
  })
  .callback(async ({ db, res, query, body, response }) =>
    scoped(db, ownerId(res), query.workspace_id, true, async () => {
      const [value] = await db
        .update(projects)
        .set({
          ...(body.starred !== undefined ? { starred: body.starred } : {}),
          ...(body.archived !== undefined ? { archived: body.archived } : {}),
          revision: sql`${projects.revision} + 1`,
          updated: sql`now()`
        })
        .where(
          and(
            eq(projects.workspace_id, query.workspace_id),
            eq(projects.id, body.id),
            eq(projects.revision, body.expected_revision)
          )
        )
        .returning()

      if (!value) throw conflict()

      return response.ok(row(value))
    })
  )
