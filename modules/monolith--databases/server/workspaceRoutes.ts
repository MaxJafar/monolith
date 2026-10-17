import { and, asc, eq, sql } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import {
  type CanvasPage,
  appearanceSchema,
  canvasKey,
  validateCanvasPage
} from '@monolith/blocks'
import { ClientError } from '@monolith/server-utils'

import { navigationSchema } from '../navigationShared'
import {
  workspaceInput,
  workspaceMemberRole,
  workspaceModules,
  workspaceProfile
} from '../workspaceShared'
import endpoints from './endpoints'
import { importExistingItems } from './itemBridge'
import { prepareContent } from './knowledge'
import { ownerId } from './model'
import {
  bases,
  documents,
  views,
  workspaceMembers,
  workspacePages,
  workspaces
} from './schema.drizzle'
import {
  defaultWorkspace,
  inWorkspace,
  validateParent,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

const idQuery = z.object({ id: z.string().uuid() })
const workspaceQuery = z.object({ workspace_id: z.string().uuid() })
const workspaceDto = createSelectSchema(workspaces).extend({
  profile: workspaceProfile,
  enabled_modules: workspaceModules,
  role: z.enum(['owner', 'editor', 'viewer'])
})
const pageDto = createSelectSchema(workspacePages)
const pageInput = z.custom<CanvasPage>(value => {
  try {
    validateCanvasPage(value)
    return true
  } catch {
    return false
  }
}, 'Invalid page content')
const areaQuery = workspaceQuery.extend({ key: z.string().refine(canvasKey) })

export const saveAppearance = endpoints
  .mutation({
    description:
      'Customize a workspace or page independently of its document body',
    input: {
      query: workspaceQuery,
      body: z
        .object({
          scope: z.enum(['workspace', 'page']),
          key: z.string().refine(canvasKey).optional(),
          appearance: appearanceSchema,
          expected_revision: z.number().int().nonnegative()
        })
        .strict()
    },
    output: { OK: navigationSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res)
    const workspace = await workspaceAccess(db, actor, query.workspace_id, true)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':navigation'},0))`
    )
    if (body.scope === 'page') {
      if (!body.key) throw new ClientError('Choose a page to customize', 400)
      if (body.key.startsWith('/page/')) {
        const [page] = await db
          .select({ id: workspacePages.id })
          .from(workspacePages)
          .where(
            and(
              eq(workspacePages.workspace_id, workspace.id),
              eq(workspacePages.route_key, body.key)
            )
          )
        if (!page)
          throw new ClientError('Page not found in this workspace', 404)
      }
    }
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [row] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspace.id))
      const current = navigationSchema.parse(row?.navigation)
      if (current.revision !== body.expected_revision)
        throw new ClientError(
          'Workspace appearance or navigation changed elsewhere. Reload settings before saving.',
          409
        )
      const pages = { ...current.pageAppearance }
      if (body.scope === 'page' && body.key) {
        if (Object.keys(body.appearance).length)
          pages[body.key] = body.appearance
        else delete pages[body.key]
      }
      const saved = navigationSchema.parse({
        ...current,
        ...(body.scope === 'workspace'
          ? { appearance: body.appearance }
          : { pageAppearance: pages }),
        revision: current.revision + 1
      })
      await db
        .update(workspaces)
        .set({ navigation: saved, updated: new Date() })
        .where(eq(workspaces.id, workspace.id))
      return response.ok(saved)
    })
  })

async function preparePage(
  db: Parameters<typeof prepareContent>[0],
  actor: string,
  workspace: { id: string; owner_id: string },
  page: CanvasPage,
  previous?: CanvasPage
) {
  return withWorkspaceOwner(
    db as Parameters<typeof withWorkspaceOwner>[0],
    actor,
    workspace.owner_id,
    () =>
      inWorkspace(
        db as Parameters<typeof inWorkspace>[0],
        workspace.id,
        async () => {
          const blocks = []
          for (const block of page.blocks) {
            if (block.type === 'database' && block.database) {
              if (block.database.workspaceId !== workspace.id)
                throw new ClientError('Choose a database from this workspace')
              const [base] = await db
                .select()
                .from(bases)
                .where(
                  and(
                    eq(bases.id, block.database.baseId),
                    eq(bases.workspace_id, workspace.id)
                  )
                )
              if (!base)
                throw new ClientError('Linked database is unavailable', 404)
              if (block.database.viewId) {
                const [view] = await db
                  .select()
                  .from(views)
                  .where(
                    and(
                      eq(views.id, block.database.viewId),
                      eq(views.base_id, base.id)
                    )
                  )
                if (!view)
                  throw new ClientError('Linked view is unavailable', 404)
              }
            }
            blocks.push(
              block.type === 'document'
                ? {
                    ...block,
                    content: await prepareContent(
                      db,
                      workspace.owner_id,
                      block.content,
                      previous?.blocks.find(item => item.id === block.id)
                        ?.content ?? ''
                    )
                  }
                : block
            )
          }
          return { ...page, blocks }
        }
      )
  )
}

export const getAreaPage = endpoints
  .query({
    description: 'Read workspace-specific area blocks',
    input: { query: areaQuery },
    output: { OK: z.object({ page: pageInput.nullable() }) }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id)
    const [page] = await db
      .select()
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.workspace_id, query.workspace_id),
          eq(workspacePages.route_key, query.key)
        )
      )
    return response.ok({ page: page?.body ?? null })
  })

export const saveAreaPage = endpoints
  .mutation({
    description: 'Save workspace-specific area blocks with revision protection',
    input: {
      query: areaQuery,
      body: z.object({
        page: pageInput,
        expected_revision: z.number().int().nonnegative()
      })
    },
    output: { OK: z.object({ page: pageInput }) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      query.workspace_id,
      true
    )
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':pages'},0))`
    )
    const [current] = await db
      .select()
      .from(workspacePages)
      .where(
        and(
          eq(workspacePages.workspace_id, workspace.id),
          eq(workspacePages.route_key, query.key)
        )
      )
    if ((current?.revision ?? 0) !== body.expected_revision)
      throw new ClientError(
        'This page changed elsewhere. Reload before saving.',
        409
      )
    const revision = body.expected_revision + 1,
      updated = new Date()
    const page = {
      ...(await preparePage(
        db,
        ownerId(res),
        workspace,
        body.page,
        current?.body
      )),
      revision,
      updated: updated.toISOString()
    }
    if (current)
      await db
        .update(workspacePages)
        .set({
          title: page.title,
          icon: page.icon,
          body: page,
          revision,
          updated
        })
        .where(eq(workspacePages.id, current.id))
    else
      await db.insert(workspacePages).values({
        owner_id: workspace.owner_id,
        workspace_id: workspace.id,
        route_key: query.key,
        title: page.title,
        icon: page.icon,
        body: page,
        revision,
        updated
      })
    return response.ok({ page })
  })

