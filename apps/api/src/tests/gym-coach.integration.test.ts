import dayjs from 'dayjs'
import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createECDH, randomBytes, randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import * as agents from '../../../../modules/monolith--agents/server/routes'
import * as runtime from '../../../../modules/monolith--agents/server/runtime'
import {
  activity,
  tables as agentTables,
  credentials,
  members,
  principals,
  runs,
  usageRecords
} from '../../../../modules/monolith--agents/server/schema.drizzle'
import { entries as projects } from '../../../../modules/monolith--agents/server/workSchema'
import type {
  AgentSnapshot,
  Run
} from '../../../../modules/monolith--agents/shared'
import {
  type CoachProposal,
  type CoachSnapshot,
  coachConfigInputSchema
} from '../../../../modules/monolith--gym/coachShared'
import { pushSubscriptionInputSchema } from '../../../../modules/monolith--gym/pushShared'
import { readyCoachNotifications } from '../../../../modules/monolith--gym/server/coachNotifications'
import * as coaching from '../../../../modules/monolith--gym/server/coachRoutes'
import {
  coachConfigs,
  coachJobs,
  coachSnapshots
} from '../../../../modules/monolith--gym/server/coachSchema'
import {
  pushDeliveries,
  pushSubscriptions
} from '../../../../modules/monolith--gym/server/pushSchema'
import {
  enqueueNotifications,
  saveSubscription
} from '../../../../modules/monolith--gym/server/pushStore'
import * as gym from '../../../../modules/monolith--gym/server/routes'
import {
  bodyweight,
  commands,
  exercises,
  tables as gymTables,
  routines,
  schedule,
  settings,
  workouts
} from '../../../../modules/monolith--gym/server/schema.drizzle'
import type {
  GymSnapshot,
  Routine,
  Workout
} from '../../../../modules/monolith--gym/shared'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL ?? ''

if (enabled) {
  const target = new URL(connection)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Gym Coach tests require an isolated local Monolith database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 4, prepare: false }
)
const db = drizzle({
  client,
  relations: defineRelations({ ...agentTables, ...gymTables }, () => ({}))
})
const owners: string[] = []

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
type Identity = { principalId: string; credentialId: string }

async function owned<T>(
  user: string,
  job: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id', ${user}, true)`)

    return job(tx)
  })
}

async function invoke<T>(
  user: string,
  route: EndpointContract,
  body?: unknown,
  query: Record<string, string> = {},
  identity?: Identity
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body)
  const parsedQuery = endpoint.schema.query?.parse(query)
  const result = await owned(user, tx =>
    endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: {
        locals: {
          userId: user,
          ...(identity ? { actorType: 'agent', ...identity } : {})
        }
      }
    } as unknown as Context)
  )

  return result.payload == null
    ? (undefined as T)
    : (JSON.parse(JSON.stringify(result.payload)) as T)
}

const state = (owner: string) => invoke<GymSnapshot>(owner, gym.snapshot)
const coach = (owner: string) => invoke<CoachSnapshot>(owner, coaching.coach)
const agentState = (owner: string) =>
  invoke<AgentSnapshot>(owner, agents.snapshot)

async function fixture(budget = 100, configure = true) {
  const owner: string = randomUUID()
  owners.push(owner)
  await agentState(owner)
  const worker = await invoke<{ id: string }>(owner, agents.people.create, {
    name: 'Isolated Gym coach',
    role: 'contributor',
    adapter: 'external',
    reports_to: owner,
    instructions: 'Return a training proposal for owner review',
    budget_cents: budget
  })
  const key = await invoke<{ id: string }>(owner, agents.accessKeys.create, {
    principal_id: worker.id,
    name: 'Gym fixture',
    days: 1
  })
  const identity = { principalId: worker.id, credentialId: key.id }
  const current = await coach(owner)
  const config = coachConfigInputSchema.parse({
    enabled: true,
    consent: true,
    agent_id: worker.id,
    run_budget_cents: 10,
    daily_limit: 20,
    intake: {
      goal: 'General strength',
      experience: 'beginner',
      weekdays: [1, 3],
      session_minutes: 45,
      equipment: ['barbell']
    }
  })

  if (configure)
    await invoke(owner, coaching.saveCoachConfig, {
      ...config,
      expected_revision: current.config.revision
    })

  return { owner, worker, identity, config }
}
type Fixture = Awaited<ReturnType<typeof fixture>>

