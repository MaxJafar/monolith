import { and, eq, sql } from 'drizzle-orm'

import { services } from './schema.drizzle'
import {
  type TechLabDatabase,
  getDueMonitorIds,
  pruneChecks,
  runTechLabChecks
} from './store'

type Collector = {
  db: TechLabDatabase
  owner: string
  timer: ReturnType<typeof setTimeout> | null
  running: boolean
}

const collectors = new Map<string, Collector>()
const intervalMs = 30000
const maxCollectors = 128

let active = 0

function schedule(collector: Collector, delay: number) {
  collector.timer = setTimeout(() => void collect(collector), delay)
  collector.timer.unref()
}

async function collect(collector: Collector) {
  collector.timer = null
  if (collector.running || collectors.get(collector.owner) !== collector) return

  if (active >= 4) {
    schedule(collector, 1000)

    return
  }
  collector.running = true
  active++

  try {
    // A request transaction expires after its response; each timer uses a fresh owner context.
    await collector.db.transaction(async transaction => {
      await transaction.execute(
        sql`select set_config('zillion.user_id', ${collector.owner}, true)`
      )
      const enabled = await transaction
        .select({ id: services.id })
        .from(services)
        .where(
          and(
            eq(services.owner_id, collector.owner),
            eq(services.monitor_enabled, true)
          )
        )
        .limit(1)

      if (!enabled.length) {
        collectors.delete(collector.owner)

        return
      }

      const due = await getDueMonitorIds(transaction, collector.owner)

      if (due.length)
        await runTechLabChecks(transaction, collector.owner, due, {
          due_only: true
        })
      await pruneChecks(transaction, collector.owner)
    })
  } catch {
    // A database failure must not be stored as a service outage. The next tick retries.
  } finally {
    collector.running = false
    active--
    if (collectors.get(collector.owner) === collector)
      schedule(collector, intervalMs)
  }
}

/** Starts after an authenticated module visit or monitor save; survives page closure. */
export function registerTechLabCollector(
  db: TechLabDatabase,
  owner: string
): void {
  if (collectors.has(owner) || collectors.size >= maxCollectors) return

  const collector: Collector = { db, owner, running: false, timer: null }
  collectors.set(owner, collector)
  // Start after the current request commits a newly configured monitor.
  schedule(collector, 1000)
}

export function stopTechLabCollectors(): void {
  for (const collector of collectors.values()) {
    if (collector.timer) clearTimeout(collector.timer)
  }
  collectors.clear()
}

/** The host supplies an ordinary user page; each inventory query still runs under owner RLS. */
export function startTechLabDispatcher(options: {
  db: TechLabDatabase
  listOwners: (limit: number) => Promise<string[]>
  onError?: (code: string) => void
}) {
  let stopped = false
  let flight: Promise<void> | null = null

  async function discover() {
    try {
      const owners = [...new Set(await options.listOwners(64))].slice(0, 64)

      if (!stopped)
        for (const owner of owners) registerTechLabCollector(options.db, owner)
    } catch {
      options.onError?.('tech_lab_owner_discovery_failed')
    }
  }

  function tick() {
    if (stopped) return Promise.resolve()
    flight ??= discover().finally(() => {
      flight = null
    })

    return flight
  }

  const timer = setInterval(() => void tick(), intervalMs)
  timer.unref()
  void tick()

  return {
    tick,
    stop() {
      stopped = true
      clearInterval(timer)
      stopTechLabCollectors()
    }
  }
}
