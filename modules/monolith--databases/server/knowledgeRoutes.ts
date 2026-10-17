import { pageKey } from '@monolith/blocks'
import { ClientError } from '@monolith/server-utils'
import { and, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from './endpoints'
import { knowledgeSnapshot, lockPage } from './knowledge'
import { ownerId } from './model'
import { knowledgeLinks } from './schema.drizzle'

const page = z.object({
  kind: z.enum(['document', 'record', 'note', 'redraw']),
  id: z.uuid()
})
const graphOutput = z.object({
  nodes: z.array(
    page.extend({
      key: z.string(),
      title: z.string(),
      context: z.string().optional(),
      parent: z.string().nullable().optional(),
      excerpt: z.string().optional()
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      kind: z.enum(['mention', 'relation', 'related', 'parent']),
      label: z.string()
    })
  ),
  unresolved: z.number().int()
})

export const snapshot = endpoints
  .query({
    description: 'Owned documents, notes, records and their live backlinks',
    output: { OK: graphOutput }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(await knowledgeSnapshot(db, ownerId(res)))
  )

export const relate = endpoints
  .mutation({
    description: 'Create a symmetric semantic link between owned pages',
    input: {
      body: z.object({
        source: page,
        target: page,
        label: z.string().trim().min(1).max(255).default('Related')
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const endpoints: [typeof body.source, typeof body.target] = [
      body.source,
      body.target
    ]
    endpoints.sort((a, b) => pageKey(a).localeCompare(pageKey(b)))
    if (pageKey(endpoints[0]) === pageKey(endpoints[1]))
      throw new ClientError('A page cannot relate to itself')
    await db.transaction(async tx => {
      for (const page of endpoints) await lockPage(tx, owner, page)

      const [source, target] = endpoints
      await tx
        .insert(knowledgeLinks)
        .values({
          owner_id: owner,
          source_key: pageKey(source),
          target_key: pageKey(target),
          label: body.label,
          source_document_id: source.kind === 'document' ? source.id : null,
          source_record_id: source.kind === 'record' ? source.id : null,
          source_note_id: source.kind === 'note' ? source.id : null,
          target_document_id: target.kind === 'document' ? target.id : null,
          target_record_id: target.kind === 'record' ? target.id : null,
          target_note_id: target.kind === 'note' ? target.id : null
        })
        .onConflictDoUpdate({
          target: [
            knowledgeLinks.owner_id,
            knowledgeLinks.source_key,
            knowledgeLinks.target_key
          ],
          set: { label: body.label }
        })
    })

    return response.noContent()
  })

export const unrelate = endpoints
  .mutation({
    description: 'Remove an owned semantic link',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const result = await db
      .delete(knowledgeLinks)
      .where(
        and(
          eq(knowledgeLinks.owner_id, ownerId(res)),
          eq(knowledgeLinks.id, query.id)
        )
      )
      .returning({ id: knowledgeLinks.id })

    if (!result.length) throw new ClientError('Link not found', 404)

    return response.noContent()
  })