async function request(
  f: Fixture,
  kind: 'create' | 'review' | 'refine' = 'review',
  previous_job_id?: string,
  request_id: string = randomUUID(),
  feedback = ''
) {
  const snapshot = await invoke<CoachSnapshot>(
    f.owner,
    coaching.requestCoachReview,
    {
      request_id,
      kind,
      feedback,
      ...(previous_job_id ? { previous_job_id } : {})
    }
  )
  const job = snapshot.jobs.find(
    value => value.kind === kind && value.status === 'queued'
  )

  if (!job || !job.run_id)
    throw new Error('Fixture coaching request was not queued')

  return { snapshot, job, request_id }
}

async function finish(
  f: Fixture,
  proposal: CoachProposal | string,
  kind: 'review' | 'create' = 'review'
) {
  const queued = await request(f, kind)
  const claimed = await invoke<{ lease: string }>(
    f.owner,
    runtime.claim,
    undefined,
    { id: queued.job.run_id! },
    f.identity
  )
  await invoke(
    f.owner,
    runtime.complete,
    {
      lease: claimed.lease,
      result:
        typeof proposal === 'string' ? proposal : JSON.stringify(proposal),
      cost_cents: 4
    },
    { id: queued.job.run_id! },
    f.identity
  )

  return {
    ...queued,
    job: (await coach(f.owner)).jobs.find(value => value.id === queued.job.id)!
  }
}

async function routine(f: Fixture) {
  const snapshot = await state(f.owner)
  const exercise = snapshot.exercises.find(
    value => value.mode === 'reps' && !value.archived
  )

  if (!exercise) throw new Error('No seeded rep exercise')

  return invoke<Routine>(f.owner, gym.createRoutine, {
    name: 'Original plan',
    progression: 'linear',
    entries: [
      {
        id: randomUUID(),
        exercise_id: exercise.id,
        prescription: { mode: 'reps', sets: 2, reps: 8, weight_kg: 20 }
      }
    ]
  })
}

async function completedWorkout(f: Fixture, routine_id?: string) {
  const plan = routine_id ?? (await routine(f)).id
  const active = await invoke<Workout>(f.owner, gym.startWorkout, {
    command_id: randomUUID(),
    routine_id: plan,
    date: dayjs().format('YYYY-MM-DD')
  })
  const logged = await invoke<Workout>(
    f.owner,
    gym.updateWorkout,
    {
      ...active,
      command_id: randomUUID(),
      expected_revision: active.revision,
      entries: active.entries.map(entry => ({
        ...entry,
        sets: entry.sets.map((set, index) => ({ ...set, done: index === 0 }))
      }))
    },
    { id: active.id }
  )

  return invoke<Workout>(
    f.owner,
    gym.finishWorkout,
    { command_id: randomUUID(), expected_revision: logged.revision },
    { id: active.id }
  )
}

const rename = (plan: Routine, name = 'Coached plan') => ({
  id: randomUUID(),
  reason: 'Owner requested a clear plan title',
  kind: 'update-routine' as const,
  routine_id: plan.id,
  expected_revision: plan.revision,
  patch: { name }
})
const proposal = (changes: CoachProposal['changes']): CoachProposal => ({
  summary: 'Review these proposed training changes',
  notes: [],
  changes
})

