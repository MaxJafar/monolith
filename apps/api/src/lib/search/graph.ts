import z from 'zod'

import { createMonolith } from '@monolith/server-utils'

import { buildContextGraph } from './contextGraph'
import { snapshot } from './store'

const endpoints = createMonolith({ moduleId: 'search' })

export const map = endpoints
  .query({
    description:
      'Read contextual knowledge connections from the authorized RAG index',
    input: { query: z.object({ workspace_id: z.uuid() }) },
    output: {
      OK: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            key: z.string(),
            kind: z.enum([
              'document',
              'record',
              'note',
              'tag',
              'topic',
              'source'
              , 'redraw'
            ]),
            title: z.string(),
            entityType: z.string().optional(),
            tags: z.array(z.string()).optional(),
            context: z.string().optional(),
            excerpt: z.string().optional(),
            href: z.string().optional()
          })
        ),
        edges: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            kind: z.enum(['tag', 'topic', 'context']),
            label: z.string(),
            strength: z.number().optional(),
            evidence: z.array(z.string()).optional(),
            method: z.enum(['tag', 'topic', 'lexical', 'embedding']).optional()
          })
        ),
        unresolved: z.number(),
        coverage: z.object({
          eligible: z.number(),
          analyzed: z.number(),
          embedded: z.number(),
          topics: z.number(),
          tags: z.number(),
          omittedTags: z.number()
        })
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const current = await snapshot(db, res.locals.userId, query)

    return response.ok(buildContextGraph(current.sources, current.passages))
  })
