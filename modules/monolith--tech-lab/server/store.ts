import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createHash, randomUUID } from 'node:crypto'

import type { BuiltModuleSchema } from '@monolith/drizzle'
import { ClientError } from '@monolith/server-utils'

import {
  type Check,
  type Device,
  type ProbeResult,
  type Service,
  type TechLabImportData,
  type TechLabImportSummary,
  type TechLabSnapshot,
  checkSchema,
  deviceInputSchema,
  deviceSaveSchema,
  deviceSchema,
  importDataSchema,
  probeResultSchema,
  serviceInputSchema,
  serviceSaveSchema,
  serviceSchema,
  settingsInputSchema,
  settingsSaveSchema
} from '../shared'
import {
  checkUpdated,
  monitorChanged,
  nextUpdated,
  observedHealth,
  validateMonitor
} from './model'
import { probeService } from './monitor'
import * as schema from './schema.drizzle'
import { checks, devices, services, settings } from './schema.drizzle'
import { shapeTimeline } from './timeline'

export { ownerId } from './model'

export type TechLabDatabase = PostgresJsDatabase<
  BuiltModuleSchema<typeof schema>
>

export type TechLabStore = Pick<
  TechLabDatabase,
  'select' | 'insert' | 'update' | 'delete' | 'execute' | 'selectDistinctOn'
>

export type TechLabTransaction = Parameters<
  Parameters<TechLabDatabase['transaction']>[0]
>[0]

