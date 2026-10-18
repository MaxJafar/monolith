import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import type { TokenUsage, UsageRecord } from '../shared'
import { runs, usageRecords } from './schema.drizzle'
import type { Store } from './store'

const count = z.number().int().min(0).max(1000000000000)

export const tokenUsageInput = z
  .object({
    provider: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(200),
    session_id: z.string().max(200),
    input_tokens: count,
    cached_input_tokens: count,
    output_tokens: count,
    total_tokens: count,
    reported_cost_cents: z.number().int().min(0).max(1000000000)
  })
  .strict()
  .refine(
    v =>
      v.cached_input_tokens <= v.input_tokens &&
      v.total_tokens === v.input_tokens + v.output_tokens,
    'Invalid token totals'
  )

export const usageOutput = z.object({
  id: z.uuid(),
  original_run_id: z.uuid(),
  run_id: z.uuid().nullable(),
  principal_id: z.uuid(),
  task_title: z.string(),
  adapter: z.enum(['planner', 'external', 'cli', 'codex', 'openclaw']),
  status: z.enum([
    'queued',
    'running',
    'review',
    'approved',
    'rejected',
    'failed',
    'cancelled'
  ]),
  provider: z.string(),
  model: z.string(),
  session_id: z.string(),
  input_tokens: z.number().nullable(),
  cached_input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
  total_tokens: z.number().nullable(),
  cost_cents: z.number(),
  reported_cost_cents: z.number().nullable(),
  created: z.string(),
  updated: z.string()
}) satisfies z.ZodType<UsageRecord>

export async function recordUsage(
  db: Store,
  run: typeof runs.$inferSelect,
  report?: TokenUsage,
  cost = run.cost_cents,
  status = run.status
) {
  if (report) tokenUsageInput.parse(report)

  const [previous] = await db
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.owner_id, run.owner_id),
        eq(usageRecords.original_run_id, run.id)
      )
    )

  if (
    report &&
    previous?.total_tokens !== null &&
    previous?.total_tokens !== undefined &&
    (previous.provider !== report.provider ||
      previous.model !== report.model ||
      previous.session_id !== report.session_id ||
      report.input_tokens < (previous.input_tokens ?? 0) ||
      report.output_tokens < (previous.output_tokens ?? 0) ||
      report.cached_input_tokens < (previous.cached_input_tokens ?? 0) ||
      report.reported_cost_cents < (previous.reported_cost_cents ?? 0))
  )
    throw new ClientError(
      'Usage checkpoints must be cumulative for the same provider session',
      409
    )
  if (cost < (previous?.cost_cents ?? 0))
    throw new ClientError('Reported cost cannot decrease', 409)
  if (
    report &&
    Math.min(report.reported_cost_cents, run.estimated_cents) !== cost
  )
    throw new ClientError(
      'Reported usage cost does not match the charged cost',
      400
    )

  const values = {
    status,
    cost_cents: cost,
    updated: new Date(),
    charged_at:
      previous && previous.cost_cents > 0
        ? previous.charged_at
        : (run.settled_at ?? new Date()),
    ...(report ? report : {})
  }
  await db
    .insert(usageRecords)
    .values({
      owner_id: run.owner_id,
      original_run_id: run.id,
      run_id: run.id,
      principal_id: run.principal_id,
      task_title: run.task_snapshot.title,
      adapter: run.adapter,
      created: run.created,
      ...values
    })
    .onConflictDoUpdate({
      target: [usageRecords.owner_id, usageRecords.original_run_id],
      set: values
    })
}

export async function backfillUsage(db: Store, owner: string) {
  // Preserve earlier cost-only runs without inventing token counts.
  const missing = await db
    .select({ run: runs })
    .from(runs)
    .leftJoin(
      usageRecords,
      and(
        eq(usageRecords.original_run_id, runs.id),
        eq(usageRecords.owner_id, owner)
      )
    )
    .where(
      and(
        eq(runs.owner_id, owner),
        isNull(usageRecords.id),
        sql`${runs.status} not in ('queued','running')`
      )
    )

  for (const { run } of missing) await recordUsage(db, run)
}

const publicUsage = ({
  owner_id: _owner,
  charged_at: _charged,
  created,
  updated,
  ...row
}: typeof usageRecords.$inferSelect): UsageRecord => ({
  ...row,
  created: created.toISOString(),
  updated: updated.toISOString()
})

export async function usageHistory(
  db: Store,
  owner: string,
  filter: {
    principal_id?: string
    month?: string
    offset: number
    limit: number
  }
) {
  await backfillUsage(db, owner)
  const conditions = [eq(usageRecords.owner_id, owner)]

  if (filter.principal_id)
    conditions.push(eq(usageRecords.principal_id, filter.principal_id))

  if (filter.month) {
    const from = new Date(filter.month + '-01T00:00:00Z'),
      until = new Date(from)
    until.setUTCMonth(until.getUTCMonth() + 1)
    conditions.push(
      gte(usageRecords.created, from),
      lt(usageRecords.created, until)
    )
  }

  const where = and(...conditions)
  const rows = await db
    .select()
    .from(usageRecords)
    .where(where)
    .orderBy(desc(usageRecords.created), desc(usageRecords.id))
    .limit(filter.limit + 1)
    .offset(filter.offset)
  const [totals] = await db
    .select({
      runs: sql<number>`count(*)::int`,
      metered_runs: sql<number>`count(${usageRecords.total_tokens})::int`,
      input_tokens: sql<number>`coalesce(sum(${usageRecords.input_tokens}),0)::float8`,
      cached_input_tokens: sql<number>`coalesce(sum(${usageRecords.cached_input_tokens}),0)::float8`,
      output_tokens: sql<number>`coalesce(sum(${usageRecords.output_tokens}),0)::float8`,
      total_tokens: sql<number>`coalesce(sum(${usageRecords.total_tokens}),0)::float8`,
      cost_cents: sql<number>`coalesce(sum(${usageRecords.cost_cents}),0)::float8`
    })
    .from(usageRecords)
    .where(where)

  return {
    rows: rows.slice(0, filter.limit).map(publicUsage),
    has_more: rows.length > filter.limit,
    totals: totals!
  }
}
