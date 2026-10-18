import { and, asc, eq, gt, inArray, isNull, lt, lte, or } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { ClientError } from '@monolith/server-utils'

import {
  type GymPushSubscription,
  type PushLanguage,
  type PushPayload,
  type PushSubscriptionInput,
  pushSubscriptionSchema
} from '../pushShared'
import { scheduledRoutine, settingsInputSchema } from '../shared'
import { readyCoachNotifications } from './coachNotifications'
import { type PushKind, pushDeliveries, pushSubscriptions } from './pushSchema'
import { endpointHash } from './pushTransport'
import { routines, schedule, settings, workouts } from './schema.drizzle'
import { type GymStore, lockOwner } from './store'

export function subscriptionDTO(
  item: typeof pushSubscriptions.$inferSelect
): GymPushSubscription {
  return pushSubscriptionSchema.parse({
    ...item,
    created: item.created.toISOString(),
    last_success: item.last_success?.toISOString() ?? null
  })
}

export async function listSubscriptions(db: GymStore, owner: string) {
  return (
    await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.owner_id, owner))
      .orderBy(asc(pushSubscriptions.created))
  ).map(subscriptionDTO)
}

export async function saveSubscription(
  db: GymStore,
  owner: string,
  input: PushSubscriptionInput,
  now = new Date()
) {
  await lockOwner(db, owner)
  const endpoint_hash = endpointHash(input.subscription.endpoint)
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.owner_id, owner))

  if (
    !existing.some(item => item.endpoint_hash === endpoint_hash) &&
    existing.length >= 10
  )
    throw new ClientError(
      'Remove an old device before enabling another subscription',
      409
    )

  const expires_at = input.subscription.expirationTime
    ? new Date(input.subscription.expirationTime)
    : null

  if (
    expires_at &&
    (expires_at.getTime() <= now.getTime() ||
      Number.isNaN(expires_at.getTime()))
  )
    throw new ClientError(
      'This browser subscription has expired; create a new one'
    )

  const [item] = await db
    .insert(pushSubscriptions)
    .values({
      owner_id: owner,
      endpoint: input.subscription.endpoint,
      endpoint_hash,
      keys: input.subscription.keys,
      device_name: input.device_name,
      language: input.language,
      preferences: input.preferences,
      expires_at
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.owner_id, pushSubscriptions.endpoint_hash],
      set: {
        keys: input.subscription.keys,
        device_name: input.device_name,
        language: input.language,
        preferences: input.preferences,
        expires_at,
        last_error: null
      }
    })
    .returning()

  if (!item) throw new Error('Push subscription was not saved')
  // Changed device keys/preferences must not replay payloads captured before opt-in.
  await db
    .update(pushDeliveries)
    .set({ status: 'cancelled', lease_token: null, lease_until: null })
    .where(
      and(
        eq(pushDeliveries.owner_id, owner),
        eq(pushDeliveries.subscription_id, item.id),
        inArray(pushDeliveries.status, ['pending', 'sending'])
      )
    )

  return subscriptionDTO(item)
}

export async function removeSubscription(
  db: GymStore,
  owner: string,
  endpoint: string
) {
  await lockOwner(db, owner)
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.owner_id, owner),
        eq(pushSubscriptions.endpoint_hash, endpointHash(endpoint))
      )
    )
}

export function civilNow(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(now)
  const value = (type: string) => parts.find(item => item.type === type)!.value

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minute: Number(value('hour')) * 60 + Number(value('minute'))
  }
}

