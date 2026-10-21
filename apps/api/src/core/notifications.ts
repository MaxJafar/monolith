// SPDX-License-Identifier: 0BSD
import { asc, gt } from 'drizzle-orm'

import { ModuleRegistry } from '@monolith/module-runtime/registry'

import { users } from '../lib/user/schema.drizzle'
import { db } from './drizzle'
import { createServiceLogger } from './functions/logging'

function ownerPages() {
  let after: string | undefined
  return async (limit: number): Promise<string[]> => {
    const page = (cursor?: string) =>
      db
        .select({ id: users.id })
        .from(users)
        .where(cursor ? gt(users.id, cursor) : undefined)
        .orderBy(asc(users.id))
        .limit(limit)
    let rows = await page(after)
    if (!rows.length && after) rows = await page()
    after = rows.at(-1)?.id
    return rows.map(row => row.id)
  }
}

export async function startNotifications(): Promise<() => Promise<void>> {
  const stoppers: (() => unknown)[] = []
  const { startCalendarDispatcher } =
    await import('../../../../modules/monolith--databases/server/calendarDelivery')
  const calendar = startCalendarDispatcher({
    db: db as unknown as import('../../../../modules/monolith--databases/server/store').Database,
    listOwners: ownerPages(),
    onError: message =>
      createServiceLogger('Calendar notifications').warn(message)
  })
  stoppers.push(() => calendar.stop())
  if (ModuleRegistry.isAvailable('monolith--tech-lab')) {
    const { startTechLabDispatcher } =
      await import('../../../../modules/monolith--tech-lab/server/collectors')
    const monitor = startTechLabDispatcher({
      db: db as unknown as import('../../../../modules/monolith--tech-lab/server/store').TechLabDatabase,
      listOwners: ownerPages(),
      onError: code => createServiceLogger('Tech Lab monitoring').warn(code)
    })
    stoppers.push(() => monitor.stop())
  }
  if (ModuleRegistry.isAvailable('monolith--gym')) {
    const { startGymPushDispatcher } =
      await import('../../../../modules/monolith--gym/server/push')
    const push = startGymPushDispatcher({
      db: db as unknown as import('../../../../modules/monolith--gym/server/store').GymDatabase,
      listOwners: ownerPages(),
      onError: code => createServiceLogger('Gym notifications').warn(code)
    })
    stoppers.push(() => push.stop())
  }
  let stopping: Promise<void> | undefined
  return () =>
    (stopping ??= Promise.all(
      stoppers.map(stop => Promise.resolve().then(stop))
    ).then(() => {}))
}
