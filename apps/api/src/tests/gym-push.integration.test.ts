import { and, defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createECDH, randomBytes, randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import {
  type GymPushSubscription,
  type PushStatus,
  pushSubscriptionInputSchema
} from '../../../../modules/monolith--gym/pushShared'
import {
  startGymPushDispatcher,
  withPushOwner
} from '../../../../modules/monolith--gym/server/push'
import * as pushRoutes from '../../../../modules/monolith--gym/server/pushRoutes'
import {
  pushDeliveries,
  pushSubscriptions
} from '../../../../modules/monolith--gym/server/pushSchema'
import {
  claimDeliveries,
  deliveryCurrent,
  enqueueNotifications,
  listSubscriptions,
  notificationCandidates,
  queueTest,
  saveSubscription,
  settleDelivery
} from '../../../../modules/monolith--gym/server/pushStore'
import {
  PushDeliveryError,
  type PushSender
} from '../../../../modules/monolith--gym/server/pushTransport'
import {
  commands,
  exercises,
  relations,
  routines,
  schedule,
  settings,
  tables,
  workouts
} from '../../../../modules/monolith--gym/server/schema.drizzle'
import { settingsInputSchema } from '../../../../modules/monolith--gym/shared'

// Every DNS lookup is fake. The real transport is never called by these tests.
vi.mock(
  '../../../../modules/monolith--gym/server/pushTransport',
  async importOriginal => {
    const original =
      await importOriginal<
        typeof import('../../../../modules/monolith--gym/server/pushTransport')
      >()

    return {
      ...original,
      resolvePushEndpoint: (endpoint: string) =>
        original.resolvePushEndpoint(endpoint, async () => [
          { address: '8.8.8.8', family: 4 }
        ])
    }
  }
)

const enabled = process.env.ZILLION_INTEGRATION === '1'
const connection = process.env.DATABASE_URL || ''

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
      'Gym push tests require an explicit isolated loopback PostgreSQL database on port55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 8, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })

type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]

const owners = new Set<string>()
const owner = () => {
  const id = randomUUID()
  owners.add(id)

  return id
}
const vapidCurve = createECDH('prime256v1')
vapidCurve.generateKeys()
const config = {
  publicKey: vapidCurve.getPublicKey().toString('base64url'),
  privateKey: vapidCurve.getPrivateKey().toString('base64url'),
  subject: 'mailto:notifications@zillion.test'
}
const curve = createECDH('prime256v1')
curve.generateKeys()
const browser = (name = randomUUID()) => ({
  endpoint: `https://push.example.com/send/${name}`,
  keys: {
    p256dh: curve.getPublicKey().toString('base64url'),
    auth: randomBytes(16).toString('base64url')
  }
})

async function invoke<T>(
  route: EndpointContract,
  who: string | undefined,
  body?: unknown,
  actingAgent = false
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(
      sql`select set_config('zillion.user_id',${who ?? ''},true)`
    )

    return endpoint.callback({
      db: tx,
      body: endpoint.schema.body?.parse(body),
      res: {
        locals: { userId: who, ...(actingAgent ? { actorType: 'agent' } : {}) }
      }
    } as unknown as Context)
  })

  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}

const scoped = <T>(who: string, work: Parameters<typeof withPushOwner<T>>[2]) =>
  withPushOwner(db, who, work)
const subscribe = (
  who: string,
  subscription = browser(),
  preferences = { planned: true, rest: true, coach: true }
) =>
  invoke<GymPushSubscription>(pushRoutes.subscribePush, who, {
    subscription,
    preferences,
    language: 'en',
    device_name: 'Synthetic device'
  })

async function plan(
  who: string,
  now: Date,
  timezone = 'UTC',
  reminder = '09:00'
) {
  return scoped(who, async tx => {
    await tx.insert(settings).values({
      owner_id: who,
      values: settingsInputSchema.parse({
        reminder_enabled: true,
        reminder_time: reminder,
        timezone
      })
    })
    const [routine] = await tx
      .insert(routines)
      .values({ owner_id: who, name: 'Synthetic training' })
      .returning()
    await tx.insert(schedule).values({
      owner_id: who,
      weekday: now.getUTCDay(),
      routine_id: routine!.id
    })

    return routine!
  })
}

