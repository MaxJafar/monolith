import { sql } from 'drizzle-orm'
import z from 'zod'

import { createForge, forgeRouter } from '@lifeforge/server-utils'

import { sharedInference, sharedModels } from '../ai/shared/client'
import { answer, embed, rank } from './inference'
import { retrieve } from './retrieval'
import { collectSources } from './sources'
import { indexBatch, snapshot } from './store'

const forge = createForge({ moduleId: 'search' })
const scope = z.object({
  workspace_id: z.uuid().optional(),
  module: z
    .string()
    .regex(/^[a-z-]+$/)
    .max(60)
    .optional()
})
const warning = z.object({ source: z.string(), code: z.string() })
const progress = z.object({
  total: z.number(),
  ready: z.number(),
  pending: z.number(),
  processed: z.number(),
  source: z.string(),
  warnings: z.array(warning)
})
const hit = z.object({
  id: z.string(),
  title: z.string(),
  module: z.string(),
  workspace: z.string().nullable(),
  href: z.string(),
  file_key: z.string().optional(),
  text: z.string(),
  score: z.number(),
  relevance: z.number().nullable(),
  confidence: z.number().nullable(),
  inferred: z.boolean()
})

const status = forge
  .query({
    description: 'Current authorized system search coverage',
    input: { query: scope },
    output: {
      OK: z.object({
        total: z.number(),
        ready: z.number(),
        pending: z.number(),
        modules: z.array(z.string()),
        warnings: z.array(warning)
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const current = await snapshot(db, res.locals.userId, query)

    return response.ok({
      total: current.sources.length,
      ready: current.ready,
      pending: current.pending.length,
      modules: [...new Set(current.sources.map(s => s.module))].sort(),
      warnings: current.warnings
    })
  })

const host = forge
  .query({
    description: 'Shared Mac mini model health',
    output: {
      OK: z.object({
        ready: z.boolean(),
        laya: z.boolean(),
        models: z.array(z.string()),
        host: z.literal('mac-mini')
      })
    }
  })
  .callback(async ({ response }) =>
    response.ok(
      await sharedInference(
        '/health',
        z.object({
          ready: z.boolean(),
          laya: z.boolean(),
          models: z.array(z.string()),
          host: z.literal('mac-mini')
        })
      )
    )
  )

const index = forge
  .mutation({
    description: 'Index one resumable batch through the Mac mini',
    input: { body: scope },
    output: { OK: progress }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(await indexBatch(db, res.locals.userId, body))
  )

const clear = forge
  .mutation({
    description: 'Remove only the signed-in account search cache',
    input: { body: z.object({}) },
    output: { OK: z.literal(true) }
  })
  .callback(async ({ db, res, response }) => {
    const actor = res.locals.userId as string
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${actor + ':system-search'},0))`
    )
    await db.execute(sql`delete from search__chunks where owner_id=${actor}`)
    await db.execute(sql`delete from search__documents where owner_id=${actor}`)

    return response.ok(true)
  })

const query = forge
  .mutation({
    description: 'Retrieve whole-system evidence and a grounded answer',
    input: {
      body: scope.extend({
        query: z.string().trim().min(1).max(800),
        mode: z.enum(['hybrid', 'keyword']).default('hybrid'),
        answer: z.boolean().default(true)
      })
    },
    output: {
      OK: z.object({
        hits: z.array(hit),
        answer: z.array(
          z.object({ text: z.string(), citations: z.array(z.number()) })
        ),
        total: z.number(),
        ready: z.number(),
        stages: z.array(z.string()),
        warnings: z.array(warning),
        model: z.string()
      })
    }
  })
  .callback(async ({ db, res, body, response }) => {
    const actor = res.locals.userId as string
    const current = await snapshot(db, actor, body)
    const warnings = [...current.warnings]
    const stages = ['keyword']

    let vector: number[] | undefined

    if (body.mode === 'hybrid') {
      if (current.passages.some(p => p.vector)) {
        try {
          vector = (await embed([body.query], 'query'))[0]
          stages.push('embedding')
        } catch {
          warnings.push({ source: '', code: 'embedding-unavailable' })
        }
      }
      if (current.pending.length)
        warnings.push({ source: '', code: 'index-pending' })
    }
    let candidates = retrieve(current.passages, body.query, vector).map(p => ({
      ...p,
      relevance: null as number | null,
      confidence: null as number | null
    }))

    if (body.mode === 'hybrid' && candidates.length) {
      try {
        const scores = await rank(
          body.query,
          candidates.map(p => `${p.source.title}\n${p.text}`)
        )
        const highest = candidates[0]!.score
        candidates = candidates
          .map((p, i) => {
            const s = scores.find(s => s.id === i)!
            const confidence = s.truncated ? 0 : s.confidence

            return {
              ...p,
              relevance: s.relevance,
              confidence,
              score:
                (p.score / highest) * (1 - confidence) +
                s.relevance * confidence
            }
          })
          .filter(p => !(p.confidence >= 0.75 && p.relevance < 0.1))
          .sort((a, b) => b.score - a.score)
        stages.push('laya')
      } catch {
        warnings.push({ source: '', code: 'laya-unavailable' })
      }
    }

    // Keep two passages per source at most so one long note cannot crowd out all
    // other evidence. Citation IDs refer exactly to the returned evidence order.
    const counts = new Map<string, number>()
    candidates = candidates
      .filter(p => {
        const n = counts.get(p.source.id) ?? 0
        counts.set(p.source.id, n + 1)

        return n < 2
      })
      .slice(0, 6)
    const authorized = new Map(
      (await collectSources(db, actor, body)).map(s => [s.id, s.fingerprint])
    )
    candidates = candidates.filter(
      p => authorized.get(p.source.id) === p.source.fingerprint
    )
    let statements: Awaited<ReturnType<typeof answer>> = []

    if (body.answer && candidates.length) {
      try {
        statements = await answer(
          body.query,
          candidates.map(p => ({
            title: p.source.title,
            text: p.text,
            inferred: p.inferred
          }))
        )
        stages.push('llm')
      } catch {
        warnings.push({ source: '', code: 'answer-unavailable' })
      }
    }

    const latest = new Map(
      (await collectSources(db, actor, body)).map(s => [s.id, s.fingerprint])
    )

    if (
      candidates.some(p => latest.get(p.source.id) !== p.source.fingerprint)
    ) {
      // Citation numbering changes when a source disappears, so discard the
      // generated answer and let the next query regenerate it from current data.
      candidates = candidates.filter(
        p => latest.get(p.source.id) === p.source.fingerprint
      )
      statements = []
      warnings.push({ source: '', code: 'sources-changed' })
    }

    return response.ok({
      hits: candidates.map(p => ({
        id: p.id,
        title: p.source.title,
        module: p.source.module,
        workspace: p.source.workspace,
        href: p.source.href,
        file_key: p.source.file?.key,
        text: p.text,
        score: p.score,
        relevance: p.relevance,
        confidence: p.confidence,
        inferred: p.inferred
      })),
      answer: statements,
      total: current.sources.length,
      ready: current.ready,
      stages,
      warnings,
      model: sharedModels().generation
    })
  })

export default forgeRouter({ status, host, index, clear, query })