export const list = endpoints
  .query({
    description: 'List accessible workspaces',
    output: { OK: z.array(workspaceDto) }
  })
  .callback(async ({ db, res, response }) => {
    const actor = ownerId(res)
    await defaultWorkspace(db, actor)
    await importExistingItems(db, actor)
    const rows = await db
      .select()
      .from(workspaces)
      .orderBy(asc(workspaces.created))
    const memberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.user_id, actor))
    return response.ok(
      rows.map(row => ({
        ...row,
        role:
          row.owner_id === actor
            ? ('owner' as const)
            : memberships.find(member => member.workspace_id === row.id)!.role
      }))
    )
  })

export const create = endpoints
  .mutation({
    description: 'Create a configurable workspace',
    input: { body: workspaceInput },
    output: { CREATED: workspaceDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const [created] = await db
      .insert(workspaces)
      .values({ ...body, owner_id: ownerId(res) })
      .returning()
    if (!created) throw Error('Workspace creation failed')
    return response.created({ ...created, role: 'owner' as const })
  })

export const update = endpoints
  .mutation({
    description: 'Configure workspace modules',
    input: { query: idQuery, body: workspaceInput },
    output: { OK: workspaceDto }
  })
  .callback(async ({ db, res, body, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.id, true, true)
    const [updated] = await db
      .update(workspaces)
      .set({ ...body, updated: new Date() })
      .where(eq(workspaces.id, query.id))
      .returning()
    if (!updated) throw new ClientError('Workspace not found', 404)
    return response.ok({ ...updated, role: 'owner' as const })
  })

export const members = endpoints
  .query({
    description: 'List workspace members',
    input: { query: workspaceQuery },
    output: {
      OK: z.array(
        z.object({
          id: z.string().uuid(),
          user_id: z.string().uuid(),
          name: z.string(),
          role: workspaceMemberRole
        })
      )
    }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id, false, true)
    const rows = await db.execute<{
      id: string
      user_id: string
      name: string
      role: 'editor' | 'viewer'
    }>(sql`
      select m.id,m.user_id,coalesce(nullif(u.name,''),u.username) as name,m.role
      from zillion_databases__workspace_members m join users u on u.id=m.user_id
      where m.workspace_id=${query.workspace_id}
    `)
    return response.ok([...rows])
  })

