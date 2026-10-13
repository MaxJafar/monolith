import z from 'zod'

import {
  progressionSchema,
  routineEntryInputSchema,
  routineInputSchema
} from './shared'

export const coachIntakeSchema = z
  .object({
    goal: z.string().trim().min(1).max(1000),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine(days => new Set(days).size === days.length),
    session_minutes: z.number().int().min(10).max(240),
    equipment: z.array(z.string().trim().min(1).max(100)).max(40),
    limitations: z.string().max(2000).default(''),
    preferences: z.string().max(2000).default('')
  })
  .strict()

export const coachConfigInputSchema = z
  .object({
    enabled: z.boolean(),
    consent: z.boolean(),
    agent_id: z.uuid().nullable(),
    run_budget_cents: z.number().int().min(0).max(1000000),
    daily_limit: z.number().int().min(1).max(20).default(3),
    cadence: z.enum(['off', 'weekly', 'sessions']).default('off'),
    sessions_per_review: z.number().int().min(2).max(60).default(5),
    intake: coachIntakeSchema.nullable()
  })
  .strict()

export const coachConfigSchema = coachConfigInputSchema.extend({
  revision: z.number().int().positive()
})

const changeBase = { id: z.uuid(), reason: z.string().trim().min(1).max(2000) }

export const coachChangeSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...changeBase,
      kind: z.literal('add-routine'),
      routine: routineInputSchema
    })
    .strict(),
  z
    .object({
      ...changeBase,
      kind: z.literal('update-routine'),
      routine_id: z.uuid(),
      expected_revision: z.number().int().positive(),
      patch: z
        .object({
          name: z.string().trim().min(1).max(160).optional(),
          notes: z.string().max(10000).optional(),
          progression: progressionSchema.optional(),
          entries: z.array(routineEntryInputSchema).max(100).optional()
        })
        .strict()
    })
    .strict(),
  z
    .object({
      ...changeBase,
      kind: z.literal('archive-routine'),
      routine_id: z.uuid(),
      expected_revision: z.number().int().positive()
    })
    .strict(),
  z
    .object({
      ...changeBase,
      kind: z.literal('schedule'),
      weekday: z.number().int().min(0).max(6),
      routine_id: z.uuid().nullable()
    })
    .strict()
])

export const coachProposalSchema = z
  .object({
    summary: z.string().trim().min(1).max(3000),
    notes: z.array(z.string().max(2000)).max(20).default([]),
    changes: z.array(coachChangeSchema).max(40)
  })
  .strict()
  .refine(
    value =>
      new Set(value.changes.map(change => change.id)).size ===
      value.changes.length,
    'Proposal change IDs must be unique'
  )
  .refine(value => {
    const targets = value.changes.flatMap(change =>
      change.kind === 'update-routine' || change.kind === 'archive-routine'
        ? [change.routine_id]
        : []
    )

    return new Set(targets).size === targets.length
  }, 'Consolidate each routine mutation into one proposal change')
  .refine(value => {
    const weekdays = value.changes.flatMap(change =>
      change.kind === 'schedule' ? [change.weekday] : []
    )

    return new Set(weekdays).size === weekdays.length
  }, 'Each weekday may have only one proposed assignment')

export const coachJobSchema = z.object({
  id: z.uuid(),
  task_id: z.uuid().nullable(),
  run_id: z.uuid().nullable(),
  kind: z.enum(['create', 'review', 'refine']),
  status: z.string(),
  created: z.string(),
  plan_hash: z.string(),
  applied_ids: z.array(z.uuid()),
  proposal: coachProposalSchema.nullable(),
  error: z.string().nullable()
})

export const coachSnapshotSchema = z.object({
  config: coachConfigSchema,
  plan_hash: z.string(),
  agents: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      adapter: z.string(),
      status: z.string(),
      budget_cents: z.number()
    })
  ),
  jobs: z.array(coachJobSchema),
  can_revert: z.boolean(),
  worker_required: z.literal(true)
})

export type CoachConfig = z.infer<typeof coachConfigSchema>

export type CoachProposal = z.infer<typeof coachProposalSchema>

export type CoachChange = z.infer<typeof coachChangeSchema>

export type CoachSnapshot = z.infer<typeof coachSnapshotSchema>
