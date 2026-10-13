import { and, eq, inArray } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { ClientError, type ForgeContract } from '@lifeforge/server-utils'

import {
  fieldConfigSchema,
  fieldKind,
  personSchema,
  valuesSchema,
  viewConfigSchema,
  viewMode
} from '../shared'
import forge from './forge'
import { drainNativeChanges } from './itemBridge'
import { ownerId } from './model'
import * as legacy from './routes'
import { bases, fields, links, records, views } from './schema.drizzle'
import { ownedPeople } from './store'
import {
  type Store,
  inWorkspace,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

const workspaceQuery = z.object({ workspace_id: z.string().uuid() })
const snapshotDto = z.object({
  bases: z.array(createSelectSchema(bases)),
  fields: z.array(
    createSelectSchema(fields).extend({
      kind: fieldKind,
      config: fieldConfigSchema
    })
  ),
  records: z.array(
    createSelectSchema(records).extend({ values: valuesSchema })
  ),
  views: z.array(
    createSelectSchema(views).extend({
      mode: viewMode,
      config: viewConfigSchema
    })
  ),
  links: z.array(createSelectSchema(links))
})

export const people = forge
  .query({
    description: 'Read workspace members for owner properties',
    input: { query: workspaceQuery },
    output: { OK: z.array(personSchema) }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
    return withWorkspaceOwner(db, actor, workspace.owner_id, () =>
      inWorkspace(db, workspace.id, async () =>
        response.ok(await ownedPeople(db, workspace.owner_id))
      )
    )
  })

export const snapshot = forge
  .query({
    description: 'Read only databases in an accessible workspace',
    input: { query: workspaceQuery },
    output: { OK: snapshotDto }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      await drainNativeChanges(db, workspace.owner_id)
      const databases = await db
        .select()
        .from(bases)
        .where(
          and(
            eq(bases.workspace_id, workspace.id),
            eq(bases.owner_id, workspace.owner_id)
          )
        )
      const ids = databases.map(base => base.id)
      if (!ids.length)
        return response.ok({
          bases: [],
          fields: [],
          records: [],
          views: [],
          links: []
        })
      const [properties, pages, saved] = await Promise.all([
        db.select().from(fields).where(inArray(fields.base_id, ids)),
        db.select().from(records).where(inArray(records.base_id, ids)),
        db.select().from(views).where(inArray(views.base_id, ids))
      ])
      const edges = pages.length
        ? await db
            .select()
            .from(links)
            .where(
              and(
                inArray(
                  links.source_record_id,
                  pages.map(page => page.id)
                ),
                inArray(
                  links.target_record_id,
                  pages.map(page => page.id)
                )
              )
            )
        : []
      return response.ok({
        bases: databases,
        fields: properties,
        records: pages,
        views: saved.map(view => ({
          ...view,
          config: viewConfigSchema.parse(view.config)
        })),
        links: edges
      })
    })
  })

export const createBase = forge
  .mutation({
    description: 'Create a workspace database',
    input: {
      query: workspaceQuery,
      body: z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().max(10000).default('')
      })
    },
    output: { CREATED: createSelectSchema(bases) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [base] = await db
        .insert(bases)
        .values({
          ...body,
          owner_id: workspace.owner_id,
          workspace_id: workspace.id
        })
        .returning()
      if (!base) throw Error('Database creation failed')
      await db
        .insert(views)
        .values({
          owner_id: workspace.owner_id,
          base_id: base.id,
          name: 'Table',
          mode: 'table',
          config: viewConfigSchema.parse({})
        })
      return response.created(base)
    })
  })

async function assertBase(db: Store, workspace: string, id: string) {
  const [base] = await db
    .select()
    .from(bases)
    .where(and(eq(bases.id, id), eq(bases.workspace_id, workspace)))
  if (!base) throw new ClientError('Database not found in this workspace', 404)
}
async function assertEntity(
  db: Store,
  workspace: string,
  entity: 'record' | 'field' | 'view',
  id: string
) {
  const table =
    entity === 'record' ? records : entity === 'field' ? fields : views
  const [row] = await db
    .select({ base_id: table.base_id })
    .from(table)
    .where(eq(table.id, id))
  if (!row) throw new ClientError('Item not found in this workspace', 404)
  await assertBase(db, workspace, row.base_id)
}

/** Reuse the tested relation/value engine after checking every referenced identity. */
function scoped(
  name: keyof typeof legacy,
  entity: 'base' | 'record' | 'field' | 'view'
): ForgeContract {
  const endpoint = legacy[name].getValue()
  return {
    ...legacy[name],
    getValue() {
      return {
        ...endpoint,
        description: `Workspace: ${endpoint.description}`,
        schema: {
          ...endpoint.schema,
          query: (
            (endpoint.schema.query as z.ZodObject) ?? z.object({})
          ).extend({ workspace_id: z.string().uuid() })
        },
        callback: async ctx => {
          const actor = ownerId(ctx.res),
            query = ctx.query as Record<string, string>
          const db = ctx.db as Store
          const workspace = await workspaceAccess(
            db,
            actor,
            query.workspace_id!,
            endpoint.method !== 'get'
          )
          return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
            await drainNativeChanges(db, workspace.owner_id)
            const body = ctx.body as Record<string, unknown> | undefined
            const entityCheck = (kind: typeof entity, id: string) =>
              kind === 'base'
                ? assertBase(db, workspace.id, id)
                : assertEntity(db, workspace.id, kind, id)
            if (query.id) await entityCheck(entity, query.id)
            for (const key of ['base_id', 'target_base_id'])
              if (typeof body?.[key] === 'string')
                await assertBase(db, workspace.id, body[key])
            for (const key of ['record_id', 'project_id'])
              if (typeof body?.[key] === 'string')
                await assertEntity(db, workspace.id, 'record', body[key])
            if (typeof body?.field_id === 'string')
              await assertEntity(db, workspace.id, 'field', body.field_id)
            if (typeof body?.group_field_id === 'string')
              await assertEntity(db, workspace.id, 'field', body.group_field_id)
            for (const id of (body?.target_ids ?? []) as string[])
              await assertEntity(db, workspace.id, 'record', id)
            const parsedQuery = endpoint.schema.query?.parse(query)
            // Only the isolated callback sees this verified owner, never middleware or the response.
            const scopedResponse = Object.create(ctx.res) as typeof ctx.res
            scopedResponse.locals = {
              ...ctx.res.locals,
              userId: workspace.owner_id
            }
            return inWorkspace(db, workspace.id, () =>
              endpoint.callback({
                ...ctx,
                res: scopedResponse,
                query: parsedQuery
              })
            )
          })
        }
      }
    }
  }
}

export const createRecord = scoped('createRecord', 'record')
export const updateRecord = scoped('updateRecord', 'record')
export const removeRecord = scoped('removeRecord', 'record')
export const updateBase = scoped('updateBase', 'base')
export const removeBase = scoped('removeBase', 'base')
export const createField = scoped('createField', 'field')
export const updateField = scoped('updateField', 'field')
export const removeField = scoped('removeField', 'field')
export const createView = scoped('createView', 'view')
export const updateView = scoped('updateView', 'view')
export const removeView = scoped('removeView', 'view')
export const setLinks = scoped('setLinks', 'record')