describe.skipIf(!enabled)('owner-scoped native Gym background push', () => {
  beforeAll(() => {
    vi.stubEnv('ZILLION_GYM_PUSH_PUBLIC_KEY', config.publicKey)
    vi.stubEnv('ZILLION_GYM_PUSH_PRIVATE_KEY', config.privateKey)
    vi.stubEnv('ZILLION_GYM_PUSH_SUBJECT', config.subject)
  })
  afterAll(async () => {
    for (const who of owners)
      await scoped(who, async tx => {
        await tx
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.owner_id, who))
        await tx.delete(schedule).where(eq(schedule.owner_id, who))
        await tx.delete(workouts).where(eq(workouts.owner_id, who))
        await tx.delete(routines).where(eq(routines.owner_id, who))
        await tx.delete(exercises).where(eq(exercises.owner_id, who))
        await tx.delete(settings).where(eq(settings.owner_id, who))
        await tx.delete(commands).where(eq(commands.owner_id, who))
      })
    vi.unstubAllEnvs()
    await client.end()
  })
  it('stores explicit device preferences and opaque status, enforces auth, RLS and owner-qualified subscription foreign keys', async () => {
    const first = owner(),
      second = owner(),
      subscription = browser()
    const device = await subscribe(first, subscription, {
      planned: true,
      rest: false,
      coach: true
    })
    expect(device).toMatchObject({
      device_name: 'Synthetic device',
      preferences: { planned: true, rest: false, coach: true }
    })
    expect(device.endpoint_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(device)).not.toContain(subscription.endpoint)
    expect(JSON.stringify(device)).not.toContain(subscription.keys.auth)
    const status = await invoke<PushStatus>(pushRoutes.pushStatus, first)
    expect(status.configured).toBe(true)
    expect(status.owner_id).toBe(first)
    expect(status.public_key).toBe(config.publicKey)
    expect(status.subscriptions).toHaveLength(1)
    expect(
      (await invoke<PushStatus>(pushRoutes.pushStatus, second)).subscriptions
    ).toEqual([])
    await expect(invoke(pushRoutes.pushStatus, undefined)).rejects.toThrow()
    expect(
      await scoped(second, tx => tx.select().from(pushSubscriptions))
    ).toEqual([])
    await expect(
      scoped(second, tx =>
        tx.insert(pushDeliveries).values({
          owner_id: second,
          subscription_id: device.id,
          dedupe_key: 'wrong-owner',
          kind: 'test',
          payload: {
            owner_id: second,
            title: 'Test',
            body: 'Test',
            tag: 'test',
            url: '/gym?section=dashboard'
          },
          due_at: new Date(),
          expires_at: new Date(Date.now() + 60000)
        })
      )
    ).rejects.toThrow()
    const flags =
      await client`select relname,relrowsecurity,relforcerowsecurity from pg_class where relname in ('zillion_gym__push_subscriptions','zillion_gym__push_deliveries')`
    expect(flags).toHaveLength(2)
    expect(
      flags.every(item => item.relrowsecurity && item.relforcerowsecurity)
    ).toBe(true)
    const allGymTables =
      await client`select relname,relrowsecurity,relforcerowsecurity from pg_class where relname like 'zillion_gym__%' and relkind='r'`
    expect(allGymTables).toHaveLength(15)
    expect(
      allGymTables.every(
        item => item.relrowsecurity && item.relforcerowsecurity
      )
    ).toBe(true)
  })

  it('requires human opt-in and refuses delegated agent subscription, test and opt-out mutations', async () => {
    const who = owner(),
      subscription = browser()
    await subscribe(who, subscription)
    for (const [route, body] of [
      [pushRoutes.subscribePush, { subscription }],
      [
        pushRoutes.testPush,
        { command_id: randomUUID(), endpoint: subscription.endpoint }
      ],
      [pushRoutes.unsubscribePush, { endpoint: subscription.endpoint }]
    ] as const)
      await expect(invoke(route, who, body, true)).rejects.toMatchObject({
        code: 403
      })
    expect(await scoped(who, tx => listSubscriptions(tx, who))).toHaveLength(1)
    expect(
      await scoped(who, tx =>
        tx.select().from(pushDeliveries).where(eq(pushDeliveries.owner_id, who))
      )
    ).toEqual([])
  })
  it('rejects unsafe endpoints, invalid encryption keys and expired subscriptions before writing', async () => {
    const who = owner(),
      valid = browser()

    for (const endpoint of [
      'https://127.0.0.1/send/x',
      'https://169.254.169.254/send/x',
      'http://push.example.com/send/x',
      'https://push.example.com:8443/send/x'
    ])
      await expect(subscribe(who, { ...valid, endpoint })).rejects.toThrow()
    await expect(
      subscribe(who, {
        ...valid,
        keys: { ...valid.keys, auth: 'a'.repeat(22) }
      })
    ).rejects.toThrow()
    await expect(
      invoke(pushRoutes.subscribePush, who, {
        subscription: { ...valid, expirationTime: Date.now() - 1000 }
      })
    ).rejects.toThrow('expired')
    expect(await scoped(who, tx => listSubscriptions(tx, who))).toEqual([])
  })
  it('updates one browser subscription, bounds owned devices, and preserves another account during unsubscribe', async () => {
    const first = owner(),
      second = owner(),
      subscription = browser()
    const old = await subscribe(first, subscription)
    const updated = await subscribe(first, subscription, {
      planned: false,
      rest: true,
      coach: false
    })
    expect(updated.id).toBe(old.id)
    expect(updated.preferences).toEqual({
      planned: false,
      rest: true,
      coach: false
    })
    const theirs = await subscribe(second, subscription)
    await invoke(pushRoutes.unsubscribePush, first, {
      endpoint: subscription.endpoint
    })
    expect(await scoped(first, tx => listSubscriptions(tx, first))).toEqual([])
    expect(
      await scoped(second, tx => listSubscriptions(tx, second))
    ).toMatchObject([{ id: theirs.id }])
    for (let index = 0; index < 10; index++) await subscribe(first)
    await expect(subscribe(first)).rejects.toThrow('Remove an old device')
  })
  it('queues test notification idempotently, rejects changed command payload and sends through an injected owner-scoped dispatcher', async () => {
    const first = owner(),
      second = owner(),
      subscription = browser()
    const device = await subscribe(first, subscription)
    await subscribe(second)
    const command_id = randomUUID(),
      body = { command_id, endpoint: subscription.endpoint }
    expect(await invoke(pushRoutes.testPush, first, body)).toEqual({
      queued: 1
    })
    expect(await invoke(pushRoutes.testPush, first, body)).toEqual({
      queued: 1
    })
    await expect(
      invoke(pushRoutes.testPush, first, { command_id })
    ).rejects.toThrow('another action')
    const sender = vi.fn<PushSender>(async () => {})
    const dispatcher = startGymPushDispatcher({
      db,
      listOwners: async () => [first],
      config,
      sender,
      runImmediately: false,
      intervalMs: 60000
    })

    try {
      expect(await dispatcher.tick()).toMatchObject({
        sent: 1,
        failed: 0,
        errors: 0
      })
      expect(await dispatcher.tick()).toMatchObject({ sent: 0 })
      expect(sender).toHaveBeenCalledTimes(1)
      expect(sender.mock.calls[0]![0]).toMatchObject(subscription)
      const status = await scoped(first, tx => listSubscriptions(tx, first))
      expect(status[0]).toMatchObject({ id: device.id, last_error: null })
      expect(status[0]!.last_success).not.toBeNull()
      expect(
        (await scoped(second, tx => listSubscriptions(tx, second)))[0]!
          .last_success
      ).toBeNull()
    } finally {
      await dispatcher.stop()
    }
  })
  it('enqueues recurring plans at the owner clock once across repeated DST hour and suppresses explicit rest/completed sessions', async () => {
    const who = owner(),
      now = new Date('2026-11-01T05:30:00Z')
    const routine = await plan(who, now, 'America/New_York', '01:30')
    await subscribe(who)
    expect(await scoped(who, tx => enqueueNotifications(tx, who, now))).toBe(1)
    expect(
      await scoped(who, tx =>
        enqueueNotifications(tx, who, new Date('2026-11-01T06:30:00Z'))
      )
    ).toBe(0)
    expect(
      await scoped(who, tx =>
        notificationCandidates(tx, who, new Date('2026-11-01T05:29:00Z'))
      )
    ).toEqual([])
    await scoped(who, tx =>
      tx
        .insert(schedule)
        .values({ owner_id: who, date: '2026-11-01', routine_id: null })
    )
    expect(
      await scoped(who, tx => notificationCandidates(tx, who, now))
    ).toEqual([])
    await scoped(who, tx =>
      tx
        .delete(schedule)
        .where(and(eq(schedule.owner_id, who), eq(schedule.date, '2026-11-01')))
    )
    await scoped(who, tx =>
      tx.insert(workouts).values({
        owner_id: who,
        routine_id: routine.id,
        name: 'Completed',
        date: '2026-11-01',
        status: 'completed',
        started_at: new Date('2026-11-01T04:00:00Z'),
        finished_at: new Date('2026-11-01T04:30:00Z')
      })
    )
    expect(
      await scoped(who, tx => notificationCandidates(tx, who, now))
    ).toEqual([])
  })
  it('recovers persisted rest timers, cancels extended/skipped timers and suppresses disabled device preferences', async () => {
    const who = owner(),
      now = new Date()
    const device = await subscribe(who)
    const active = await scoped(
      who,
      async tx =>
        (
          await tx
            .insert(workouts)
            .values({
              owner_id: who,
              name: 'Active',
              date: now.toISOString().slice(0, 10),
              status: 'active',
              rest_until: new Date(now.getTime() + 30000)
            })
            .returning()
        )[0]!
    )
    await scoped(who, tx => enqueueNotifications(tx, who, now))
    const old = await scoped(who, tx =>
      tx.select().from(pushDeliveries).where(eq(pushDeliveries.owner_id, who))
    )
    expect(old).toHaveLength(1)
    await scoped(who, tx =>
      tx
        .update(workouts)
        .set({ rest_until: new Date(now.getTime() + 60000) })
        .where(eq(workouts.id, active.id))
    )
    await scoped(who, tx => enqueueNotifications(tx, who, now))
    const jobs = await scoped(who, tx =>
      tx.select().from(pushDeliveries).where(eq(pushDeliveries.owner_id, who))
    )
    expect(jobs.find(item => item.id === old[0]!.id)!.status).toBe('cancelled')
    expect(jobs.filter(item => item.status === 'pending')).toHaveLength(1)
    const reopened = postgres(connection, { max: 1, prepare: false })

    try {
      const recovered = drizzle({
        client: reopened,
        relations: defineRelations(tables, relations)
      })
      const claims = await withPushOwner(recovered, who, tx =>
        claimDeliveries(tx, who, new Date(now.getTime() + 61000), 10)
      )
      expect(claims).toHaveLength(1)
      await scoped(who, tx =>
        tx
          .update(workouts)
          .set({ rest_until: null })
          .where(eq(workouts.id, active.id))
      )
      expect(
        await scoped(who, tx =>
          deliveryCurrent(tx, who, claims[0]!, new Date(now.getTime() + 61000))
        )
      ).toBe(false)
    } finally {
      await reopened.end()
    }
    await scoped(who, tx =>
      tx
        .update(pushSubscriptions)
        .set({ preferences: { planned: true, rest: false, coach: true } })
        .where(eq(pushSubscriptions.id, device.id))
    )
    await scoped(who, tx =>
      tx
        .update(workouts)
        .set({ rest_until: new Date(now.getTime() + 90000) })
        .where(eq(workouts.id, active.id))
    )
    expect(await scoped(who, tx => enqueueNotifications(tx, who, now))).toBe(0)
  })
  it('claims concurrently once, recovers expired leases, and ignores stale completion tokens', async () => {
    const who = owner(),
      now = new Date()
    await subscribe(who)
    await scoped(who, tx => queueTest(tx, who, randomUUID(), undefined, now))
    const [first, second] = await Promise.all([
      scoped(who, tx => claimDeliveries(tx, who, now, 10)),
      scoped(who, tx => claimDeliveries(tx, who, now, 10))
    ])
    expect(first.length + second.length).toBe(1)
    const stale = (first[0] ?? second[0])!
    const recovered = await scoped(who, tx =>
      claimDeliveries(tx, who, new Date(now.getTime() + 61000), 10)
    )
    expect(recovered).toHaveLength(1)
    expect(recovered[0]!.delivery.lease_token).not.toBe(
      stale.delivery.lease_token
    )
    await scoped(who, tx =>
      settleDelivery(tx, who, stale, new Date(now.getTime() + 61000))
    )
    expect(
      (
        await scoped(who, tx =>
          tx
            .select()
            .from(pushDeliveries)
            .where(eq(pushDeliveries.owner_id, who))
        )
      )[0]!.status
    ).toBe('sending')
    await scoped(who, tx =>
      settleDelivery(tx, who, recovered[0]!, new Date(now.getTime() + 62000))
    )
    expect(
      (
        await scoped(who, tx =>
          tx
            .select()
            .from(pushDeliveries)
            .where(eq(pushDeliveries.owner_id, who))
        )
      )[0]!.status
    ).toBe('sent')
  })
  it('bounds retries, stores sanitized provider failure and deletes gone subscriptions without touching other owners', async () => {
    const first = owner(),
      second = owner()
    const device = await subscribe(first)
    await subscribe(second)
    let now = new Date()
    await scoped(first, tx =>
      queueTest(tx, first, randomUUID(), undefined, now)
    )
    const sender = vi.fn(async () => {
      throw new PushDeliveryError('provider_503', true)
    })
    const dispatcher = startGymPushDispatcher({
      db,
      listOwners: async () => [first],
      config,
      sender,
      now: () => now,
      runImmediately: false,
      intervalMs: 60000
    })

    try {
      for (const elapsed of [0, 31000, 62000, 122000]) {
        now = new Date(now.getTime() + elapsed)
        expect(await dispatcher.tick()).toMatchObject({ failed: 1, errors: 0 })
      }

      const jobs = await scoped(first, tx =>
        tx
          .select()
          .from(pushDeliveries)
          .where(eq(pushDeliveries.owner_id, first))
      )
      expect(jobs[0]).toMatchObject({
        status: 'failed',
        attempts: 4,
        error_code: 'provider_503'
      })
      expect(
        (await scoped(first, tx => listSubscriptions(tx, first)))[0]
      ).toMatchObject({ id: device.id, last_error: 'provider_503' })
      expect(await dispatcher.tick()).toMatchObject({ failed: 0 })
    } finally {
      await dispatcher.stop()
    }
    await scoped(first, tx =>
      queueTest(tx, first, randomUUID(), undefined, now)
    )
    const gone = startGymPushDispatcher({
      db,
      listOwners: async () => [first],
      config,
      sender: async () => {
        throw new PushDeliveryError('subscription_expired', false, true)
      },
      now: () => now,
      runImmediately: false,
      intervalMs: 60000
    })

    try {
      await gone.tick()
    } finally {
      await gone.stop()
    }
    expect(await scoped(first, tx => listSubscriptions(tx, first))).toEqual([])
    expect(
      await scoped(first, tx =>
        tx
          .select()
          .from(pushDeliveries)
          .where(eq(pushDeliveries.owner_id, first))
      )
    ).toEqual([])
    expect(
      await scoped(second, tx => listSubscriptions(tx, second))
    ).toHaveLength(1)
  })
  it('cancels queued deliveries before opt-out and makes subscription removal idempotent', async () => {
    const who = owner(),
      subscription = browser()
    await subscribe(who, subscription)
    await invoke(pushRoutes.testPush, who, {
      command_id: randomUUID(),
      endpoint: subscription.endpoint
    })
    await invoke(pushRoutes.unsubscribePush, who, {
      endpoint: subscription.endpoint
    })
    await invoke(pushRoutes.unsubscribePush, who, {
      endpoint: subscription.endpoint
    })
    expect(
      await scoped(who, tx => claimDeliveries(tx, who, new Date(), 10))
    ).toEqual([])
    expect(
      await scoped(who, tx =>
        tx.select().from(pushDeliveries).where(eq(pushDeliveries.owner_id, who))
      )
    ).toEqual([])
  })
  it('rolls back subscription writes and command queueing when the caller transaction fails', async () => {
    const who = owner(),
      input = pushSubscriptionInputSchema.parse({ subscription: browser() })
    await expect(
      scoped(who, async tx => {
        await saveSubscription(tx, who, input)
        await queueTest(tx, who, randomUUID())
        throw new Error('Synthetic rollback')
      })
    ).rejects.toThrow('Synthetic rollback')
    expect(await scoped(who, tx => listSubscriptions(tx, who))).toEqual([])
    expect(
      await scoped(who, tx =>
        tx.select().from(pushDeliveries).where(eq(pushDeliveries.owner_id, who))
      )
    ).toEqual([])
  })

  it('shares the100delivery budget across a whole owner page without starving later subscribed accounts', async () => {
    const page = Array.from({ length: 12 }, owner)

    for (const who of page) {
      for (let index = 0; index < 10; index++) await subscribe(who)
      await scoped(who, tx => queueTest(tx, who, randomUUID()))
    }

    const sender = vi.fn<PushSender>(async () => {})
    const listOwners = vi.fn(async () => page)
    const dispatcher = startGymPushDispatcher({
      db,
      listOwners,
      config,
      sender,
      runImmediately: false,
      intervalMs: 60000
    })

    try {
      expect(await dispatcher.tick()).toMatchObject({
        owners: 12,
        sent: 100,
        failed: 0,
        errors: 0
      })
      expect(listOwners).toHaveBeenCalledWith(50)
      for (const who of page)
        expect(
          sender.mock.calls.filter(call => call[1].owner_id === who).length
        ).toBeGreaterThan(0)
      expect(await dispatcher.tick()).toMatchObject({
        sent: 20,
        failed: 0,
        errors: 0
      })
    } finally {
      await dispatcher.stop()
    }
  })
})