export async function lockOwner(db: TechLabStore, owner: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`tech-lab:${owner}`},0))`
  )
}

const deviceDto = (row: typeof devices.$inferSelect): Device =>
  deviceSchema.strip().parse({
    ...row,
    created: row.created.toISOString(),
    updated: row.updated.toISOString()
  })
const serviceDto = (row: typeof services.$inferSelect): Service =>
  serviceSchema.strip().parse({
    ...row,
    created: row.created.toISOString(),
    updated: row.updated.toISOString()
  })
const checkDto = (row: typeof checks.$inferSelect): Check =>
  checkSchema.strip().parse({
    ...row,
    details: row.details ?? undefined,
    checked_at: row.checked_at.toISOString()
  })

export async function ownedDevice(db: TechLabStore, owner: string, id: string) {
  const [row] = await db
    .select()
    .from(devices)
    .where(and(eq(devices.owner_id, owner), eq(devices.id, id)))
    .limit(1)

  if (!row) throw new ClientError('Device not found', 404)

  return row
}

export async function ownedService(
  db: TechLabStore,
  owner: string,
  id: string
) {
  const [row] = await db
    .select()
    .from(services)
    .where(and(eq(services.owner_id, owner), eq(services.id, id)))
    .limit(1)

  if (!row) throw new ClientError('Service not found', 404)

  return row
}

export async function getSettings(db: TechLabStore, owner: string) {
  await db
    .insert(settings)
    .values({ owner_id: owner, values: settingsInputSchema.parse({}) })
    .onConflictDoNothing()
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.owner_id, owner))
    .limit(1)

  if (!row) throw new ClientError('Settings unavailable', 500)

  return {
    ...settingsInputSchema.parse(row.values),
    updated: row.updated.toISOString()
  }
}

export async function saveSettings(
  db: TechLabStore,
  owner: string,
  input: ReturnType<typeof settingsSaveSchema.parse>
) {
  await lockOwner(db, owner)
  const existing = await getSettings(db, owner)
  checkUpdated(new Date(existing.updated), input.expected_updated)
  const updated = nextUpdated(new Date(existing.updated))
  const values = settingsInputSchema.parse(stripControls(input))
  await db
    .update(settings)
    .set({ values, updated })
    .where(eq(settings.owner_id, owner))

  return { ...values, updated: updated.toISOString() }
}

export async function saveDevice(
  db: TechLabStore,
  owner: string,
  input: ReturnType<typeof deviceSaveSchema.parse>
) {
  await lockOwner(db, owner)
  const data = deviceInputSchema.parse(stripControls(input))
  const existing = input.id ? await ownedDevice(db, owner, input.id) : null

  if (existing) checkUpdated(existing.updated, input.expected_updated)
  await assertSourceKey(db, owner, 'device', data.source_key, existing?.id)
  const updated = nextUpdated(existing?.updated)

  if (existing) {
    const [row] = await db
      .update(devices)
      .set({ ...data, updated })
      .where(and(eq(devices.owner_id, owner), eq(devices.id, existing.id)))
      .returning()

    return deviceDto(row!)
  }

  const [row] = await db
    .insert(devices)
    .values({ ...data, owner_id: owner, created: updated, updated })
    .returning()

  return deviceDto(row!)
}

export async function saveService(
  db: TechLabStore,
  owner: string,
  input: ReturnType<typeof serviceSaveSchema.parse>
) {
  await lockOwner(db, owner)
  const data = serviceInputSchema.parse(stripControls(input))
  validateMonitor(data)
  if (data.device_id) await ownedDevice(db, owner, data.device_id)

  const existing = input.id ? await ownedService(db, owner, input.id) : null

  if (existing) checkUpdated(existing.updated, input.expected_updated)
  await assertSourceKey(db, owner, 'service', data.source_key, existing?.id)
  const updated = nextUpdated(existing?.updated)

  if (existing) {
    const monitor_revision =
      existing.monitor_revision +
      (monitorChanged(serviceInputSchema.strip().parse(existing), data) ? 1 : 0)
    const [row] = await db
      .update(services)
      .set({ ...data, updated, monitor_revision })
      .where(and(eq(services.owner_id, owner), eq(services.id, existing.id)))
      .returning()

    return serviceDto(row!)
  }

  const [row] = await db
    .insert(services)
    .values({ ...data, owner_id: owner, created: updated, updated })
    .returning()

  return serviceDto(row!)
}

function stripControls<T extends { id?: string; expected_updated?: string }>(
  input: T
) {
  const { id: _id, expected_updated: _expected, ...data } = input

  return data
}

async function assertSourceKey(
  db: TechLabStore,
  owner: string,
  kind: 'device' | 'service',
  key: string | null,
  id?: string
) {
  if (!key) return

  const table = kind === 'device' ? devices : services
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.owner_id, owner), eq(table.source_key, key)))
    .limit(1)

  if (existing && existing.id !== id)
    throw new ClientError(
      'This import source is already linked to another item',
      409
    )
}

export async function deleteDevice(
  db: TechLabStore,
  owner: string,
  id: string,
  expected: string
) {
  await lockOwner(db, owner)
  const row = await ownedDevice(db, owner, id)
  checkUpdated(row.updated, expected)
  const linked = await db
    .select()
    .from(services)
    .where(and(eq(services.owner_id, owner), eq(services.device_id, id)))

  for (const item of linked)
    await db
      .update(services)
      .set({ device_id: null, updated: nextUpdated(item.updated) })
      .where(and(eq(services.owner_id, owner), eq(services.id, item.id)))
  await db
    .delete(devices)
    .where(and(eq(devices.owner_id, owner), eq(devices.id, id)))
}

export async function deleteService(
  db: TechLabStore,
  owner: string,
  id: string,
  expected: string
) {
  await lockOwner(db, owner)
  const row = await ownedService(db, owner, id)
  checkUpdated(row.updated, expected)
  await db
    .update(checks)
    .set({ service_id: null })
    .where(and(eq(checks.owner_id, owner), eq(checks.service_id, id)))
  await db
    .delete(services)
    .where(and(eq(services.owner_id, owner), eq(services.id, id)))
}

async function latestChecks(db: TechLabStore, owner: string) {
  return db
    .selectDistinctOn([checks.service_id], { check: checks })
    .from(checks)
    .innerJoin(
      services,
      and(
        eq(services.owner_id, owner),
        eq(services.id, checks.service_id),
        eq(services.monitor_revision, checks.monitor_revision)
      )
    )
    .where(eq(checks.owner_id, owner))
    .orderBy(checks.service_id, desc(checks.checked_at), desc(checks.id))
}

export async function getSnapshot(
  db: TechLabStore,
  owner: string,
  now = new Date()
): Promise<TechLabSnapshot> {
  const [deviceRows, serviceRows, config, latest, samples] = await Promise.all([
    db
      .select()
      .from(devices)
      .where(eq(devices.owner_id, owner))
      .orderBy(asc(devices.name), asc(devices.id)),
    db
      .select()
      .from(services)
      .where(eq(services.owner_id, owner))
      .orderBy(asc(services.category), asc(services.name), asc(services.id)),
    getSettings(db, owner),
    latestChecks(db, owner),
    db
      .select({
        service_id: checks.service_id,
        status: checks.status,
        count: sql<number>`count(*)::int`
      })
      .from(checks)
      .innerJoin(
        services,
        and(
          eq(services.owner_id, owner),
          eq(services.id, checks.service_id),
          eq(services.monitor_revision, checks.monitor_revision)
        )
      )
      .where(
        and(
          eq(checks.owner_id, owner),
          gte(checks.checked_at, new Date(now.getTime() - 86400000)),
          lt(checks.checked_at, new Date(now.getTime() + 1))
        )
      )
      .groupBy(checks.service_id, checks.status)
  ])
  const ownedServices = serviceRows.map(serviceDto)
  const latestById = new Map(
    latest.map(({ check }) => [check.service_id, checkDto(check)])
  )
  const sampleCounts = new Map<
    string,
    {
      up: number
      down: number
      error: number
      total: number
      up_percent: number | null
    }
  >()

  for (const sample of samples) {
    if (!sample.service_id) continue

    const count = sampleCounts.get(sample.service_id) ?? {
      up: 0,
      down: 0,
      error: 0,
      total: 0,
      up_percent: null
    }
    count[sample.status] += sample.count
    count.total += sample.count
    sampleCounts.set(sample.service_id, count)
  }

  const health = ownedServices.map(service => {
    const check = latestById.get(service.id)
    const result = observedHealth(
      service,
      check ? [check] : [],
      config.stale_after_multiplier,
      now
    )
    const counts = sampleCounts.get(service.id)

    if (counts)
      result.observed_24h = {
        ...counts,
        up_percent: counts.total ? (counts.up / counts.total) * 100 : null
      }

    return result
  })

  return {
    devices: deviceRows.map(deviceDto),
    services: ownedServices,
    settings: config,
    health,
    checked_at: now.toISOString()
  }
}

/** Bucketed check counts for every monitored service, for 24-hour strips. */
export async function getTimeline(
  db: TechLabStore,
  owner: string,
  input: { hours: number; buckets: number },
  now = new Date()
) {
  const from = new Date(now.getTime() - input.hours * 3600000)
  const width = (input.hours * 3600) / input.buckets
  const bucket = sql<number>`floor(extract(epoch from (${checks.checked_at} - ${from.toISOString()}::timestamptz)) / ${width})::int`
  const [serviceRows, rows] = await Promise.all([
    db
      .select({ id: services.id })
      .from(services)
      .where(
        and(eq(services.owner_id, owner), eq(services.monitor_enabled, true))
      )
      .orderBy(asc(services.category), asc(services.name), asc(services.id)),
    db
      .select({
        service_id: checks.service_id,
        bucket,
        up: sql<number>`(count(*) filter (where ${checks.status} = 'up'))::int`,
        down: sql<number>`(count(*) filter (where ${checks.status} = 'down'))::int`,
        error: sql<number>`(count(*) filter (where ${checks.status} = 'error'))::int`,
        latency_ms: sql<
          number | null
        >`(avg(${checks.latency_ms}) filter (where ${checks.status} = 'up'))::float8`
      })
      .from(checks)
      .innerJoin(
        services,
        and(
          eq(services.owner_id, owner),
          eq(services.id, checks.service_id),
          eq(services.monitor_revision, checks.monitor_revision)
        )
      )
      .where(
        and(
          eq(checks.owner_id, owner),
          gte(checks.checked_at, from),
          lt(checks.checked_at, new Date(now.getTime() + 1))
        )
      )
      .groupBy(checks.service_id, bucket)
  ])

  return shapeTimeline(
    rows,
    serviceRows.map(row => row.id),
    { from, to: now, buckets: input.buckets }
  )
}

export async function getHistory(
  db: TechLabStore,
  owner: string,
  id: string,
  hours: number,
  now = new Date()
) {
  const service = await ownedService(db, owner, id)
  const rows = await db
    .select()
    .from(checks)
    .where(
      and(
        eq(checks.owner_id, owner),
        eq(checks.original_service_id, id),
        gte(checks.checked_at, new Date(now.getTime() - hours * 3600000))
      )
    )
    .orderBy(desc(checks.checked_at), desc(checks.id))
    .limit(2001)

  return {
    checks: rows.slice(0, 2000).map(checkDto),
    truncated: rows.length > 2000,
    hours,
    service: serviceDto(service)
  }
}

export async function getDueMonitorIds(
  db: TechLabStore,
  owner: string,
  options: { limit?: number; now?: Date } = {}
) {
  const now = options.now ?? new Date()
  const rows = await db
    .select()
    .from(services)
    .where(
      and(eq(services.owner_id, owner), eq(services.monitor_enabled, true))
    )
  const latest = new Map(
    (await latestChecks(db, owner)).map(({ check }) => [
      check.service_id,
      check.checked_at
    ])
  )

  return rows
    .filter(
      row =>
        row.monitor_kind !== 'none' &&
        (!latest.has(row.id) ||
          now.getTime() - latest.get(row.id)!.getTime() >=
            row.monitor_interval_seconds * 1000)
    )
    .sort(
      (a, b) =>
        (latest.get(a.id)?.getTime() ?? 0) -
          (latest.get(b.id)?.getTime() ?? 0) || a.id.localeCompare(b.id)
    )
    .slice(0, Math.min(12, Math.max(1, options.limit ?? 12)))
    .map(row => row.id)
}

export async function appendCheck(
  db: TechLabStore,
  owner: string,
  snapshot: Service,
  result: ProbeResult,
  at = new Date()
): Promise<Check | null> {
  await lockOwner(db, owner)
  const [current] = await db
    .select()
    .from(services)
    .where(and(eq(services.owner_id, owner), eq(services.id, snapshot.id)))
    .limit(1)

  if (
    !current ||
    !current.monitor_enabled ||
    current.monitor_revision !== snapshot.monitor_revision
  )
    return null

  const valid = probeResultSchema.parse(result)
  const [row] = await db
    .insert(checks)
    .values({
      ...valid,
      details: valid.details ?? null,
      owner_id: owner,
      service_id: current.id,
      original_service_id: current.id,
      service_name: snapshot.name,
      monitor_kind: snapshot.monitor_kind,
      monitor_target: snapshot.monitor_target,
      monitor_port: snapshot.monitor_port,
      monitor_revision: snapshot.monitor_revision,
      checked_at: at
    })
    .returning()

  return checkDto(row!)
}

export async function runTechLabChecks(
  db: TechLabStore,
  owner: string,
  ids?: string[],
  options: {
    due_only?: boolean
    probe?: (service: Service) => Promise<ProbeResult>
  } = {}
) {
  const selected = ids ?? (await getDueMonitorIds(db, owner))

  if (selected.length > 12)
    throw new ClientError('Check at most 12 services at once')

  const due = options.due_only
    ? new Set(await getDueMonitorIds(db, owner))
    : null
  const rows = selected.length
    ? await db
        .select()
        .from(services)
        .where(
          and(eq(services.owner_id, owner), inArray(services.id, selected))
        )
    : []

  if (ids && rows.length !== new Set(ids).size)
    throw new ClientError('Service not found', 404)

  const selectedRows = rows
    .filter(
      row =>
        row.monitor_enabled &&
        row.monitor_kind !== 'none' &&
        (!due || due.has(row.id))
    )
    .map(serviceDto)
  const output: Check[] = []

  let skipped = rows.length - selectedRows.length

  const results: Array<{ service: Service; result: ProbeResult }> = []

  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(4, selectedRows.length) }, async () => {
      while (next < selectedRows.length) {
        const snapshot = selectedRows[next++]!
        const result = await (options.probe ?? probeService)(snapshot)
        results.push({ service: snapshot, result })
      }
    })
  )

  for (const { service: snapshot, result } of results) {
    const check = await appendCheck(db, owner, snapshot, result)

    if (check) output.push(check)
    else skipped++
  }

  return { checks: output, skipped }
}

export async function pruneChecks(
  db: TechLabStore,
  owner: string,
  now = new Date()
) {
  const config = await getSettings(db, owner)
  await db
    .delete(checks)
    .where(
      and(
        eq(checks.owner_id, owner),
        lt(
          checks.checked_at,
          new Date(now.getTime() - config.history_retention_days * 86400000)
        )
      )
    )
}

export async function importInventory(
  db: TechLabStore,
  owner: string,
  raw: TechLabImportData
): Promise<TechLabImportSummary> {
  const input = importDataSchema.parse(raw)
  await lockOwner(db, owner)
  const summary: TechLabImportSummary = {
    created: { devices: 0, services: 0 },
    skipped: { devices: 0, services: 0 },
    warnings: []
  }
  const existingDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.owner_id, owner))
  const deviceKeys = new Map(
    existingDevices
      .filter(row => row.source_key)
      .map(row => [row.source_key!, row.id])
  )
  const deviceIds = new Map<string, string>()

  for (const item of input.devices) {
    const key =
      item.source_key ??
      (item.id
        ? `native-device:${item.id}`
        : `import-device:${createHash('sha256').update(JSON.stringify(item)).digest('hex')}`)

    let id = deviceKeys.get(key)

    if (id) summary.skipped.devices++
    else {
      id = randomUUID()
      const { id: _sourceId, ...data } = item
      await db
        .insert(devices)
        .values({ ...data, id, owner_id: owner, source_key: key })
      if (key) deviceKeys.set(key, id)
      summary.created.devices++
    }
    if (item.id) deviceIds.set(item.id, id)
  }

  const existingServices = await db
    .select()
    .from(services)
    .where(eq(services.owner_id, owner))
  const serviceKeys = new Set(
    existingServices.filter(row => row.source_key).map(row => row.source_key!)
  )

  let detached = 0

  for (const item of input.services) {
    const source_key =
      item.source_key ??
      `import-service:${createHash('sha256')
        .update(JSON.stringify({ ...item, monitor_enabled: false }))
        .digest('hex')}`

    if (serviceKeys.has(source_key)) {
      summary.skipped.services++
      continue
    }

    const { device_source_key, ...data } = item
    const linked = device_source_key
      ? deviceKeys.get(device_source_key)
      : data.device_id
        ? (deviceIds.get(data.device_id) ??
          existingDevices.find(row => row.id === data.device_id)?.id)
        : undefined

    if ((device_source_key || data.device_id) && !linked) detached++
    await db.insert(services).values({
      ...data,
      source_key,
      device_id: linked ?? null,
      monitor_enabled: false,
      id: randomUUID(),
      owner_id: owner
    })
    serviceKeys.add(source_key)
    summary.created.services++
  }
  if (detached)
    summary.warnings.push(
      `${detached} service device links could not be resolved and were left unassigned.`
    )
  summary.warnings.push(
    'Imported monitors are disabled. Review each target before enabling monitoring.'
  )

  return summary
}