afterAll(async () => {
  if (enabled)
    for (const owner of owners)
      await owned(owner, async tx => {
        await tx
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.owner_id, owner))
        await tx
          .delete(coachSnapshots)
          .where(eq(coachSnapshots.owner_id, owner))
        await tx.delete(coachJobs).where(eq(coachJobs.owner_id, owner))
        await tx.delete(coachConfigs).where(eq(coachConfigs.owner_id, owner))
        await tx.delete(workouts).where(eq(workouts.owner_id, owner))
        await tx.delete(schedule).where(eq(schedule.owner_id, owner))
        await tx.delete(routines).where(eq(routines.owner_id, owner))
        await tx.delete(exercises).where(eq(exercises.owner_id, owner))
        await tx.delete(bodyweight).where(eq(bodyweight.owner_id, owner))
        await tx.delete(settings).where(eq(settings.owner_id, owner))
        await tx.delete(commands).where(eq(commands.owner_id, owner))
        await tx.delete(activity).where(eq(activity.owner_id, owner))
        await tx.delete(projects).where(eq(projects.owner_id, owner))
        await tx.delete(credentials).where(eq(credentials.owner_id, owner))
        await tx.delete(members).where(eq(members.owner_id, owner))
        await tx.delete(usageRecords).where(eq(usageRecords.owner_id, owner))
        await tx.delete(principals).where(eq(principals.owner_id, owner))
      })
  await client.end()
})

