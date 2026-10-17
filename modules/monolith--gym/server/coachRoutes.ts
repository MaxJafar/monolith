import z from 'zod'

import { actor } from '../../monolith--agents/server/store'
import { coachConfigInputSchema, coachSnapshotSchema } from '../coachShared'
import {
  applyCoach,
  cancelCoach,
  coachSnapshot,
  configureCoach,
  requestCoach,
  revertCoach
} from './coaching'
import endpoints from './endpoints'

export const coach = endpoints
  .query({
    description: 'Owned Gym coaching settings, proposals and plan snapshots',
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(
      await db.transaction(async tx =>
        coachSnapshot(tx, await actor(tx, res.locals))
      )
    )
  )

export const saveCoachConfig = endpoints
  .mutation({
    description: 'Set consent, intake, agent, budget and review cadence',
    input: {
      body: coachConfigInputSchema.extend({
        expected_revision: z.number().int().positive()
      })
    },
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const { expected_revision, ...input } = body

    return response.ok(
      await db.transaction(async tx =>
        configureCoach(
          tx,
          await actor(tx, res.locals),
          input,
          expected_revision
        )
      )
    )
  })

export const requestCoachReview = endpoints
  .mutation({
    description:
      'Queue a bounded, metered training proposal for an existing worker',
    input: {
      body: z
        .object({
          request_id: z.uuid(),
          kind: z.enum(['create', 'review', 'refine']),
          feedback: z.string().max(5000).default(''),
          previous_job_id: z.uuid().optional()
        })
        .strict()
    },
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, body, response }) =>
    response.ok(
      await db.transaction(async tx =>
        requestCoach(tx, await actor(tx, res.locals), body)
      )
    )
  )

export const cancelCoachReview = endpoints
  .mutation({
    description: 'Dismiss a coaching proposal and cancel its active lease',
    input: { query: z.object({ id: z.uuid() }) },
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(
      await db.transaction(async tx =>
        cancelCoach(tx, await actor(tx, res.locals), query.id)
      )
    )
  )

export const applyCoachProposal = endpoints
  .mutation({
    description:
      'Atomically apply owner-selected, revision-checked plan changes',
    input: {
      query: z.object({ id: z.uuid() }),
      body: z
        .object({ selected_ids: z.array(z.uuid()).min(1).max(40) })
        .strict()
    },
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, query, body, response }) =>
    response.ok(
      await db.transaction(async tx =>
        applyCoach(tx, await actor(tx, res.locals), query.id, body.selected_ids)
      )
    )
  )

export const revertCoachProposal = endpoints
  .mutation({
    description:
      'Restore the latest plan snapshot without altering workout history',
    output: { OK: coachSnapshotSchema }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(
      await db.transaction(async tx =>
        revertCoach(tx, await actor(tx, res.locals))
      )
    )
  )
