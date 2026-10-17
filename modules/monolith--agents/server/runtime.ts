import { and, asc, eq, sql } from 'drizzle-orm'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import endpoints from './endpoints'
import { recordUsage, tokenUsageInput } from './metering'
import { qualityOutput } from './playbooks'
import { members, runs } from './schema.drizzle'
import {
  actor,
  audit,
  claim as claimRun,
  complete as completeRun,
  dispatchAutomatic,
  leasedRun,
  principal,
  publicPrincipal,
  publicRun,
  fail as reject,
  setWorkState,
  usage,
  validateRunAccess
} from './store'

const runQuery = z.object({ id: z.uuid() })
const leaseInput = z.object({ lease: z.string().min(32).max(100) }).strict()

export const me = endpoints
  .query({
    encrypted: false,
    description: 'Current agent identity, project grants and budget',
    output: { OK: z.unknown() }
  })
  .callback(async ({ db, res, response }) => {
    const who = await actor(db, res.locals, true)

    return response.ok({
      principal: publicPrincipal(await principal(db, who.owner, who.id)),
      members: await db
        .select({ project_id: members.project_id, role: members.role })
        .from(members)
        .where(
          and(eq(members.owner_id, who.owner), eq(members.principal_id, who.id))
        ),
      usage: await usage(db, who.owner, who.id)
    })
  })

export const inbox = endpoints
  .query({
    encrypted: false,
    description:
      'Only queued runs assigned to this agent with current project access',
    output: { OK: z.unknown() }
  })
  .callback(async ({ db, res, response }) => {
    const who = await actor(db, res.locals, true)
    await dispatchAutomatic(db, who)
    const { dispatchScheduledReview } =
      await import('../../monolith--gym/server/coaching')

    try {
      const [scope] = await db.execute<{ id: string | null }>(
        sql`select current_setting('monolith.workspace_id',true) as id`
      )
      const [workspace] = scope?.id
        ? await db.execute<{ is_default: boolean }>(
            sql`select is_default from zillion_databases__workspaces where id=${scope.id}`
          )
        : []

      if (!scope?.id || workspace?.is_default)
        await db.transaction(tx => dispatchScheduledReview(tx, who))
    } catch (failure) {
      if (!(failure instanceof ClientError)) throw failure
      // Budget/cadence conflicts leave the inbox and existing work available.
    }

    const queued = await db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.owner_id, who.owner),
          eq(runs.principal_id, who.id),
          eq(runs.status, 'queued')
        )
      )
      .orderBy(asc(runs.created))
      .limit(100)
    const allowed = []

    for (const run of queued) {
      try {
        await validateRunAccess(db, who, run)
        allowed.push(publicRun(run))
      } catch (failure) {
        if (!(failure instanceof ClientError)) throw failure
        /* A revoked or changed assignment is not an executable inbox item. */
      }
    }

    return response.ok(allowed)
  })

export const claim = endpoints
  .mutation({
    encrypted: false,
    description:
      'Claim one queued run exclusively and receive its bounded context',
    input: { query: runQuery },
    output: { OK: z.unknown() }
  })
  .callback(async ({ db, res, query, response }) => {
    const who = await actor(db, res.locals, true),
      result = await claimRun(db, who, query.id)

    return response.ok({
      run: publicRun(result.run),
      lease: result.lease,
      task: result.run.task_snapshot,
      context: result.run.context_snapshot,
      instructions: result.run.instructions_snapshot,
      playbooks: result.run.playbook_snapshot
    })
  })

export const heartbeat = endpoints
  .mutation({
    encrypted: false,
    description: 'Renew a credential-bound run lease for two minutes',
    input: {
      query: runQuery,
      body: leaseInput.extend({ usage: tokenUsageInput.optional() })
    },
    output: { OK: z.object({ lease_expires: z.string() }) }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const who = await actor(db, res.locals, true),
      run = await leasedRun(db, who, query.id, body.lease),
      now = new Date(),
      expires = new Date(now.getTime() + 120000)

    if (body.usage)
      await recordUsage(
        db,
        run,
        body.usage,
        Math.min(body.usage.reported_cost_cents, run.estimated_cents)
      )
    await db
      .update(runs)
      .set({
        heartbeat_at: now,
        lease_expires: expires,
        ...(body.usage
          ? {
              cost_cents: Math.min(
                body.usage.reported_cost_cents,
                run.estimated_cents
              ),
              settled_at: now
            }
          : {})
      })
      .where(eq(runs.id, run.id))

    return response.ok({ lease_expires: expires.toISOString() })
  })

export const complete = endpoints
  .mutation({
    encrypted: false,
    description: 'Submit a leased agent result for human review',
    input: {
      query: runQuery,
      body: leaseInput.extend({
        result: z.string().trim().min(1).max(100000),
        cost_cents: z.number().int().min(0).max(10000000),
        usage: tokenUsageInput.optional(),
        quality_report: z.array(qualityOutput).max(80).optional()
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const who = await actor(db, res.locals, true)
    await completeRun(
      db,
      who,
      query.id,
      body.lease,
      body.result,
      body.cost_cents,
      body.usage,
      body.quality_report
    )

    return response.noContent()
  })

export const fail = endpoints
  .mutation({
    encrypted: false,
    description: 'Report a worker failure and release its lease',
    input: {
      query: runQuery,
      body: leaseInput.extend({
        error: z.string().trim().min(1).max(8000),
        cost_cents: z.number().int().min(0).max(10000000),
        usage: tokenUsageInput.optional()
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const who = await actor(db, res.locals, true),
      run = await leasedRun(db, who, query.id, body.lease)

    if (body.cost_cents > run.estimated_cents)
      reject('Reported cost exceeds reserved budget', 400)
    await recordUsage(db, run, body.usage, body.cost_cents, 'failed')
    await db
      .update(runs)
      .set({
        status: 'failed',
        error: body.error,
        cost_cents: body.cost_cents,
        settled_at: new Date(),
        lease_hash: null,
        lease_expires: null
      })
      .where(eq(runs.id, run.id))
    await setWorkState(db, who.owner, run.task_id, 'blocked')
    await audit(db, who, 'run.failed', body.error, run.task_id, run.id)

    return response.noContent()
  })

export const comment = endpoints
  .mutation({
    encrypted: false,
    description: 'Append agent progress to the run activity',
    input: {
      query: runQuery,
      body: leaseInput.extend({ message: z.string().trim().min(1).max(8000) })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const who = await actor(db, res.locals, true),
      run = await leasedRun(db, who, query.id, body.lease)
    await audit(db, who, 'run.comment', body.message, run.task_id, run.id)

    return response.noContent()
  })
