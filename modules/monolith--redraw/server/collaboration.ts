import { ClientError } from '@monolith/server-utils'
import { and, eq, gt, lt, sql } from 'drizzle-orm'

import endpoints from '../../monolith--databases/server/endpoints'
import { ownerId } from '../../monolith--databases/server/model'
import { workspaceMembers } from '../../monolith--databases/server/schema.drizzle'
import {
  withWorkspaceOwner,
  workspaceAccess
} from '../../monolith--databases/server/workspaceStore'
import { mergeSnapshots } from '../design'
import {
  documentSchema,
  scopeSchema,
  syncResultSchema,
  syncSchema
} from '../shared'
import { projects, sessions } from './schema.drizzle'

const colors = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#db2777',
  '#d97706',
  '#0891b2'
]
const peerColor = (id: string) =>
  colors[[...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % colors.length]!

/** Every poll rechecks membership. Project row locks serialize overlapping edits. */
export const sync = endpoints
  .mutation({
    description: 'Synchronize Redraw edits and live workspace presence',
    input: { query: scopeSchema, body: syncSchema },
    output: { OK: syncResultSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res)
    const workspace = await workspaceAccess(
      db,
      actor,
      query.workspace_id,
      !!body.change
    )
    const [profile] = await db.execute<{ name: string }>(
      sql`select name from users where id=${actor}`
    )

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, body.id), eq(projects.workspace_id, workspace.id))
        )
        .for('update')

      if (!project) throw new ClientError('Project not found', 404)
      if (project.archived && body.change)
        throw new ClientError('This project is archived', 403)

      const sessionKey = and(
        eq(sessions.project_id, project.id),
        eq(sessions.actor_id, actor),
        eq(sessions.session_id, body.session)
      )
      const [session] = await db.select().from(sessions).where(sessionKey)
      const sequence = session?.sequence ?? 0

      let result = project,
        accepted = sequence

      if (body.change && body.change.sequence > sequence) {
        if (body.change.sequence !== sequence + 1)
          throw new ClientError(
            'This editing session expired. Export your draft and reopen the project.',
            409
          )

        const snapshot = mergeSnapshots(
          { title: project.title, document: project.document },
          body.change.base,
          body.change.next
        )
        const parsed = documentSchema.safeParse(snapshot.document)

        if (!parsed.success)
          throw new ClientError(
            'Concurrent changes could not be combined. Export your draft before reopening.',
            409
          )

        const [updated] = await db
          .update(projects)
          .set({
            title: snapshot.title,
            document: parsed.data,
            revision: project.revision + 1,
            updated: sql`now()`
          })
          .where(
            and(
              eq(projects.id, project.id),
              eq(projects.workspace_id, workspace.id)
            )
          )
          .returning()
        result = updated!
        accepted = body.change.sequence
      }
      await db
        .insert(sessions)
        .values({
          owner_id: workspace.owner_id,
          project_id: project.id,
          actor_id: actor,
          session_id: body.session,
          name: (profile?.name || 'Member').slice(0, 160),
          role: workspace.role,
          presence: body.presence,
          sequence: accepted
        })
        .onConflictDoUpdate({
          target: [sessions.project_id, sessions.actor_id, sessions.session_id],
          set: {
            presence: body.presence,
            name: (profile?.name || 'Member').slice(0, 160),
            role: workspace.role,
            sequence: accepted,
            seen: sql`now()`
          }
        })
      await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.project_id, project.id),
            lt(sessions.seen, sql`now() - interval '7 days'`)
          )
        )
      const active = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.project_id, project.id),
            gt(sessions.seen, sql`now() - interval '12 seconds'`)
          )
        )
        .limit(100)
      const members = await db
        .select({ user: workspaceMembers.user_id, role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspace_id, workspace.id))
      const peers = active
        .filter(s => !(s.actor_id === actor && s.session_id === body.session))
        .flatMap(s => {
          const role =
            s.actor_id === workspace.owner_id
              ? ('owner' as const)
              : members.find(m => m.user === s.actor_id)?.role

          if (!role) return []

          return [
            {
              ...s.presence,
              user: s.actor_id,
              session: s.session_id,
              name: s.name,
              role,
              color: peerColor(s.actor_id)
            }
          ]
        })

      return response.ok({
        project:
          body.change || result.revision !== body.revision
            ? {
                ...result,
                created: result.created.toISOString(),
                updated: result.updated.toISOString()
              }
            : null,
        peers,
        role: workspace.role
      })
    })
  })
