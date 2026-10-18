import { ClientError } from '@monolith/server-utils'
import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import endpoints from '../../monolith--databases/server/endpoints'
import { ownerId } from '../../monolith--databases/server/model'
import {
  type Store,
  withWorkspaceOwner,
  workspaceAccess
} from '../../monolith--databases/server/workspaceStore'
import { commentSchema, scopeSchema } from '../shared'
import { comments, projects } from './schema.drizzle'

const scope = scopeSchema.extend({ project_id: z.string().uuid() })
const serialize = (row: typeof comments.$inferSelect) => ({
  ...row,
  created: row.created.toISOString()
})

async function access<T>(
  db: Store,
  actor: string,
  query: z.infer<typeof scope>,
  write: boolean,
  action: (project: typeof projects.$inferSelect, owner: string) => Promise<T>
) {
  const workspace = await workspaceAccess(db, actor, query.workspace_id, write)

  return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, query.project_id),
          eq(projects.workspace_id, workspace.id)
        )
      )
      .for('update')

    if (!project) throw new ClientError('Project not found', 404)
    if (write && project.archived)
      throw new ClientError('This project is archived', 403)

    return action(project, workspace.owner_id)
  })
}

export const list = endpoints
  .query({
    description: 'Read Redraw comment threads',
    input: { query: scope },
    output: { OK: z.array(commentSchema) }
  })
  .callback(async ({ db, res, query, response }) =>
    access(db, ownerId(res), query, false, async () =>
      response.ok(
        (
          await db
            .select()
            .from(comments)
            .where(eq(comments.project_id, query.project_id))
            .orderBy(asc(comments.created))
            .limit(2000)
        ).map(serialize)
      )
    )
  )

export const create = endpoints
  .mutation({
    description: 'Add a pinned comment or reply',
    input: {
      query: scope,
      body: commentSchema.pick({
        id: true,
        page_id: true,
        element_id: true,
        parent_id: true,
        x: true,
        y: true,
        body: true
      })
    },
    output: { OK: commentSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res)

    return access(db, actor, query, true, async (project, owner) => {
      const [existing] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, body.id))

      if (existing) {
        if (
          existing.project_id !== project.id ||
          existing.actor_id !== actor ||
          existing.body !== body.body ||
          existing.parent_id !== body.parent_id
        )
          throw new ClientError('Comment identity is already in use', 409)

        return response.ok(serialize(existing))
      }
      let pin = {
        page_id: body.page_id,
        element_id: body.element_id,
        x: body.x,
        y: body.y
      }

      if (body.parent_id) {
        const [parent] = await db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.id, body.parent_id),
              eq(comments.project_id, project.id)
            )
          )

        if (!parent || parent.parent_id)
          throw new ClientError('Thread not found', 404)
        pin = {
          page_id: parent.page_id,
          element_id: parent.element_id,
          x: parent.x,
          y: parent.y
        }
      } else {
        const page = project.document.pages.find(p => p.id === body.page_id)

        if (
          !page ||
          (body.element_id &&
            !page.elements.some(e => e.id === body.element_id))
        )
          throw new ClientError('Comment target no longer exists', 409)
      }

      const [count] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(eq(comments.project_id, project.id))

      if (count!.count >= 2000) throw new ClientError('Comment limit reached')

      const [profile] = await db.execute<{ name: string }>(
        sql`select name from users where id=${actor}`
      )
      const [created] = await db
        .insert(comments)
        .values({
          ...body,
          ...pin,
          owner_id: owner,
          actor_id: actor,
          project_id: project.id,
          name: (profile?.name || 'Member').slice(0, 160)
        })
        .returning()

      return response.ok(serialize(created!))
    })
  })

export const resolve = endpoints
  .mutation({
    description: 'Resolve or reopen a Redraw thread',
    input: {
      query: scope,
      body: z.object({ id: z.string().uuid(), resolved: z.boolean() })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) =>
    access(db, ownerId(res), query, true, async () => {
      const rows = await db
        .update(comments)
        .set({ resolved: body.resolved })
        .where(
          and(
            eq(comments.id, body.id),
            eq(comments.project_id, query.project_id),
            sql`${comments.parent_id} is null`
          )
        )
        .returning({ id: comments.id })

      if (!rows.length) throw new ClientError('Thread not found', 404)

      return response.noContent()
    })
  )

export const remove = endpoints
  .mutation({
    description: 'Delete your own comment or moderate as workspace owner',
    input: { query: scope, body: z.object({ id: z.string().uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res)

    return access(db, actor, query, true, async (_project, owner) => {
      const [comment] = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.id, body.id),
            eq(comments.project_id, query.project_id)
          )
        )

      if (!comment) throw new ClientError('Comment not found', 404)
      if (comment.actor_id !== actor && actor !== owner)
        throw new ClientError(
          'Only the author or workspace owner can delete this comment',
          403
        )
      await db.delete(comments).where(eq(comments.id, comment.id))

      return response.noContent()
    })
  })