const copy: Record<PushLanguage, Record<PushKind, [string, string]>> = {
  en: {
    planned: ['Workout planned today', 'Your training plan is ready.'],
    rest: ['Rest finished', 'Time for your next set.'],
    coach: ['Coach suggestions ready', 'Review your new training suggestions.'],
    test: ['Monolith Gym', 'Background notifications are enabled.']
  },
  ms: {
    planned: [
      'Senaman dijadualkan hari ini',
      'Pelan latihan anda sudah sedia.'
    ],
    rest: ['Rehat selesai', 'Masa untuk set seterusnya.'],
    coach: ['Cadangan jurulatih sedia', 'Semak cadangan latihan baharu anda.'],
    test: ['Monolith Gym', 'Pemberitahuan latar belakang diaktifkan.']
  },
  'zh-CN': {
    planned: ['今天有训练计划', '你的训练计划已准备好。'],
    rest: ['休息结束', '开始下一组训练吧。'],
    coach: ['教练建议已就绪', '查看新的训练建议。'],
    test: ['Monolith Gym', '后台通知已启用。']
  },
  'zh-TW': {
    planned: ['今天有訓練計畫', '你的訓練計畫已準備好。'],
    rest: ['休息結束', '開始下一組訓練吧。'],
    coach: ['教練建議已就緒', '查看新的訓練建議。'],
    test: ['Monolith Gym', '背景通知已啟用。']
  }
}

type Candidate = { key: string; kind: PushKind; due: Date; expires: Date }

export function notificationPayload(
  kind: PushKind,
  language: PushLanguage,
  key: string,
  owner: string
): PushPayload {
  const [title, body] = copy[language][kind]

  return {
    owner_id: owner,
    title,
    body,
    tag: `gym:${key}`,
    url:
      kind === 'rest'
        ? '/gym?section=workout'
        : kind === 'coach'
          ? '/gym?section=coach'
          : '/gym?section=dashboard'
  }
}

export async function notificationCandidates(
  db: GymStore,
  owner: string,
  now: Date
): Promise<Candidate[]> {
  const candidates: Candidate[] = []
  const [preference] = await db
    .select()
    .from(settings)
    .where(eq(settings.owner_id, owner))

  if (preference) {
    const values = settingsInputSchema.parse(preference.values)

    if (values.reminder_enabled) {
      const local = civilNow(now, values.timezone)
      const [hour, minute] = values.reminder_time.split(':').map(Number)
      const elapsed = local.minute - (hour! * 60 + minute!)

      if (elapsed >= 0 && elapsed < 15) {
        const calendar = await db
          .select()
          .from(schedule)
          .where(eq(schedule.owner_id, owner))
        const routineId = scheduledRoutine(calendar, local.date)

        if (routineId) {
          const [routine] = await db
            .select()
            .from(routines)
            .where(
              and(
                eq(routines.owner_id, owner),
                eq(routines.id, routineId),
                eq(routines.archived, false)
              )
            )
          const [session] = await db
            .select({ id: workouts.id })
            .from(workouts)
            .where(
              and(
                eq(workouts.owner_id, owner),
                eq(workouts.date, local.date),
                inArray(workouts.status, ['active', 'completed'])
              )
            )
            .limit(1)

          if (routine && !session)
            candidates.push({
              key: `planned:${local.date}`,
              kind: 'planned',
              due: now,
              expires: new Date(now.getTime() + (15 - elapsed) * 60000)
            })
        }
      }
    }
  }

  const [active] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.owner_id, owner), eq(workouts.status, 'active')))
    .limit(1)

  if (
    active?.rest_until &&
    active.rest_until.getTime() > now.getTime() - 5 * 60000 &&
    active.rest_until.getTime() <= now.getTime() + 3600000
  )
    candidates.push({
      key: `rest:${active.id}:${active.rest_until.getTime()}`,
      kind: 'rest',
      due: active.rest_until,
      expires: new Date(active.rest_until.getTime() + 5 * 60000)
    })
  for (const job of await readyCoachNotifications(
    db,
    owner,
    new Date(now.getTime() - 24 * 3600000)
  ))
    if (job.changes > 0)
      candidates.push({
        key: `coach:${job.id}`,
        kind: 'coach',
        due: now,
        expires: new Date(now.getTime() + 3600000)
      })

  return candidates
}