describe.skipIf(!enabled)(
  'Native Gym metered coaching and owner-reviewed plans',
  () => {
    it('queues only owned valid ready Coach suggestions and suppresses withdrawn, applied, stale, invalid and inactive proposals', async () => {
      const f = await fixture(),
        foreign = await fixture()
      const plan = await routine(f)
      const suggestion = rename(plan)
      const finished = await finish(f, proposal([suggestion]))
      const since = new Date(Date.now() - 60000)
      const ready = () =>
        owned(f.owner, tx => readyCoachNotifications(tx, f.owner, since))
      expect(await ready()).toEqual([{ id: finished.job.id, changes: 1 }])
      expect(
        await owned(foreign.owner, tx =>
          readyCoachNotifications(tx, f.owner, since)
        )
      ).toEqual([])
      expect(
        await owned(f.owner, tx =>
          readyCoachNotifications(tx, foreign.owner, since)
        )
      ).toEqual([])
      const curve = createECDH('prime256v1')
      curve.generateKeys()
      await owned(f.owner, tx =>
        saveSubscription(
          tx,
          f.owner,
          pushSubscriptionInputSchema.parse({
            subscription: {
              endpoint: 'https://push.example.com/send/coach-fixture',
              keys: {
                p256dh: curve.getPublicKey().toString('base64url'),
                auth: randomBytes(16).toString('base64url')
              }
            },
            preferences: { planned: false, rest: false, coach: true }
          })
        )
      )
      expect(
        await owned(f.owner, tx =>
          enqueueNotifications(tx, f.owner, new Date())
        )
      ).toBe(1)
      expect(
        await owned(f.owner, tx =>
          enqueueNotifications(tx, f.owner, new Date())
        )
      ).toBe(0)
      const queued = await owned(f.owner, tx =>
        tx
          .select()
          .from(pushDeliveries)
          .where(eq(pushDeliveries.owner_id, f.owner))
      )
      expect(queued).toHaveLength(1)
      expect(queued[0]).toMatchObject({
        kind: 'coach',
        dedupe_key: `coach:${finished.job.id}`,
        payload: { url: '/gym?section=coach' }
      })
      await owned(f.owner, tx =>
        tx
          .update(coachConfigs)
          .set({ config: { ...f.config, consent: false } })
          .where(eq(coachConfigs.owner_id, f.owner))
      )
      expect(await ready()).toEqual([])
      await owned(f.owner, tx => enqueueNotifications(tx, f.owner, new Date()))
      expect(
        (
          await owned(f.owner, tx =>
            tx
              .select()
              .from(pushDeliveries)
              .where(eq(pushDeliveries.owner_id, f.owner))
          )
        )[0]!.status
      ).toBe('cancelled')
      await owned(f.owner, tx =>
        tx
          .update(coachConfigs)
          .set({ config: f.config })
          .where(eq(coachConfigs.owner_id, f.owner))
      )
      await owned(f.owner, tx =>
        tx
          .update(coachJobs)
          .set({ applied_ids: [suggestion.id] })
          .where(eq(coachJobs.id, finished.job.id))
      )
      expect(await ready()).toEqual([])
      await owned(f.owner, tx =>
        tx
          .update(coachJobs)
          .set({ applied_ids: [] })
          .where(eq(coachJobs.id, finished.job.id))
      )
      await owned(f.owner, tx =>
        tx
          .update(runs)
          .set({ result: 'Invalid worker output' })
          .where(eq(runs.id, finished.job.run_id!))
      )
      expect(await ready()).toEqual([])
      await owned(f.owner, tx =>
        tx
          .update(runs)
          .set({ result: JSON.stringify(proposal([suggestion])) })
          .where(eq(runs.id, finished.job.run_id!))
      )
      await owned(f.owner, tx =>
        tx
          .update(principals)
          .set({ status: 'paused' })
          .where(eq(principals.id, f.worker.id))
      )
      expect(await ready()).toEqual([])
      await owned(f.owner, tx =>
        tx
          .update(principals)
          .set({ status: 'active' })
          .where(eq(principals.id, f.worker.id))
      )
      expect(await ready()).toEqual([{ id: finished.job.id, changes: 1 }])
      await invoke(
        f.owner,
        gym.updateRoutine,
        {
          ...plan,
          name: 'Changed independently',
          expected_revision: plan.revision
        },
        { id: plan.id }
      )
      expect(await ready()).toEqual([])
    })

    it('forces owner RLS on all coaching tables and rejects foreign agents and machine management', async () => {
      const rows =
        await client`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('zillion_gym__coach_configs','zillion_gym__coach_jobs','zillion_gym__coach_snapshots') and relkind='r'`
      expect(rows).toHaveLength(3)
      expect(
        rows.every(row => row.relrowsecurity && row.relforcerowsecurity)
      ).toBe(true)
      const f = await fixture(),
        foreign = await fixture()
      expect(
        (await coach(f.owner)).agents.some(
          value => value.id === foreign.worker.id
        )
      ).toBe(false)
      await expect(
        invoke(f.owner, coaching.saveCoachConfig, {
          ...f.config,
          agent_id: foreign.worker.id,
          expected_revision: (await coach(f.owner)).config.revision
        })
      ).rejects.toMatchObject({ code: 404 })
      await expect(
        invoke(
          f.owner,
          coaching.saveCoachConfig,
          { ...f.config, expected_revision: 2 },
          {},
          f.identity
        )
      ).rejects.toMatchObject({ code: 403 })
    })

    it('reserves a worker budget once, retries the same request and rejects mismatched retries', async () => {
      const f = await fixture()
      const queued = await request(f)
      const repeated = await invoke<CoachSnapshot>(
        f.owner,
        coaching.requestCoachReview,
        { request_id: queued.request_id, kind: 'review', feedback: '' }
      )
      expect(repeated.jobs).toHaveLength(1)
      expect(repeated.jobs[0]?.run_id).toBe(queued.job.run_id)
      const snapshot = await agentState(f.owner)
      expect(
        snapshot.usage.find(value => value.principal_id === f.worker.id)
      ).toMatchObject({ reserved_cents: 10, spent_cents: 0 })
      await expect(
        invoke(f.owner, coaching.requestCoachReview, {
          request_id: queued.request_id,
          kind: 'review',
          feedback: 'Different request'
        })
      ).rejects.toMatchObject({ code: 409 })
    })

    it('rolls back tasks, assignments and coaching jobs when the selected worker has insufficient budget', async () => {
      const f = await fixture(5)
      const before = await agentState(f.owner)
      await expect(request(f)).rejects.toMatchObject({ code: 409 })
      expect((await coach(f.owner)).jobs).toEqual([])
      expect((await agentState(f.owner)).tasks).toEqual(before.tasks)
      expect((await agentState(f.owner)).runs).toEqual([])
    })

    it('keeps malformed worker proposals visible as errors and cannot apply them', async () => {
      const f = await fixture()
      const finished = await finish(
        f,
        '{"summary":"Bad","changes":[],"execute":"rm"}'
      )
      expect(finished.job).toMatchObject({ status: 'review', proposal: null })
      expect(finished.job.error).toContain('valid Monolith Gym JSON')
      await expect(
        invoke(
          f.owner,
          coaching.applyCoachProposal,
          { selected_ids: [randomUUID()] },
          { id: finished.job.id }
        )
      ).rejects.toThrow('valid Monolith Gym JSON')
      expect((await state(f.owner)).routines).toEqual([])
    })

    it('applies only selected changes, settles usage once and restores the prior plan without changing workout history', async () => {
      const f = await fixture(),
        plan = await routine(f)
      const history = await completedWorkout(f, plan.id)
      const change = rename(plan),
        ignored = {
          id: randomUUID(),
          reason: 'Move the plan to Monday',
          kind: 'schedule' as const,
          weekday: 1,
          routine_id: plan.id
        }
      const finished = await finish(f, proposal([change, ignored]))
      const applied = await invoke<CoachSnapshot>(
        f.owner,
        coaching.applyCoachProposal,
        { selected_ids: [change.id] },
        { id: finished.job.id }
      )
      expect(applied.can_revert).toBe(true)
      expect(
        applied.jobs.find(value => value.id === finished.job.id)
      ).toMatchObject({ status: 'applied', applied_ids: [change.id] })
      expect(
        (await state(f.owner)).routines.find(value => value.id === plan.id)
          ?.name
      ).toBe('Coached plan')
      expect((await state(f.owner)).schedule).toEqual([])
      expect((await state(f.owner)).workouts).toEqual([history])
      expect(
        (await agentState(f.owner)).usage.find(
          value => value.principal_id === f.worker.id
        )
      ).toMatchObject({ spent_cents: 4, reserved_cents: 0 })
      await expect(
        invoke(
          f.owner,
          coaching.applyCoachProposal,
          { selected_ids: [change.id] },
          { id: finished.job.id }
        )
      ).rejects.toMatchObject({ code: 409 })
      await invoke(f.owner, coaching.revertCoachProposal)
      expect(
        (await state(f.owner)).routines.find(value => value.id === plan.id)
          ?.name
      ).toBe('Original plan')
      expect((await state(f.owner)).workouts).toEqual([history])
      expect((await coach(f.owner)).can_revert).toBe(false)
    })

    it('rolls back earlier selected changes when a later proposal references a foreign exercise', async () => {
      const f = await fixture(),
        foreign = await fixture(),
        plan = await routine(f)
      const before = await state(f.owner)
      const foreignExercise = (await state(foreign.owner)).exercises[0]
      const originalEntry = plan.entries[0]

      if (!foreignExercise || !originalEntry)
        throw new Error('Expected seeded exercise and original plan entry')

      const change = rename(plan)
      const invalid: CoachProposal['changes'][number] = {
        id: randomUUID(),
        reason: 'Foreign exercise must be rejected',
        kind: 'add-routine',
        routine: {
          name: 'Invalid',
          notes: '',
          progression: 'linear',
          entries: [
            {
              id: randomUUID(),
              exercise_id: foreignExercise.id,
              superset_group: null,
              prescription: originalEntry.prescription
            }
          ]
        }
      }
      const finished = await finish(f, proposal([change, invalid]))
      await expect(
        invoke(
          f.owner,
          coaching.applyCoachProposal,
          { selected_ids: [change.id, invalid.id] },
          { id: finished.job.id }
        )
      ).rejects.toMatchObject({ code: 404 })
      expect((await state(f.owner)).routines).toEqual(before.routines)
      expect(
        (await coach(f.owner)).jobs.find(value => value.id === finished.job.id)
          ?.applied_ids
      ).toEqual([])
      expect((await coach(foreign.owner)).jobs).toEqual([])
    })

    it('rejects foreign jobs and stale plans while preserving the owner edits', async () => {
      const f = await fixture(),
        foreign = await fixture(),
        plan = await routine(f)
      const change = rename(plan),
        finished = await finish(f, proposal([change]))
      await expect(
        invoke(
          foreign.owner,
          coaching.applyCoachProposal,
          { selected_ids: [change.id] },
          { id: finished.job.id }
        )
      ).rejects.toMatchObject({ code: 404 })
      await invoke(
        f.owner,
        gym.updateRoutine,
        {
          ...plan,
          name: 'Manual owner edit',
          expected_revision: plan.revision
        },
        { id: plan.id }
      )
      await expect(
        invoke(
          f.owner,
          coaching.applyCoachProposal,
          { selected_ids: [change.id] },
          { id: finished.job.id }
        )
      ).rejects.toThrow('plan changed')
      expect(
        (await state(f.owner)).routines.find(value => value.id === plan.id)
          ?.name
      ).toBe('Manual owner edit')
    })

    it('blocks reverting after an owner edits the coached plan', async () => {
      const f = await fixture(),
        plan = await routine(f),
        change = rename(plan)
      const finished = await finish(f, proposal([change]))
      await invoke(
        f.owner,
        coaching.applyCoachProposal,
        { selected_ids: [change.id] },
        { id: finished.job.id }
      )
      const current = (await state(f.owner)).routines.find(
        value => value.id === plan.id
      )!
      await invoke(
        f.owner,
        gym.updateRoutine,
        {
          ...current,
          name: 'Keep my new edits',
          expected_revision: current.revision
        },
        { id: current.id }
      )
      await expect(
        invoke(f.owner, coaching.revertCoachProposal)
      ).rejects.toMatchObject({ code: 409 })
      expect(
        (await state(f.owner)).routines.find(value => value.id === plan.id)
          ?.name
      ).toBe('Keep my new edits')
    })

    it('refines a completed proposal through a new metered request and cancels the superseded review', async () => {
      const f = await fixture(),
        plan = await routine(f)
      const previous = proposal([rename(plan)])
      const finished = await finish(f, previous)
      const refined = await request(
        f,
        'refine',
        finished.job.id,
        randomUUID(),
        'Use my available equipment'
      )
      expect(
        refined.snapshot.jobs.find(value => value.id === finished.job.id)
          ?.status
      ).toBe('cancelled')
      const claimed = await invoke<{ task: { content: string } }>(
        f.owner,
        runtime.claim,
        undefined,
        { id: refined.job.run_id! },
        f.identity
      )
      expect(claimed.task.content).toContain('Use my available equipment')
      expect(claimed.task.content).toContain(JSON.stringify(previous))
    })

    it('withdrawing consent cancels queued or leased work and prevents new requests', async () => {
      const f = await fixture(),
        queued = await request(f)
      const lease = await invoke<{ lease: string }>(
        f.owner,
        runtime.claim,
        undefined,
        { id: queued.job.run_id! },
        f.identity
      )
      const updated = await invoke<CoachSnapshot>(
        f.owner,
        coaching.saveCoachConfig,
        {
          ...f.config,
          enabled: false,
          consent: false,
          expected_revision: (await coach(f.owner)).config.revision
        }
      )
      expect(
        updated.jobs.find(value => value.id === queued.job.id)?.status
      ).toBe('cancelled')
      await expect(
        invoke(
          f.owner,
          runtime.complete,
          {
            lease: lease.lease,
            result: JSON.stringify(proposal([])),
            cost_cents: 0
          },
          { id: queued.job.run_id! },
          f.identity
        )
      ).rejects.toMatchObject({ code: 409 })
      await expect(request(f)).rejects.toMatchObject({ code: 409 })
      expect(
        (await agentState(f.owner)).usage.find(
          value => value.principal_id === f.worker.id
        )?.reserved_cents
      ).toBe(0)
    })

    it('dispatches weekly reviews only after seven days and only from the configured worker inbox', async () => {
      const f = await fixture()
      await invoke(f.owner, coaching.saveCoachConfig, {
        ...f.config,
        cadence: 'weekly',
        expected_revision: (await coach(f.owner)).config.revision
      })
      const second = await invoke<{ id: string }>(
        f.owner,
        agents.people.create,
        {
          name: 'Other worker',
          role: 'contributor',
          adapter: 'external',
          reports_to: f.owner,
          instructions: '',
          budget_cents: 100
        }
      )
      const key = await invoke<{ id: string }>(
        f.owner,
        agents.accessKeys.create,
        { principal_id: second.id, name: 'Other inbox', days: 1 }
      )
      await owned(f.owner, tx =>
        tx
          .update(coachConfigs)
          .set({ last_review: dayjs().subtract(6, 'day').toDate() })
          .where(eq(coachConfigs.owner_id, f.owner))
      )
      expect(
        await invoke<Run[]>(f.owner, runtime.inbox, undefined, {}, f.identity)
      ).toEqual([])
      await owned(f.owner, tx =>
        tx
          .update(coachConfigs)
          .set({ last_review: dayjs().subtract(7, 'day').toDate() })
          .where(eq(coachConfigs.owner_id, f.owner))
      )
      expect(
        await invoke<Run[]>(
          f.owner,
          runtime.inbox,
          undefined,
          {},
          { principalId: second.id, credentialId: key.id }
        )
      ).toEqual([])
      expect((await coach(f.owner)).jobs).toEqual([])
      expect(
        await invoke<Run[]>(f.owner, runtime.inbox, undefined, {}, f.identity)
      ).toHaveLength(1)
      expect(
        await invoke<Run[]>(f.owner, runtime.inbox, undefined, {}, f.identity)
      ).toHaveLength(1)
      expect((await coach(f.owner)).jobs).toHaveLength(1)
    })

    it('dispatches a sessions review after exactly the configured number of newly completed workouts', async () => {
      const f = await fixture()
      await invoke(f.owner, coaching.saveCoachConfig, {
        ...f.config,
        cadence: 'sessions',
        sessions_per_review: 2,
        expected_revision: (await coach(f.owner)).config.revision
      })
      await completedWorkout(f)
      expect(
        await invoke<Run[]>(f.owner, runtime.inbox, undefined, {}, f.identity)
      ).toEqual([])
      await completedWorkout(f)
      expect(
        await invoke<Run[]>(f.owner, runtime.inbox, undefined, {}, f.identity)
      ).toHaveLength(1)
      expect((await coach(f.owner)).jobs).toHaveLength(1)
    })

    it('keeps existing inbox work available when a due coaching request exceeds the worker budget', async () => {
      const f = await fixture(5)
      const project = await invoke<{ id: string }>(
        f.owner,
        agents.project.create,
        { name: 'Existing work', description: '' }
      )
      await invoke(f.owner, agents.project.membership, {
        project_id: project.id,
        principal_id: f.worker.id,
        role: 'contributor'
      })
      const task = await invoke<{ id: string }>(f.owner, agents.work.create, {
        project_id: project.id,
        title: 'Keep this queued task',
        content: 'Independent owner work'
      })
      await invoke(
        f.owner,
        agents.work.assign,
        {
          assignee_id: f.worker.id,
          priority: 'medium',
          blockers: [],
          context: [],
          expected_revision: 1
        },
        { id: task.id }
      )
      const queued = await invoke<Run>(
        f.owner,
        agents.run.queue,
        { expected_revision: 2, request_key: randomUUID(), estimated_cents: 2 },
        { id: task.id }
      )
      await invoke(f.owner, coaching.saveCoachConfig, {
        ...f.config,
        cadence: 'weekly',
        expected_revision: (await coach(f.owner)).config.revision
      })
      await owned(f.owner, tx =>
        tx
          .update(coachConfigs)
          .set({ last_review: dayjs().subtract(8, 'day').toDate() })
          .where(eq(coachConfigs.owner_id, f.owner))
      )
      const inbox = await invoke<Run[]>(
        f.owner,
        runtime.inbox,
        undefined,
        {},
        f.identity
      )
      expect(inbox.map(run => run.id)).toEqual([queued.id])
      expect((await coach(f.owner)).jobs).toEqual([])
      expect((await agentState(f.owner)).tasks).toHaveLength(1)
      expect(
        (await agentState(f.owner)).usage.find(
          value => value.principal_id === f.worker.id
        )
      ).toMatchObject({ reserved_cents: 2, spent_cents: 0 })
    })
  }
)