export const setMember = endpoints
  .mutation({
    description: 'Set an existing account workspace role',
    input: {
      query: workspaceQuery,
      body: z.object({ email: z.string().email(), role: workspaceMemberRole })
    },
    output: { OK: createSelectSchema(workspaceMembers) }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      query.workspace_id,
      true,
      true
    )
    const [account] = await db.execute<{ id: string }>(
      sql`select id from users where lower(email)=lower(${body.email})`
    )
    if (!account)
      throw new ClientError(
        'An account with this email has not joined monolith',
        404
      )
    if (account.id === workspace.owner_id)
      throw new ClientError('The workspace owner already has full access')
    const [member] = await db
      .insert(workspaceMembers)
      .values({
        owner_id: workspace.owner_id,
        workspace_id: workspace.id,
        user_id: account.id,
        role: body.role
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspace_id, workspaceMembers.user_id],
        set: { role: body.role }
      })
      .returning()
    return response.ok(member!)
  })

export const removeMember = endpoints
  .mutation({
    description: 'Remove workspace access',
    input: { query: workspaceQuery.extend({ user_id: z.string().uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id, true, true)
    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspace_id, query.workspace_id),
          eq(workspaceMembers.user_id, query.user_id)
        )
      )
    return response.noContent()
  })

export const pages = endpoints
  .query({
    description: 'List workspace page hierarchy',
    input: { query: workspaceQuery },
    output: {
      OK: z.array(
        pageDto.omit({
          body: true,
          owner_id: true,
          created: true,
          updated: true
        })
      )
    }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id)
    const rows = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.workspace_id, query.workspace_id))
      .orderBy(asc(workspacePages.position), asc(workspacePages.created))
    return response.ok(rows)
  })

export const getPage = endpoints
  .query({
    description: 'Read a workspace page',
    input: { query: idQuery },
    output: {
      OK: z.object({
        page: pageDto,
        role: z.enum(['owner', 'editor', 'viewer'])
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const [page] = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.id, query.id))
    if (!page) throw new ClientError('Page not found', 404)
    const workspace = await workspaceAccess(db, ownerId(res), page.workspace_id)
    return response.ok({ page, role: workspace.role })
  })

export const savePage = endpoints
  .mutation({
    description: 'Save page blocks and parent with revision protection',
    input: {
      body: z.object({
        id: z.string().uuid(),
        workspace_id: z.string().uuid(),
        parent_id: z.string().uuid().nullable(),
        page: pageInput,
        expected_revision: z.number().int().nonnegative()
      })
    },
    output: { OK: pageDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      body.workspace_id,
      true
    )
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':pages'},0))`
    )
    await validateParent(db, workspace.id, body.id, body.parent_id)
    const [current] = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.id, body.id))
    if (
      (current && current.workspace_id !== workspace.id) ||
      (current?.revision ?? 0) !== body.expected_revision
    )
      throw new ClientError(
        'This page changed elsewhere. Reload before saving.',
        409
      )
    const revision = body.expected_revision + 1
    const prepared = await preparePage(
      db,
      ownerId(res),
      workspace,
      body.page,
      current?.body
    )
    const data = {
      title: prepared.title,
      icon: prepared.icon,
      parent_id: body.parent_id,
      revision,
      updated: new Date(),
      body: { ...prepared, revision, updated: new Date().toISOString() }
    }
    const [page] = current
      ? await db
          .update(workspacePages)
          .set(data)
          .where(eq(workspacePages.id, body.id))
          .returning()
      : await db
          .insert(workspacePages)
          .values({
            ...data,
            id: body.id,
            workspace_id: workspace.id,
            owner_id: workspace.owner_id,
            route_key: `/page/${body.id}`
          })
          .returning()
    await withWorkspaceOwner(db, ownerId(res), workspace.owner_id, async () => {
      await db.execute(sql`select set_config('monolith.syncing','1',true)`)
      try {
        const [legacyParent] = body.parent_id
          ? await db
              .select({ id: documents.id })
              .from(documents)
              .where(
                and(
                  eq(documents.id, body.parent_id),
                  eq(documents.owner_id, workspace.owner_id)
                )
              )
          : []
        await db
          .update(documents)
          .set({
            title: prepared.title,
            content:
              prepared.blocks.find(block => block.type === 'document')
                ?.content ?? '',
            parent_id: legacyParent?.id ?? null,
            revision,
            updated: data.updated
          })
          .where(
            and(
              eq(documents.id, body.id),
              eq(documents.owner_id, workspace.owner_id)
            )
          )
      } finally {
        await db.execute(sql`select set_config('monolith.syncing','',true)`)
      }
    })
    return response.ok(page!)
  })

export const createPage = endpoints
  .mutation({
    description: 'Create a page in a workspace',
    input: {
      query: workspaceQuery,
      body: z.object({
        title: z.string().trim().min(1).max(255),
        parent_id: z.string().uuid().nullable().default(null)
      })
    },
    output: { CREATED: pageDto }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      query.workspace_id,
      true
    )
    const id = randomUUID()
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':pages'},0))`
    )
    await validateParent(db, workspace.id, id, body.parent_id)
    const page: CanvasPage = {
      version: 1,
      title: body.title,
      icon: 'lucide:file-text',
      fullWidth: false,
      revision: 1,
      updated: new Date().toISOString(),
      blocks: [
        {
          id: randomUUID(),
          type: 'document',
          width: 'full',
          title: '',
          content: '',
          url: '',
          widget: ''
        }
      ]
    }
    const [created] = await db
      .insert(workspacePages)
      .values({
        id,
        owner_id: workspace.owner_id,
        workspace_id: workspace.id,
        route_key: `/page/${id}`,
        parent_id: body.parent_id,
        title: body.title,
        body: page
      })
      .returning()
    return response.created(created!)
  })

