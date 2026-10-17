import { sql } from 'drizzle-orm'

import {
  claimDeliveries,
  deliveryCurrent,
  enqueueNotifications,
  settleDelivery
} from './pushStore'
import {
  PushDeliveryError,
  type PushSender,
  type VapidConfig,
  createPushSender,
  readVapidConfig
} from './pushTransport'
import type { GymDatabase, GymStore } from './store'

export type PushDispatchSummary = {
  configured: boolean
  owners: number
  queued: number
  sent: number
  failed: number
  errors: number
}

export type PushDispatcherOptions = {
  db: GymDatabase
  listOwners: (limit: number) => Promise<string[]>
  intervalMs?: number
  config?: VapidConfig | null
  sender?: PushSender
  now?: () => Date
  runImmediately?: boolean
  onError?: (code: string) => void
}

export async function withPushOwner<T>(
  db: GymDatabase,
  owner: string,
  work: (tx: GymStore) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${owner},true)`)

    return work(tx)
  })
}

/** Starts only from the host lifecycle. Importing this module never starts work. */
export function startGymPushDispatcher(options: PushDispatcherOptions) {
  const config =
    options.config === undefined ? readVapidConfig() : options.config
  const sender = options.sender ?? createPushSender()
  const now = options.now ?? (() => new Date())

  let stopped = false

  const hasStopped = () => stopped

  let flight: Promise<PushDispatchSummary> | null = null

  const empty = (): PushDispatchSummary => ({
    configured: !!config,
    owners: 0,
    queued: 0,
    sent: 0,
    failed: 0,
    errors: 0
  })

  async function dispatch() {
    const summary = empty()

    if (hasStopped() || !config) return summary
    let budget = 100
    let owners: string[]

    try {
      owners = [...new Set(await options.listOwners(50))].slice(0, 50)
    } catch {
      options.onError?.('owner_enumeration_failed')
      summary.errors++

      return summary
    }

    for (const [ownerIndex, owner] of owners.entries()) {
      if (hasStopped()) break

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          owner
        )
      ) {
        summary.errors++
        continue
      }

      try {
        // The host cursor advances over the whole page. Reserve a fair share for
        // every remaining owner so a busy first account cannot starve the rest.
        const claimLimit = Math.min(
          10,
          Math.floor(budget / (owners.length - ownerIndex))
        )
        const claims = await withPushOwner(options.db, owner, async tx => {
          summary.queued += await enqueueNotifications(tx, owner, now())

          return claimDeliveries(tx, owner, now(), claimLimit)
        })
        summary.owners++
        budget -= claims.length
        for (let index = 0; index < claims.length && !hasStopped(); index += 4)
          await Promise.allSettled(
            claims.slice(index, index + 4).map(async claim => {
              if (
                !(await withPushOwner(options.db, owner, tx =>
                  deliveryCurrent(tx, owner, claim, now())
                ))
              )
                return
              let error: PushDeliveryError | undefined

              try {
                const ttl = Math.ceil(
                  (claim.delivery.expires_at.getTime() - now().getTime()) / 1000
                )

                if (ttl <= 0) throw new PushDeliveryError('delivery_expired')
                await sender(
                  claim.subscription,
                  claim.delivery.payload,
                  config,
                  ttl
                )
                summary.sent++
              } catch (failure) {
                error =
                  failure instanceof PushDeliveryError
                    ? failure
                    : new PushDeliveryError('send_failed', true)
                summary.failed++
              }
              await withPushOwner(options.db, owner, tx =>
                settleDelivery(tx, owner, claim, now(), error)
              )
            })
          ).then(results => {
            for (const result of results)
              if (result.status === 'rejected') {
                summary.errors++
                options.onError?.('delivery_settlement_failed')
              }
          })
      } catch {
        summary.errors++
        options.onError?.('owner_dispatch_failed')
      }
    }

    return summary
  }

  function tick(): Promise<PushDispatchSummary> {
    if (flight) return flight
    flight = dispatch().finally(() => {
      flight = null
    })

    return flight
  }

  const interval = config
    ? setInterval(
        () => {
          void tick()
        },
        Math.max(1000, options.intervalMs ?? 10000)
      )
    : null
  interval?.unref()
  if (config && options.runImmediately !== false) void tick()

  return {
    tick,
    async stop() {
      stopped = true
      if (interval) clearInterval(interval)
      if (flight) await flight
    }
  }
}