export async function enqueueNotifications(
  db: GymStore,
  owner: string,
  now: Date
) {
  await lockOwner(db, owner)
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.owner_id, owner),
        lte(pushSubscriptions.expires_at, now)
      )
    )
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.owner_id, owner))
    .limit(10)

  if (!subscriptions.length) return 0

  const candidates = await notificationCandidates(db, owner, now)
  const outstanding = await db
    .select()
    .from(pushDeliveries)
    .where(
      and(
        eq(pushDeliveries.owner_id, owner),
        inArray(pushDeliveries.status, ['pending', 'sending'])
      )
    )

  for (const delivery of outstanding) {
    const subscription = subscriptions.find(
      item => item.id === delivery.subscription_id
    )
    const valid =
      delivery.kind === 'test' ||
      candidates.some(item => item.key === delivery.dedupe_key)

    if (
      !subscription ||
      delivery.expires_at <= now ||
      !valid ||
      (delivery.kind !== 'test' && !subscription.preferences[delivery.kind])
    )
      await db
        .update(pushDeliveries)
        .set({ status: 'cancelled', lease_token: null, lease_until: null })
        .where(
          and(
            eq(pushDeliveries.owner_id, owner),
            eq(pushDeliveries.id, delivery.id)
          )
        )
  }

  const rows = subscriptions.flatMap(subscription =>
    candidates
      .filter(
        item => subscription.preferences[item.kind as Exclude<PushKind, 'test'>]
      )
      .map(item => ({
        owner_id: owner,
        subscription_id: subscription.id,
        dedupe_key: item.key,
        kind: item.kind,
        payload: notificationPayload(
          item.kind,
          subscription.language,
          item.key,
          owner
        ),
        due_at: item.due,
        expires_at: item.expires
      }))
  )
  const inserted = rows.length
    ? await db
        .insert(pushDeliveries)
        .values(rows)
        .onConflictDoNothing()
        .returning({ id: pushDeliveries.id })
    : []
  // Retain enough event keys for restart deduplication without unbounded delivery history.
  const old = await db
    .select({ id: pushDeliveries.id })
    .from(pushDeliveries)
    .where(
      and(
        eq(pushDeliveries.owner_id, owner),
        lt(pushDeliveries.created, new Date(now.getTime() - 30 * 86400000)),
        inArray(pushDeliveries.status, ['sent', 'failed', 'cancelled'])
      )
    )
    .limit(200)

  if (old.length)
    await db.delete(pushDeliveries).where(
      and(
        eq(pushDeliveries.owner_id, owner),
        inArray(
          pushDeliveries.id,
          old.map(item => item.id)
        )
      )
    )

  return inserted.length
}

export async function queueTest(
  db: GymStore,
  owner: string,
  command: string,
  endpoint?: string,
  now = new Date()
) {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.owner_id, owner),
        endpoint
          ? eq(pushSubscriptions.endpoint_hash, endpointHash(endpoint))
          : undefined,
        or(
          isNull(pushSubscriptions.expires_at),
          gt(pushSubscriptions.expires_at, now)
        )
      )
    )
    .limit(10)

  if (!subscriptions.length)
    throw new ClientError('Enable notifications on this device first', 409)

  const result = await db
    .insert(pushDeliveries)
    .values(
      subscriptions.map(item => ({
        owner_id: owner,
        subscription_id: item.id,
        dedupe_key: `test:${command}`,
        kind: 'test' as const,
        payload: notificationPayload(
          'test',
          item.language,
          `test:${command}`,
          owner
        ),
        due_at: now,
        expires_at: new Date(now.getTime() + 5 * 60000)
      }))
    )
    .onConflictDoNothing()
    .returning({ id: pushDeliveries.id })

  return { queued: result.length }
}

