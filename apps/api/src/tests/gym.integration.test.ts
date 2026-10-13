import { and, defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import type { ForgeContract } from '@lifeforge/server-utils'

import getEvents from '../../../../modules/zillion--gym/server/events'
import * as routes from '../../../../modules/zillion--gym/server/routes'
import {
  bodyweight,
  commands,
  exercises,
  relations,
  routineEntries,
  routines,
  schedule,
  settings,
  tables,
  workouts
} from '../../../../modules/zillion--gym/server/schema.drizzle'
import {
  type Bodyweight,
  type Exercise,
  type GymBackup,
  type GymSnapshot,
  type ImportSummary,
  type Prescription,
  type Routine,
  type ScheduleItem,
  type Settings,
  type Workout,
  prescriptionSchema,
  scheduledRoutine,
  workoutUpdateSchema
} from '../../../../modules/zillion--gym/shared'

type Context = Parameters<ReturnType<ForgeContract['getValue']>['callback']>[0]

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL || ''

if (enabled) {
  if (!connection)
    throw new Error('An explicit isolated database URL is required')

  const target = new URL(connection)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Gym integration tests require an isolated loopback database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 5, prepare: false }
)
const relationSchema = defineRelations(tables, relations)
const db = drizzle({ client, relations: relationSchema })
const owners = new Set<string>()

function newOwner() {
  const owner = randomUUID()
  owners.add(owner)

  return owner
}

async function invoke<T>(
  route: ForgeContract,
  owner: string | undefined,
  body?: unknown,
  query: Record<string, string> = {},
  database = db
): Promise<T> {
  const endpoint = route.getValue()
  const parsedBody = endpoint.schema.body?.parse(body)
  const parsedQuery = endpoint.schema.query?.parse(query)
  const result = await database.transaction(async tx => {
    await tx.execute(
      sql`select set_config('zillion.user_id',${owner ?? ''},true)`
    )

    return endpoint.callback({
      db: tx,
      body: parsedBody,
      query: parsedQuery,
      res: { locals: { userId: owner } }
    } as unknown as Context)
  })

  return (
    result.payload == null
      ? undefined
      : JSON.parse(JSON.stringify(result.payload))
  ) as T
}

const snapshot = (owner: string) => invoke<GymSnapshot>(routes.snapshot, owner)
const exercise = (
  owner: string,
  name = 'Synthetic press',
  mode: Exercise['mode'] = 'reps'
) =>
  invoke<Exercise>(routes.createExercise, owner, {
    name,
    mode,
    muscle_group: 'chest'
  })
const routine = (
  owner: string,
  exerciseId: string,
  target: Partial<Prescription> = {}
) =>
  invoke<Routine>(routes.createRoutine, owner, {
    name: 'Test plan',
    entries: [
      {
        id: randomUUID(),
        exercise_id: exerciseId,
        prescription: prescriptionSchema.parse(target)
      }
    ]
  })
const start = (owner: string, routineId?: string, commandId = randomUUID()) =>
  invoke<Workout>(routes.startWorkout, owner, {
    command_id: commandId,
    routine_id: routineId,
    date: '2026-10-12'
  })
const update = (
  owner: string,
  current: Workout,
  changes: Partial<ReturnType<typeof workoutUpdateSchema.parse>> = {},
  commandId = randomUUID()
) =>
  invoke<Workout>(
    routes.updateWorkout,
    owner,
    {
      ...workoutUpdateSchema.parse({ ...current, ...changes }),
      command_id: commandId,
      expected_revision: current.revision
    },
    { id: current.id }
  )
const discard = (owner: string, current: Workout) =>
  invoke<Workout>(
    routes.discardWorkout,
    owner,
    { command_id: randomUUID(), expected_revision: current.revision },
    { id: current.id }
  )
const finish = (owner: string, current: Workout) =>
  invoke<Workout>(
    routes.finishWorkout,
    owner,
    { command_id: randomUUID(), expected_revision: current.revision },
    { id: current.id }
  )
