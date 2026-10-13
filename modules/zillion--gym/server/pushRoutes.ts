import z from 'zod'

import { ClientError } from '@lifeforge/server-utils'

import {
  pushStatusSchema,
  pushSubscriptionInputSchema,
  pushSubscriptionSchema
} from '../pushShared'
import forge from './forge'
import {
  listSubscriptions,
  queueTest,
  removeSubscription,
  saveSubscription
} from './pushStore'
import {
  readVapidConfig,
  resolvePushEndpoint,
  validateSubscriptionKeys
} from './pushTransport'
import { ownerId, runCommand } from './store'

function humanOwner(res: {
  locals: { userId?: unknown; actorType?: unknown }
}) {
  const owner = ownerId(res)

  if (res.locals.actorType === 'agent')
    throw new ClientError(
      'Only the signed-in owner can manage browser notifications',
      403
    )

  return owner
}

export const pushStatus = forge
  .query({
    description:
      'Read Web Push capability and your opted-in devices without exposing endpoint credentials',
    output: { OK: pushStatusSchema }
  })
  .callback(async ({ db, res, response }) => {
    const config = readVapidConfig()
    const owner = ownerId(res)

    return response.ok({
      owner_id: owner,
      configured: !!config,
      public_key: config?.publicKey ?? null,
      subscriptions: await listSubscriptions(db, owner)
    })
  })

export const subscribePush = forge
  .mutation({
    description:
      'Explicitly opt this browser into encrypted background Gym notifications',
    input: { body: pushSubscriptionInputSchema },
    output: { OK: pushSubscriptionSchema }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = humanOwner(res)

    if (!readVapidConfig())
      throw new ClientError(
        'Background notifications are not configured on this server',
        503
      )
    validateSubscriptionKeys(body.subscription.keys)
    await resolvePushEndpoint(body.subscription.endpoint)
    const result = await db.transaction(tx => saveSubscription(tx, owner, body))

    return response.ok(result)
  })

export const unsubscribePush = forge
  .mutation({
    description:
      'Remove only your own browser subscription and its queued notifications',
    input: {
      body: z.object({ endpoint: z.string().min(1).max(2048) }).strict()
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    await db.transaction(tx =>
      removeSubscription(tx, humanOwner(res), body.endpoint)
    )

    return response.noContent()
  })

export const testPush = forge
  .mutation({
    description:
      'Queue an encrypted test notification once for your opted-in device',
    input: {
      body: z
        .object({
          command_id: z.uuid(),
          endpoint: z.string().min(1).max(2048).optional()
        })
        .strict()
    },
    output: { OK: z.object({ queued: z.number().int().nonnegative() }) }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = humanOwner(res)

    if (!readVapidConfig())
      throw new ClientError(
        'Background notifications are not configured on this server',
        503
      )

    const result = await db.transaction(tx =>
      runCommand(tx, owner, body.command_id, 'testPush', body, () =>
        queueTest(tx, owner, body.command_id, body.endpoint)
      )
    )

    return response.ok(result)
  })