export async function claimDeliveries(
  db: GymStore,
  owner: string,
  now: Date,
  limit: number
) {
  const rows = await db
    .select()
    .from(pushDeliveries)
    .where(
      and(
        eq(pushDeliveries.owner_id, owner),
        lte(pushDeliveries.due_at, now),
        gt(pushDeliveries.expires_at, now),
        lt(pushDeliveries.attempts, 4),
        or(
          eq(pushDeliveries.status, 'pending'),
          and(
            eq(pushDeliveries.status, 'sending'),
            lte(pushDeliveries.lease_until, now)
          )
        )
      )
    )
    .orderBy(asc(pushDeliveries.due_at))
    .limit(Math.min(10, limit))
    .for('update', { skipLocked: true })
  const claims = []

  for (const row of rows) {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.owner_id, owner),
          eq(pushSubscriptions.id, row.subscription_id)
        )
      )

    if (!subscription) continue

    const token = randomUUID()
    await db
      .update(pushDeliveries)
      .set({
        status: 'sending',
        attempts: row.attempts + 1,
        lease_token: token,
        lease_until: new Date(now.getTime() + 60000)
      })
      .where(
        and(eq(pushDeliveries.owner_id, owner), eq(pushDeliveries.id, row.id))
      )
    claims.push({
      delivery: { ...row, attempts: row.attempts + 1, lease_token: token },
      subscription
    })
  }

  return claims
}

export async function settleDelivery(
  db: GymStore,
  owner: string,
  claim: Awaited<ReturnType<typeof claimDeliveries>>[number],
  now: Date,
  error?: { code: string; retryable: boolean; gone: boolean }
) {
  await lockOwner(db, owner)
  const predicate = and(
    eq(pushDeliveries.owner_id, owner),
    eq(pushDeliveries.id, claim.delivery.id),
    eq(pushDeliveries.status, 'sending'),
    eq(pushDeliveries.lease_token, claim.delivery.lease_token)
  )
  const [current] = await db
    .select({ id: pushDeliveries.id })
    .from(pushDeliveries)
    .where(predicate)

  if (!current) return

  if (error?.gone) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.owner_id, owner),
          eq(pushSubscriptions.id, claim.subscription.id)
        )
      )

    return
  }

  const retry =
    error?.retryable &&
    claim.delivery.attempts < 4 &&
    claim.delivery.expires_at.getTime() > now.getTime() + 30000
  await db
    .update(pushDeliveries)
    .set({
      status: error ? (retry ? 'pending' : 'failed') : 'sent',
      error_code: error?.code ?? null,
      sent_at: error ? null : now,
      lease_token: null,
      lease_until: null,
      ...(retry
        ? {
            due_at: new Date(
              now.getTime() + 30000 * 2 ** (claim.delivery.attempts - 1)
            )
          }
        : {})
    })
    .where(predicate)
  await db
    .update(pushSubscriptions)
    .set(
      error
        ? { last_error: error.code }
        : { last_error: null, last_success: now }
    )
    .where(
      and(
        eq(pushSubscriptions.owner_id, owner),
        eq(pushSubscriptions.id, claim.subscription.id)
      )
    )
}

export async function deliveryCurrent(
  db: GymStore,
  owner: string,
  claim: Awaited<ReturnType<typeof claimDeliveries>>[number],
  now: Date
) {
  await lockOwner(db, owner)
  const [delivery] = await db
    .select()
    .from(pushDeliveries)
    .where(
      and(
        eq(pushDeliveries.owner_id, owner),
        eq(pushDeliveries.id, claim.delivery.id),
        eq(pushDeliveries.status, 'sending'),
        eq(pushDeliveries.lease_token, claim.delivery.lease_token)
      )
    )
  const [subscription] = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.owner_id, owner),
        eq(pushSubscriptions.id, claim.subscription.id)
      )
    )
  const valid =
    !!delivery &&
    delivery.payload.owner_id === owner &&
    !!subscription &&
    delivery.expires_at > now &&
    (!subscription.expires_at || subscription.expires_at > now) &&
    (delivery.kind === 'test' ||
      (subscription.preferences[delivery.kind] &&
        (await notificationCandidates(db, owner, now)).some(
          item => item.key === delivery.dedupe_key
        )))

  if (delivery && !valid)
    await db
      .update(pushDeliveries)
      .set({ status: 'cancelled', lease_until: null, lease_token: null })
      .where(
        and(
          eq(pushDeliveries.owner_id, owner),
          eq(pushDeliveries.id, delivery.id)
        )
      )

  return valid
}