const log = (current: Workout, weight = 100, reps = 10) =>
  current.entries.map(entry => ({
    ...entry,
    sets: entry.sets.map(set => ({
      ...set,
      weight_kg: weight,
      reps,
      done: true
    }))
  }))

describe.skipIf(!enabled)('Zillion OS native Gym persistence', () => {
  afterAll(async () => {
    for (const owner of owners)
      await db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id',${owner},true)`
        )
        await tx.delete(schedule).where(eq(schedule.owner_id, owner))
        await tx.delete(workouts).where(eq(workouts.owner_id, owner))
        await tx.delete(routines).where(eq(routines.owner_id, owner))
        await tx.delete(exercises).where(eq(exercises.owner_id, owner))
        await tx.delete(bodyweight).where(eq(bodyweight.owner_id, owner))
        await tx.delete(settings).where(eq(settings.owner_id, owner))
        await tx.delete(commands).where(eq(commands.owner_id, owner))
      })
    await client.end()
  })

  it('seeds the full owned catalog once and recovers native state through a new connection', async () => {
    const owner = newOwner()
    const first = await snapshot(owner),
      second = await snapshot(owner)
    expect(first.exercises.filter(row => !row.custom)).toHaveLength(1324)
    expect(second.exercises.map(row => row.id)).toEqual(
      first.exercises.map(row => row.id)
    )
    const custom = await exercise(owner)
    const plan = await routine(owner, custom.id)
    const active = await start(owner, plan.id)
    const reopenedClient = postgres(connection, { max: 1, prepare: false })

    try {
      const reopened = drizzle({
        client: reopenedClient,
        relations: relationSchema
      })
      const state = await invoke<GymSnapshot>(
        routes.snapshot,
        owner,
        undefined,
        {},
        reopened
      )
      expect(state.active).toEqual(active)
      expect(state.workouts.map(row => row.id)).toContain(active.id)
    } finally {
      await reopenedClient.end()
    }
  })

  it('enforces route ownership, forced row policies and composite owner foreign keys', async () => {
    const owner = newOwner(),
      other = newOwner()
    const mine = await exercise(owner),
      theirs = await exercise(other)
    const plan = await routine(owner, mine.id)
    await expect(invoke(routes.snapshot, undefined)).rejects.toThrow(
      'Authentication required'
    )
    await expect(
      invoke(
        routes.updateExercise,
        other,
        { ...mine, expected_revision: mine.revision },
        { id: mine.id }
      )
    ).rejects.toThrow('not found')
    await expect(routine(owner, theirs.id)).rejects.toThrow('not found')
    await expect(start(other, plan.id)).rejects.toThrow('not found')
    const hidden = await db.transaction(async tx => {
      await tx.execute(sql`select set_config('zillion.user_id',${other},true)`)

      return tx.select().from(exercises).where(eq(exercises.id, mine.id))
    })
    expect(hidden).toEqual([])
    await expect(
      db.transaction(async tx => {
        await tx.execute(
          sql`select set_config('zillion.user_id',${owner},true)`
        )
        await tx.insert(routineEntries).values({
          owner_id: owner,
          routine_id: plan.id,
          exercise_id: theirs.id,
          position: 1,
          prescription: prescriptionSchema.parse({})
        })
      })
    ).rejects.toThrow()
    expect((await snapshot(owner)).routines[0]?.entries).toHaveLength(1)
  })

  it('preserves ordered routine entry identities, supersets and rolls back invalid/stale plans', async () => {
    const owner = newOwner(),
      a = await exercise(owner, 'A'),
      b = await exercise(owner, 'B')
    const entries = [a, b].map(item => ({
      id: randomUUID(),
      exercise_id: item.id,
      superset_group: 'paired',
      prescription: prescriptionSchema.parse({})
    }))
    const original = await invoke<Routine>(routes.createRoutine, owner, {
      name: 'Paired',
      entries
    })
    const changed = await invoke<Routine>(
      routes.updateRoutine,
      owner,
      {
        ...original,
        name: 'Reordered',
        entries: original.entries.toReversed(),
        expected_revision: original.revision
      },
      { id: original.id }
    )
    expect(changed.entries.map(item => item.id)).toEqual(
      entries.map(item => item.id).toReversed()
    )
    expect(changed.entries.map(item => item.position)).toEqual([0, 1])
    await expect(
      invoke(
        routes.updateRoutine,
        owner,
        {
          ...changed,
          entries: [changed.entries[0]],
          expected_revision: changed.revision
        },
        { id: changed.id }
      )
    ).rejects.toThrow('adjacent')
    await expect(
      invoke(
        routes.updateRoutine,
        owner,
        { ...original, expected_revision: original.revision },
        { id: original.id }
      )
    ).rejects.toThrow('Reload')
    expect(
      (await snapshot(owner)).routines.find(row => row.id === changed.id)
    ).toEqual(changed)
    const copy = await invoke<Routine>(
      routes.duplicateRoutine,
      owner,
      { expected_revision: changed.revision },
      { id: changed.id }
    )
    expect(
      copy.entries
        .map(item => item.id)
        .some(id => entries.some(entry => entry.id === id))
    ).toBe(false)
  })

  it('persists weekday assignments and explicit rest overrides without foreign references', async () => {
    const owner = newOwner(),
      other = newOwner(),
      custom = await exercise(owner),
      foreign = await exercise(other)
    const plan = await routine(owner, custom.id),
      foreignPlan = await routine(other, foreign.id)
    await invoke<ScheduleItem>(routes.setSchedule, owner, {
      weekday: 1,
      routine_id: plan.id
    })
    const rest = await invoke<ScheduleItem>(routes.setSchedule, owner, {
      date: '2026-10-12',
      routine_id: null
    })
    expect(
      scheduledRoutine((await snapshot(owner)).schedule, '2026-10-12')
    ).toBeNull()
    expect(
      scheduledRoutine((await snapshot(owner)).schedule, '2026-10-19')
    ).toBe(plan.id)
    await expect(
      invoke(routes.setSchedule, owner, {
        weekday: 2,
        routine_id: foreignPlan.id
      })
    ).rejects.toThrow('not found')
    await invoke(routes.removeSchedule, owner, undefined, { id: rest.id })
    expect(
      scheduledRoutine((await snapshot(owner)).schedule, '2026-10-12')
    ).toBe(plan.id)
  })

  it('serializes competing starts, replays exact commands and scopes command UUIDs per owner', async () => {
    const owner = newOwner(),
      other = newOwner(),
      commandId = randomUUID()
    const body = {
      command_id: commandId,
      name: 'Recoverable',
      date: '2026-10-12'
    }
    const repeated = await Promise.all([
      invoke<Workout>(routes.startWorkout, owner, body),
      invoke<Workout>(routes.startWorkout, owner, body)
    ])
    expect(repeated[0]).toEqual(repeated[1])
    expect((await snapshot(owner)).workouts).toHaveLength(1)
    await expect(
      invoke(routes.startWorkout, owner, { ...body, name: 'Different' })
    ).rejects.toThrow('another action')
    const otherWorkout = await invoke<Workout>(routes.startWorkout, other, body)
    expect(otherWorkout.id).not.toBe(repeated[0].id)
    await discard(owner, repeated[0])
    const competing = await Promise.allSettled([start(owner), start(owner)])
    expect(
      competing.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      competing.filter(result => result.status === 'rejected')
    ).toHaveLength(1)
  })

  it('atomically logs the start weigh-in once and preserves the series on failed or replayed starts', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    const body = {
      command_id: randomUUID(),
      routine_id: plan.id,
      date: '2026-10-12',
      bodyweight_kg: 80
    }
    const active = await invoke<Workout>(routes.startWorkout, owner, body)
    expect(active.bodyweight_kg).toBe(80)
    const first = (await snapshot(owner)).bodyweight[0]!
    expect(first).toMatchObject({ date: '2026-10-12', weight_kg: 80 })
    await expect(
      invoke(routes.startWorkout, owner, {
        ...body,
        command_id: randomUUID(),
        bodyweight_kg: 99
      })
    ).rejects.toThrow('active workout')
    expect((await snapshot(owner)).bodyweight).toEqual([first])
    const newer = await invoke<Bodyweight>(routes.saveBodyweight, owner, {
      date: body.date,
      weight_kg: 81,
      notes: 'Keep this note'
    })
    expect(await invoke(routes.startWorkout, owner, body)).toEqual(active)
    expect((await snapshot(owner)).bodyweight).toEqual([newer])
    await discard(owner, active)
    const next = await invoke<Workout>(routes.startWorkout, owner, {
      ...body,
      command_id: randomUUID(),
      bodyweight_kg: 82
    })
    expect((await snapshot(owner)).bodyweight).toEqual([
      { ...newer, weight_kg: 82 }
    ])
    await discard(owner, next)
    await expect(
      invoke(routes.startWorkout, owner, {
        ...body,
        command_id: randomUUID(),
        routine_id: randomUUID(),
        bodyweight_kg: 99
      })
    ).rejects.toThrow('not found')
    expect((await snapshot(owner)).bodyweight).toEqual([
      { ...newer, weight_kg: 82 }
    ])
  })

  it('protects workout drafts against stale saves and retries an acknowledged update once', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    const active = await start(owner, plan.id),
      commandId = randomUUID()
    const changed = await update(
      owner,
      active,
      { notes: 'Saved draft', entries: log(active) },
      commandId
    )
    expect(
      await update(
        owner,
        active,
        { notes: 'Saved draft', entries: log(active) },
        commandId
      )
    ).toEqual(changed)
    await expect(update(owner, active, { notes: 'Overwrite' })).rejects.toThrow(
      'Reload'
    )
    await expect(
      update(owner, active, { notes: 'Changed payload' }, commandId)
    ).rejects.toThrow('another action')
    expect((await snapshot(owner)).active).toEqual(changed)
    const outcomes = await Promise.allSettled([
      update(owner, changed, { notes: 'One' }),
      update(owner, changed, { notes: 'Two' })
    ])
    expect(
      outcomes.filter(result => result.status === 'fulfilled')
    ).toHaveLength(1)
    expect(
      outcomes.filter(result => result.status === 'rejected')
    ).toHaveLength(1)
  })

  it('recovers persisted work/rest timers and records early elapsed time exactly once', async () => {
    const owner = newOwner(),
      custom = await exercise(owner, 'Timed hold', 'time'),
      plan = await routine(owner, custom.id, {
        mode: 'time',
        sets: 1,
        seconds: 45,
        progression: 'time'
      })
    const active = await start(owner, plan.id),
      entry = active.entries[0]!,
      set = entry.sets[0]!
    const timer = {
      entry_id: entry.id,
      set_id: set.id,
      started_at: new Date(Date.now() - 12000).toISOString(),
      target_seconds: 45
    }
    const ticking = await update(owner, active, {
      work_timer: timer,
      rest_until: new Date(Date.now() + 60000).toISOString()
    })
    expect((await snapshot(owner)).active?.work_timer).toEqual(timer)
    await expect(finish(owner, ticking)).rejects.toThrow()
    const body = {
      command_id: randomUUID(),
      expected_revision: ticking.revision
    }
    const stopped = await invoke<Workout>(
      routes.completeWorkTimer,
      owner,
      body,
      { id: active.id }
    )
    expect(stopped.entries[0]!.sets[0]!.seconds).toBeGreaterThanOrEqual(12)
    expect(stopped.entries[0]!.sets[0]!.seconds).toBeLessThan(45)
    expect(stopped.entries[0]!.sets[0]!.done).toBe(true)
    expect(stopped.work_timer).toBeNull()
    expect(stopped.rest_until).not.toBeNull()
    expect(
      await invoke(routes.completeWorkTimer, owner, body, { id: active.id })
    ).toEqual(stopped)
    await expect(
      invoke(
        routes.completeWorkTimer,
        owner,
        {
          ...body,
          command_id: randomUUID(),
          expected_revision: stopped.revision
        },
        { id: active.id }
      )
    ).rejects.toThrow('no active work timer')
  })

  it('retains missed sets at finish, derives progression and recomputes after history edits', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)

    let active = await start(owner, plan.id)
    active = await update(owner, active, { entries: log(active) })
    const completed = await finish(owner, active)

    let next = await start(owner, plan.id)
    expect(next.entries[0]!.suggestion).toMatchObject({
      kind: 'up',
      weight_kg: 102.5
    })
    await discard(owner, next)
    const changed = await update(owner, completed, {
      entries: completed.entries.map(entry => ({
        ...entry,
        sets: entry.sets.map((set, index) => ({ ...set, done: index !== 2 }))
      }))
    })
    expect(changed.entries[0]!.sets).toHaveLength(3)
    next = await start(owner, plan.id)
    expect(next.entries[0]!.suggestion).toMatchObject({
      kind: 'hold',
      weight_kg: 100,
      misses: 1
    })
    const state = await snapshot(owner)
    expect(state.stats).toMatchObject({
      workouts: 1,
      completed_sets: 2,
      volume_kg: 2000
    })
    expect(state.workouts.some(row => row.status === 'discarded')).toBe(true)
  })

  it('archives safely, preserves historical exercise snapshots and clears scheduled archived plans', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    const completed = await finish(
      owner,
      await update(owner, await start(owner, plan.id), {
        entries: log(await snapshot(owner).then(state => state.active!))
      })
    )
    await invoke(
      routes.updateExercise,
      owner,
      { ...custom, name: 'Renamed', expected_revision: custom.revision },
      { id: custom.id }
    )
    expect(
      (await snapshot(owner)).workouts.find(row => row.id === completed.id)
        ?.entries[0]?.exercise.name
    ).toBe('Synthetic press')
    await invoke(routes.setSchedule, owner, { weekday: 1, routine_id: plan.id })
    await invoke(
      routes.archiveRoutine,
      owner,
      { expected_revision: plan.revision },
      { id: plan.id }
    )
    expect(
      (await snapshot(owner)).schedule.find(row => row.weekday === 1)
        ?.routine_id
    ).toBeNull()
    await expect(start(owner, plan.id)).rejects.toThrow('Unarchive')
    const archived = await invoke<Exercise>(
      routes.archiveExercise,
      owner,
      { expected_revision: custom.revision + 1 },
      { id: custom.id }
    )
    await expect(routine(owner, archived.id)).rejects.toThrow('Unarchive')
    expect((await snapshot(owner)).stats.workouts).toBe(1)
  })

  it('upserts bodyweight per civil day and changes preferences without rewriting native kg logs', async () => {
    const owner = newOwner(),
      other = newOwner()
    const first = await invoke<Bodyweight>(routes.saveBodyweight, owner, {
      date: '2026-10-12',
      weight_kg: 80
    })
    const second = await invoke<Bodyweight>(routes.saveBodyweight, owner, {
      date: '2026-10-12',
      weight_kg: 81
    })
    expect(second.id).toBe(first.id)
    await expect(
      invoke(routes.saveBodyweight, other, {
        id: first.id,
        date: '2026-10-12',
        weight_kg: 99
      })
    ).rejects.toThrow('not found')
    const before = (await snapshot(owner)).settings
    const changed = await invoke<Settings>(routes.updateSettings, owner, {
      ...before,
      unit: 'lb',
      target_weight_kg: 75,
      effort: 'rpe',
      expected_revision: before.revision
    })
    expect(changed).toMatchObject({
      unit: 'lb',
      target_weight_kg: 75,
      revision: before.revision + 1
    })
    expect((await snapshot(owner)).bodyweight).toEqual([second])
    await expect(
      invoke(routes.updateSettings, owner, {
        ...before,
        expected_revision: before.revision
      })
    ).rejects.toThrow('Reload')
    await expect(
      invoke(routes.updateSettings, owner, {
        ...changed,
        timezone: 'missing timezone',
        expected_revision: changed.revision
      })
    ).rejects.toThrow()
  })

  it('exports plan subsets and merges native history without duplicate retries or same-day loss', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    const active = await start(owner, plan.id),
      completed = await finish(
        owner,
        await update(owner, active, { entries: log(active) })
      )
    const backup = await invoke<GymBackup>(routes.exportData, owner)
    const planBackup = await invoke<GymBackup>(
      routes.exportData,
      owner,
      undefined,
      { scope: 'plan', routine_id: plan.id }
    )
    expect(planBackup.workouts).toEqual([])
    expect(planBackup.bodyweight).toEqual([])
    expect(planBackup.settings).toBeUndefined()
    expect(planBackup.exercises).toHaveLength(1)
    const importedOwner = newOwner()
    const body = { command_id: randomUUID(), data: backup }
    const summary = await invoke<ImportSummary>(
      routes.importData,
      importedOwner,
      body
    )
    expect(summary).toMatchObject({ exercises: 1, routines: 1, workouts: 1 })
    expect(await invoke(routes.importData, importedOwner, body)).toEqual(
      summary
    )
    const again = await invoke<ImportSummary>(
      routes.importData,
      importedOwner,
      {
        ...body,
        command_id: randomUUID(),
        data: {
          ...backup,
          workouts: [
            {
              ...completed,
              id: randomUUID(),
              current_entry_id: null,
              entries: completed.entries.map(entry => ({
                ...entry,
                id: randomUUID(),
                sets: entry.sets.map(set => ({ ...set, id: randomUUID() }))
              }))
            }
          ]
        }
      }
    )
    expect(again.workouts).toBe(0)
    const distinct = await invoke<ImportSummary>(
      routes.importData,
      importedOwner,
      {
        command_id: randomUUID(),
        data: {
          ...backup,
          workouts: [
            {
              ...completed,
              id: randomUUID(),
              name: 'Second same-day session',
              started_at: '2026-10-12T12:00:00.000Z',
              finished_at: '2026-10-12T13:00:00.000Z'
            }
          ]
        }
      }
    )
    expect(distinct.workouts).toBe(1)
    expect((await snapshot(importedOwner)).stats.workouts).toBe(2)
  })

  it('restores native active timers with remapped identities and keeps archived/discarded history', async () => {
    const owner = newOwner(),
      target = newOwner(),
      custom = await exercise(owner, 'Timed', 'time'),
      plan = await routine(owner, custom.id, {
        mode: 'time',
        sets: 1,
        seconds: 60,
        progression: 'time'
      })
    const active = await start(owner, plan.id),
      entry = active.entries[0]!,
      set = entry.sets[0]!
    const timer = {
      entry_id: entry.id,
      set_id: set.id,
      started_at: new Date(Date.now() - 5000).toISOString(),
      target_seconds: 60
    }
    await update(owner, active, {
      work_timer: timer,
      rest_until: new Date(Date.now() + 20000).toISOString()
    })
    const backup = await invoke<GymBackup>(routes.exportData, owner)
    const summary = await invoke<ImportSummary>(routes.importData, target, {
      command_id: randomUUID(),
      data: backup
    })
    expect(summary.workouts).toBe(1)
    const restored = (await snapshot(target)).active!
    expect(restored.id).not.toBe(active.id)
    expect(restored.work_timer?.entry_id).toBe(restored.entries[0]!.id)
    expect(restored.work_timer?.set_id).toBe(restored.entries[0]!.sets[0]!.id)
    expect(restored.work_timer?.started_at).toBe(timer.started_at)
    expect(restored.rest_until).toBe(backup.workouts[0]!.rest_until)
    await discard(owner, (await snapshot(owner)).active!)
    await invoke(
      routes.archiveExercise,
      owner,
      { expected_revision: custom.revision },
      { id: custom.id }
    )
    const archivedBackup = await invoke<GymBackup>(routes.exportData, owner)
    const fresh = newOwner()
    await invoke(routes.importData, fresh, {
      command_id: randomUUID(),
      data: archivedBackup
    })
    expect((await snapshot(fresh)).workouts[0]?.status).toBe('discarded')
    expect(
      (await snapshot(fresh)).exercises.find(row => row.custom)?.archived
    ).toBe(true)
  })

  it('rolls back invalid imports and replacement, resets only owned data and replays reset once', async () => {
    const owner = newOwner(),
      other = newOwner(),
      custom = await exercise(owner),
      foreign = await exercise(other)
    const builtin = (await snapshot(owner)).exercises.find(
      item => item.catalog_key === '0025'
    )!
    const edited = await invoke<Exercise>(
      routes.updateExercise,
      owner,
      {
        ...builtin,
        name: 'My modified bench',
        instructions: 'Saved personal catalog instructions',
        expected_revision: builtin.revision
      },
      { id: builtin.id }
    )
    await invoke(
      routes.archiveExercise,
      owner,
      { expected_revision: edited.revision },
      { id: edited.id }
    )
    await routine(owner, custom.id)
    await invoke(routes.saveBodyweight, owner, {
      date: '2026-10-12',
      weight_kg: 80
    })
    const backup = await invoke<GymBackup>(routes.exportData, owner)
    await invoke(routes.importData, other, {
      command_id: randomUUID(),
      data: backup
    })
    expect(
      (await snapshot(other)).exercises.find(
        item => item.catalog_key === '0025'
      )
    ).toMatchObject({
      name: 'barbell bench press',
      archived: false,
      revision: 1
    })
    const before = await snapshot(owner)
    const invalid = {
      ...backup,
      routines: [
        {
          ...backup.routines[0]!,
          entries: [
            { ...backup.routines[0]!.entries[0]!, exercise_id: randomUUID() }
          ]
        }
      ]
    }
    await expect(
      invoke(routes.importData, owner, {
        command_id: randomUUID(),
        data: invalid,
        mode: 'replace',
        confirmation: 'REPLACE GYM'
      })
    ).rejects.toThrow('missing')
    expect(await snapshot(owner)).toEqual(before)
    await expect(
      invoke(routes.importData, owner, {
        command_id: randomUUID(),
        data: backup,
        mode: 'replace'
      })
    ).rejects.toThrow('confirmation')
    const body = { command_id: randomUUID(), confirmation: 'RESET GYM' }
    expect(await invoke(routes.resetData, owner, body)).toEqual({ reset: true })
    const reset = await snapshot(owner)
    expect(reset.exercises).toHaveLength(1324)
    expect(reset.routines).toEqual([])
    expect(reset.bodyweight).toEqual([])
    expect(reset.settings.revision).toBe(before.settings.revision + 1)
    const saved = await exercise(owner, 'After reset')
    await invoke(routes.resetData, owner, body)
    expect(
      (await snapshot(owner)).exercises.some(row => row.id === saved.id)
    ).toBe(true)
    expect(
      (await snapshot(other)).exercises.some(row => row.id === foreign.id)
    ).toBe(true)
    await invoke(routes.importData, owner, {
      command_id: randomUUID(),
      data: backup,
      mode: 'replace',
      confirmation: 'REPLACE GYM',
      include_settings: true
    })
    const restored = await snapshot(owner)
    expect(restored.routines).toHaveLength(1)
    expect(restored.bodyweight).toHaveLength(1)
    expect(
      restored.exercises.find(item => item.catalog_key === '0025')
    ).toMatchObject({
      name: 'My modified bench',
      instructions: 'Saved personal catalog instructions',
      archived: true,
      revision: 2
    })
    expect(restored.exercises.some(row => row.id === saved.id)).toBe(false)
  })

  it('creates starter plans atomically with preserved existing weekday assignments', async () => {
    const owner = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    await invoke(routes.setSchedule, owner, { weekday: 1, routine_id: plan.id })
    const body = { command_id: randomUUID() }
    const created = await invoke<Routine[]>(routes.starterPlan, owner, body)
    expect(created.map(row => row.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(created.every(row => row.entries.length >= 2)).toBe(true)
    expect(await invoke(routes.starterPlan, owner, body)).toEqual(created)
    const state = await snapshot(owner)
    const chosen = created
      .flatMap(row => row.entries)
      .map(entry =>
        state.exercises.find(item => item.id === entry.exercise_id)!
      )
    expect(new Set(chosen.map(item => item.id)).size).toBe(9)
    expect(chosen.map(item => item.catalog_key)).toEqual([
      '0025',
      '0405',
      '0201',
      '0027',
      '2330',
      '0294',
      '0043',
      '0085',
      '0417'
    ])
    expect(chosen.map(item => item.muscle_group)).toEqual([
      'chest',
      'shoulders',
      'triceps',
      'back',
      'back',
      'biceps',
      'glutes',
      'glutes',
      'calves'
    ])
    expect(chosen[6]!.secondary_muscles).toContain('quadriceps')
    expect(chosen[7]!.secondary_muscles).toContain('hamstrings')
    expect(state.routines).toHaveLength(4)
    expect(state.schedule.find(row => row.weekday === 1)?.routine_id).toBe(
      plan.id
    )
    expect(
      state.schedule.filter(row => row.weekday === 3 || row.weekday === 5)
    ).toHaveLength(2)
  })

  it('combines owned Calendar recurring plans, date rest overrides and finished history across DST', async () => {
    const owner = newOwner(),
      other = newOwner(),
      custom = await exercise(owner),
      plan = await routine(owner, custom.id)
    const preference = (await snapshot(owner)).settings
    await invoke(routes.updateSettings, owner, {
      ...preference,
      timezone: 'America/New_York',
      reminder_time: '08:00',
      expected_revision: preference.revision
    })
    await invoke(routes.setSchedule, owner, { weekday: 0, routine_id: plan.id })
    const feed = (user: string) =>
      db.transaction(async tx => {
        await tx.execute(sql`select set_config('zillion.user_id',${user},true)`)

        return getEvents({
          db: tx,
          start: '2026-10-24T00:00:00.000Z',
          end: '2026-11-10T00:00:00.000Z'
        })
      })
    const recurring = await feed(owner)
    expect(
      recurring.find(item => item.start.startsWith('2026-10-25'))?.start
    ).toBe('2026-10-25T12:00:00.000Z')
    expect(
      recurring.find(item => item.start.startsWith('2026-11-01'))?.start
    ).toBe('2026-11-01T13:00:00.000Z')
    expect(
      recurring.every(item =>
        item.reference_link.startsWith('/gym?section=plan&routine=' + plan.id)
      )
    ).toBe(true)
    expect(await feed(other)).toEqual([])
    await snapshot(other)
    expect(await feed(other)).toEqual([])
    await invoke(routes.setSchedule, owner, {
      date: '2026-11-01',
      routine_id: null
    })
    const active = await invoke<Workout>(routes.startWorkout, owner, {
      command_id: randomUUID(),
      routine_id: plan.id,
      date: '2026-10-25'
    })
    const completed = await finish(
      owner,
      await update(owner, active, { entries: log(active) })
    )
    await db.transaction(async tx => {
      await tx.execute(sql`select set_config('zillion.user_id',${owner},true)`)
      await tx
        .update(workouts)
        .set({
          started_at: new Date('2026-10-25T15:00:00.000Z'),
          finished_at: new Date('2026-10-25T16:00:00.000Z')
        })
        .where(and(eq(workouts.owner_id, owner), eq(workouts.id, completed.id)))
    })
    const after = await feed(owner)
    expect(
      after.filter(item => item.start.startsWith('2026-10-25'))
    ).toHaveLength(1)
    expect(after.find(item => item.id === completed.id)).toMatchObject({
      is_strikethrough: true,
      reference_link: '/gym?section=history&workout=' + completed.id,
      start: '2026-10-25T15:00:00.000Z',
      end: '2026-10-25T16:00:00.000Z'
    })
    expect(after.some(item => item.start.startsWith('2026-11-01'))).toBe(false)
    expect(
      after.find(item => item.start.startsWith('2026-11-08'))
    ).toMatchObject({
      is_strikethrough: false,
      start: '2026-11-08T13:00:00.000Z'
    })
    expect(await feed(other)).toEqual([])
  })
})