export const navigation = endpoints
  .query({
    description: 'Read the shared workspace sidebar',
    input: { query: workspaceQuery },
    output: { OK: navigationSchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      query.workspace_id
    )
    return response.ok(navigationSchema.parse(workspace.navigation))
  })

export const saveNavigation = endpoints
  .mutation({
    description: 'Arrange pages and addons with revision protection',
    input: { query: workspaceQuery, body: navigationSchema },
    output: { OK: navigationSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res)
    const workspace = await workspaceAccess(db, actor, query.workspace_id, true)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':navigation'},0))`
    )
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [current] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspace.id))
      if (
        !current ||
        navigationSchema.parse(current.navigation).revision !== body.revision
      )
        throw new ClientError(
          'The sidebar changed elsewhere. Refresh and try again.',
          409
        )
      const saved = {
        ...navigationSchema.parse(current.navigation),
        groups: body.groups,
        items: body.items,
        revision: body.revision + 1
      }
      await db
        .update(workspaces)
        .set({ navigation: saved })
        .where(eq(workspaces.id, workspace.id))
      return response.ok(saved)
    })
  })

export const updatePageMetadata = endpoints
  .mutation({
    description:
      'Rename, reorder or move a page without rewriting its editor body',
    input: {
      query: idQuery,
      body: z.object({
        title: z.string().trim().min(1).max(255).optional(),
        parent_id: z.string().uuid().nullable().optional(),
        position: z.number().int().min(0).max(100000).optional(),
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: pageDto }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const [page] = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.id, query.id))
    if (!page) throw new ClientError('Page unavailable', 404)
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      page.workspace_id,
      true
    )
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':pages'},0))`
    )
    if (body.parent_id !== undefined)
      await validateParent(db, workspace.id, page.id, body.parent_id)
    const { expected_revision, ...changes } = body
    if (page.revision !== expected_revision)
      throw new ClientError(
        'This page changed elsewhere. Refresh and try again.',
        409
      )
    const updatedAt = new Date()
    const [updated] = await db
      .update(workspacePages)
      .set({
        ...changes,
        revision: expected_revision + 1,
        updated: updatedAt,
        body: {
          ...page.body,
          ...(body.title ? { title: body.title } : {}),
          revision: expected_revision + 1,
          updated: updatedAt.toISOString()
        }
      })
      .where(
        and(
          eq(workspacePages.id, page.id),
          eq(workspacePages.revision, expected_revision)
        )
      )
      .returning()
    if (!updated)
      throw new ClientError(
        'This page changed elsewhere. Refresh and try again.',
        409
      )
    return response.ok(updated)
  })

export const removePage = endpoints
  .mutation({
    description: 'Delete a page while keeping its children in the parent group',
    input: {
      query: idQuery,
      body: z.object({ expected_revision: z.number().int().positive() })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const [page] = await db
      .select()
      .from(workspacePages)
      .where(eq(workspacePages.id, query.id))
    if (!page) throw new ClientError('Page unavailable', 404)
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      page.workspace_id,
      true
    )
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':pages'},0))`
    )
    if (page.revision !== body.expected_revision)
      throw new ClientError(
        'This page changed elsewhere. Refresh and try again.',
        409
      )
    await db
      .update(workspacePages)
      .set({ parent_id: page.parent_id })
      .where(
        and(
          eq(workspacePages.workspace_id, workspace.id),
          eq(workspacePages.parent_id, page.id)
        )
      )
    const removed = await db
      .delete(workspacePages)
      .where(
        and(
          eq(workspacePages.id, page.id),
          eq(workspacePages.revision, body.expected_revision)
        )
      )
      .returning({ id: workspacePages.id })
    if (!removed.length)
      throw new ClientError(
        'This page changed elsewhere. Refresh and try again.',
        409
      )
    await withWorkspaceOwner(db, ownerId(res), workspace.owner_id, async () => {
      await db.delete(documents).where(eq(documents.id, page.id))
    })
    return response.noContent()
  })
