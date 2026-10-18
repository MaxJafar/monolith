import { contentText } from '@monolith/blocks'
import { ClientError, canonicalBodies } from '@monolith/server-utils'
import { and, eq, sql } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../../monolith--databases/server/endpoints'
import { ownerId } from '../../monolith--databases/server/model'
import { redrawReferences } from '../../monolith--databases/server/redrawReferences'
import {
  bases,
  records,
  workspacePages
} from '../../monolith--databases/server/schema.drizzle'
import {
  withWorkspaceOwner,
  workspaceAccess
} from '../../monolith--databases/server/workspaceStore'

export const preview = endpoints
  .query({
    description:
      'Read a bounded preview of an accessible canonical workspace page',
    input: {
      query: z.object({
        workspace_id: z.string().uuid(),
        kind: z.enum(['document', 'record', 'redraw']),
        id: z.string().uuid()
      })
    },
    output: {
      OK: z.object({
        title: z.string(),
        text: z.string(),
        truncated: z.boolean(),
        href: z.string(),
        updated: z.string()
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res)
    const workspace = await workspaceAccess(db, actor, query.workspace_id)
    const canonical = await canonicalBodies(db, workspace.id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      if (query.kind === 'redraw') {
        const file = (
          await redrawReferences(db, workspace.id, workspace.owner_id)
        ).find(file => file.id === query.id)

        if (!file) throw new ClientError('Redraw file unavailable', 404)

        const [row] = await db.execute<{ updated: string }>(
          sql`select updated::text from redraw__projects where id=${file.id} and workspace_id=${workspace.id} and owner_id=${workspace.owner_id}`
        )

        return response.ok({
          title: file.title,
          text: file.context ?? 'Redraw',
          href: file.href!,
          truncated: false,
          updated: new Date(row!.updated).toISOString()
        })
      }
      let title: string, content: string, href: string, updated: Date

      if (query.kind === 'document') {
        const [page] = await db
          .select()
          .from(workspacePages)
          .where(
            and(
              eq(workspacePages.id, query.id),
              eq(workspacePages.workspace_id, workspace.id)
            )
          )

        if (!page || !page.route_key.startsWith('/page/'))
          throw new ClientError('Page unavailable', 404)

        const document = canonical.get(`page:${page.id}`)
        title = document?.snapshot.meta.title ?? page.title
        content =
          canonical.get(`page:${page.id}`)?.content ??
          page.body.blocks
            .filter(block => block.type === 'document')
            .map(block => contentText(block.content))
            .join('\n\n')
        updated = document ? new Date(document.updatedAt) : page.updated
        href = `/page/${page.id}?workspace=${workspace.id}`
      } else {
        const [result] = await db
          .select({ record: records })
          .from(records)
          .innerJoin(bases, eq(records.base_id, bases.id))
          .where(
            and(eq(records.id, query.id), eq(bases.workspace_id, workspace.id))
          )

        if (!result) throw new ClientError('Page unavailable', 404)

        const record = result.record
        const document = canonical.get(`record:${record.id}`)
        title = document?.snapshot.meta.title ?? record.title
        content =
          canonical.get(`record:${record.id}`)?.content ?? record.content
        updated = document ? new Date(document.updatedAt) : record.updated
        href = `/databases?workspace=${workspace.id}&base=${record.base_id}&record=${record.id}`
      }

      const text = contentText(content)

      return response.ok({
        title,
        text: text.slice(0, 20000),
        truncated: text.length > 20000,
        href,
        updated: updated.toISOString()
      })
    })
  })
