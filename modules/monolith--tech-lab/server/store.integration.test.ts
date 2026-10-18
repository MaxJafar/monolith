import dotenv from 'dotenv'
import { and, defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

import {
  type Service,
  deviceSaveSchema,
  importDataSchema,
  serviceInputSchema,
  serviceSaveSchema,
  settingsSaveSchema
} from '../shared'
import {
  checks,
  devices,
  relations,
  services,
  settings,
  tables
} from './schema.drizzle'
import {
  type TechLabTransaction,
  appendCheck,
  deleteDevice,
  deleteService,
  getDueMonitorIds,
  getHistory,
  getSettings,
  getSnapshot,
  importInventory,
  ownedService,
  pruneChecks,
  runTechLabChecks,
  saveDevice,
  saveService,
  saveSettings
} from './store'

const enabled = process.env.ZILLION_INTEGRATION === '1'

if (enabled)
  dotenv.config({
    path: fileURLToPath(new URL('../../../env/.env.local', import.meta.url)),
    quiet: true
  })

const connection = process.env.DATABASE_URL ?? ''

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
      'Tech Lab integration tests require an isolated loopback database on port 55432'
    )
}

const client = postgres(
  enabled ? connection : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 5, prepare: false }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const owners = new Set<string>()
const owner = () => {
  const id = randomUUID()
  owners.add(id)

  return id
}

async function scoped<T>(
  id: string,
  work: (tx: TechLabTransaction) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${id},true)`)

    return work(tx)
  })
}

const createDevice = (id: string, name = 'Synthetic node') =>
  scoped(id, tx =>
    saveDevice(tx, id, deviceSaveSchema.parse({ name, host: '192.168.1.12' }))
  )
const createService = (id: string, extra: Record<string, unknown> = {}) =>
  scoped(id, tx =>
    saveService(
      tx,
      id,
      serviceSaveSchema.parse({
        name: 'Synthetic dashboard',
        monitor_kind: 'http',
        monitor_target: 'https://synthetic.example.test',
        monitor_enabled: true,
        ...extra
      })
    )
  )
const fakeProbe = async () => ({
  status: 'up' as const,
  latency_ms: 12,
  http_status: 200,
  message: 'Synthetic observation'
})
afterAll(async () => {
  if (enabled)
    for (const id of owners)
      await scoped(id, async tx => {
        await tx.delete(checks).where(eq(checks.owner_id, id))
        await tx.delete(services).where(eq(services.owner_id, id))
        await tx.delete(devices).where(eq(devices.owner_id, id))
        await tx.delete(settings).where(eq(settings.owner_id, id))
      })
  await client.end()
})

describe.skipIf(!enabled)(
  'Tech Lab owned PostgreSQL inventory and actual checks',
  () => {
    it('uses a non-bypass app role and all four tables force owner RLS', async () => {
      const result = await db.execute(
        sql`select rolname,rolsuper,rolbypassrls from pg_roles where rolname=current_user`
      )
      expect(result[0]).toMatchObject({ rolsuper: false, rolbypassrls: false })
      const catalog = await db.execute(
        sql`select relname,relrowsecurity,relforcerowsecurity from pg_class where relname in ('zillion_tech_lab__devices','zillion_tech_lab__services','zillion_tech_lab__checks','zillion_tech_lab__settings') order by relname`
      )
      expect(catalog).toHaveLength(4)
      for (const row of catalog)
        expect(row).toMatchObject({
          relrowsecurity: true,
          relforcerowsecurity: true
        })
    })
    it('isolates owners and rejects cross-owner hosted-device links', async () => {
      const a = owner(),
        b = owner(),
        device = await createDevice(a)
      const service = await createService(a, { device_id: device.id })
      expect((await scoped(b, tx => getSnapshot(tx, b))).devices).toEqual([])
      await expect(
        scoped(b, tx => ownedService(tx, b, service.id))
      ).rejects.toThrow('not found')
      await expect(createService(b, { device_id: device.id })).rejects.toThrow(
        'not found'
      )
      await expect(
        scoped(b, tx =>
          tx.insert(services).values({
            ...service,
            created: new Date(service.created),
            updated: new Date(service.updated),
            id: randomUUID(),
            owner_id: b,
            device_id: device.id
          })
        )
      ).rejects.toThrow()
      const leaked = await scoped(b, tx =>
        tx.select().from(devices).where(eq(devices.id, device.id))
      )
      expect(leaked).toEqual([])
    })
    it('rejects stale edits and advances only actual monitor configuration revisions', async () => {
      const a = owner(),
        original = await createService(a)
      const renamed = await scoped(a, tx =>
        saveService(
          tx,
          a,
          serviceSaveSchema.parse({
            ...serviceInputSchema.strip().parse(original),
            id: original.id,
            expected_updated: original.updated,
            name: 'Renamed'
          })
        )
      )
      expect(renamed.monitor_revision).toBe(1)
      expect(Date.parse(renamed.updated)).toBeGreaterThan(
        Date.parse(original.updated)
      )
      await expect(
        scoped(a, tx =>
          saveService(
            tx,
            a,
            serviceSaveSchema.parse({
              ...serviceSaveSchema.parse({ name: 'Stale' }),
              id: original.id,
              expected_updated: original.updated
            })
          )
        )
      ).rejects.toThrow('changed elsewhere')
      const changed = await scoped(a, tx =>
        saveService(
          tx,
          a,
          serviceSaveSchema.parse({
            name: renamed.name,
            id: renamed.id,
            expected_updated: renamed.updated,
            monitor_kind: 'http',
            monitor_target: 'https://other.example.test',
            monitor_enabled: true
          })
        )
      )
      expect(changed.monitor_revision).toBe(2)
    })
    it('allows only one concurrent save against the same observed timestamp', async () => {
      const a = owner(),
        device = await createDevice(a)
      const outcomes = await Promise.allSettled(
        ['One', 'Two'].map(name =>
          scoped(a, tx =>
            saveDevice(
              tx,
              a,
              deviceSaveSchema.parse({
                name,
                id: device.id,
                expected_updated: device.updated
              })
            )
          )
        )
      )
      expect(
        outcomes.filter(result => result.status === 'fulfilled')
      ).toHaveLength(1)
      expect(
        outcomes.filter(result => result.status === 'rejected')
      ).toHaveLength(1)
    })
    it('detaches device deletion without deleting hosted services or check history', async () => {
      const a = owner(),
        device = await createDevice(a),
        service = await createService(a, { device_id: device.id })
      await scoped(a, tx =>
        runTechLabChecks(tx, a, [service.id], { probe: fakeProbe })
      )
      await scoped(a, tx => deleteDevice(tx, a, device.id, device.updated))
      const snapshot = await scoped(a, tx => getSnapshot(tx, a))
      expect(snapshot.devices).toEqual([])
      expect(snapshot.services[0]).toMatchObject({
        id: service.id,
        device_id: null
      })
      expect(snapshot.services[0]!.updated).not.toBe(service.updated)
      expect(
        (await scoped(a, tx => getHistory(tx, a, service.id, 24))).checks
      ).toHaveLength(1)
    })
    it('retains immutable target observations when a service is deleted', async () => {
      const a = owner(),
        service = await createService(a)
      await scoped(a, tx =>
        runTechLabChecks(tx, a, [service.id], { probe: fakeProbe })
      )
      await scoped(a, tx => deleteService(tx, a, service.id, service.updated))
      const rows = await scoped(a, tx =>
        tx.select().from(checks).where(eq(checks.owner_id, a))
      )
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        service_id: null,
        original_service_id: service.id,
        service_name: service.name,
        monitor_target: service.monitor_target,
        monitor_revision: 1
      })
      expect((await scoped(a, tx => getSnapshot(tx, a))).services).toEqual([])
    })
    it('drops late probe results after a target changes or monitoring is disabled', async () => {
      const a = owner(),
        service = await createService(a)
      const next = await scoped(a, tx =>
        saveService(
          tx,
          a,
          serviceSaveSchema.parse({
            name: service.name,
            id: service.id,
            expected_updated: service.updated,
            monitor_kind: 'http',
            monitor_target: 'https://new.example.test',
            monitor_enabled: true
          })
        )
      )
      expect(
        await scoped(a, async tx =>
          appendCheck(tx, a, service, await fakeProbe())
        )
      ).toBeNull()
      await scoped(a, tx =>
        saveService(
          tx,
          a,
          serviceSaveSchema.parse({
            name: next.name,
            id: next.id,
            expected_updated: next.updated
          })
        )
      )
      expect(
        await scoped(a, async tx => appendCheck(tx, a, next, await fakeProbe()))
      ).toBeNull()
      expect(
        await scoped(a, tx =>
          tx.select().from(checks).where(eq(checks.owner_id, a))
        )
      ).toEqual([])
    })
    it('persists actual sample counts without mixing old revisions or inventing uptime', async () => {
      const a = owner(),
        service = await createService(a),
        now = new Date()

      for (const status of ['up', 'down', 'error'] as const)
        await scoped(a, tx =>
          appendCheck(
            tx,
            a,
            service,
            {
              status,
              latency_ms: status === 'error' ? null : 10,
              http_status: status === 'error' ? null : 200,
              message: 'Synthetic'
            },
            new Date(now.getTime() - 1000)
          )
        )

      const health = (await scoped(a, tx => getSnapshot(tx, a, now))).health[0]!
      expect(health.observed_24h).toMatchObject({
        up: 1,
        down: 1,
        error: 1,
        total: 3
      })
      expect(health.observed_24h.up_percent).toBeCloseTo(100 / 3)
      const changed = await scoped(a, tx =>
        saveService(
          tx,
          a,
          serviceSaveSchema.parse({
            name: service.name,
            id: service.id,
            expected_updated: service.updated,
            monitor_kind: 'http',
            monitor_target: 'https://other.example.test',
            monitor_enabled: true
          })
        )
      )
      const fresh = (await scoped(a, tx => getSnapshot(tx, a))).health[0]!
      expect(fresh).toMatchObject({
        status: 'unknown',
        latest: null,
        observed_24h: { total: 0, up_percent: null }
      })
      expect(
        (await scoped(a, tx => getHistory(tx, a, changed.id, 24))).checks
      ).toHaveLength(3)
    })
    it('bounds due batches at twelve and respects each actual check interval', async () => {
      const a = owner(),
        items: Service[] = []

      for (let index = 0; index < 13; index++)
        items.push(
          await createService(a, {
            name: `Service ${index}`,
            monitor_interval_seconds: 60
          })
        )
      expect(
        await scoped(a, tx => getDueMonitorIds(tx, a, { limit: 99 }))
      ).toHaveLength(12)
      const result = await scoped(a, tx =>
        runTechLabChecks(tx, a, undefined, { due_only: true, probe: fakeProbe })
      )
      expect(result.checks).toHaveLength(12)
      expect(await scoped(a, tx => getDueMonitorIds(tx, a))).toHaveLength(1)
      await expect(
        scoped(a, tx =>
          runTechLabChecks(tx, a, [randomUUID()], { probe: fakeProbe })
        )
      ).rejects.toThrow('not found')
    })
    it('limits concurrent probes to four while preserving all twelve results', async () => {
      const a = owner()

      for (let index = 0; index < 12; index++)
        await createService(a, { name: `Concurrency ${index}` })
      let active = 0,
        maximum = 0

      const result = await scoped(a, tx =>
        runTechLabChecks(tx, a, undefined, {
          probe: async () => {
            active++
            maximum = Math.max(maximum, active)
            await Promise.resolve()
            active--

            return fakeProbe()
          }
        })
      )
      expect(maximum).toBe(4)
      expect(active).toBe(0)
      expect(result.checks).toHaveLength(12)
      expect(new Set(result.checks.map(check => check.service_id)).size).toBe(
        12
      )
    })
    it('merges source keys once, remaps imported devices and disables all imported monitors', async () => {
      const a = owner(),
        foreign = owner(),
        foreignDevice = await createDevice(foreign),
        input = importDataSchema.parse({
          devices: [{ name: 'Imported host', source_key: 'fixture:host' }],
          services: [
            {
              name: 'Imported web',
              source_key: 'fixture:web',
              device_source_key: 'fixture:host',
              monitor_kind: 'http',
              monitor_target: 'https://example.test',
              monitor_enabled: true
            },
            {
              name: 'Foreign association',
              source_key: 'fixture:foreign',
              device_id: foreignDevice.id
            }
          ]
        })
      const first = await scoped(a, tx => importInventory(tx, a, input))
      expect(first.created).toEqual({ devices: 1, services: 2 })
      const second = await scoped(a, tx => importInventory(tx, a, input))
      expect(second.skipped).toEqual({ devices: 1, services: 2 })
      const snapshot = await scoped(a, tx => getSnapshot(tx, a))
      const linked = snapshot.services.find(
        service => service.source_key === 'fixture:web'
      )!
      expect(linked.device_id).toBe(snapshot.devices[0]!.id)
      expect(snapshot.services.every(service => !service.monitor_enabled)).toBe(
        true
      )
      expect(
        snapshot.services.find(
          service => service.source_key === 'fixture:foreign'
        )!.device_id
      ).toBeNull()
    })
    it('rolls back an entire inventory operation when its transaction fails', async () => {
      const a = owner()
      await expect(
        scoped(a, async tx => {
          await importInventory(
            tx,
            a,
            importDataSchema.parse({
              devices: [{ name: 'Rolled back' }],
              services: [{ name: 'Rolled back service' }]
            })
          )
          throw new Error('Synthetic transaction rejection')
        })
      ).rejects.toThrow('Synthetic transaction rejection')
      expect((await scoped(a, tx => getSnapshot(tx, a))).devices).toEqual([])
      expect((await scoped(a, tx => getSnapshot(tx, a))).services).toEqual([])
    })
    it('guards settings changes and prunes only the current owner retained observations', async () => {
      const a = owner(),
        b = owner(),
        service = await createService(a),
        other = await createService(b),
        now = new Date(),
        old = new Date(now.getTime() - 8 * 86400000)
      await scoped(a, tx =>
        appendCheck(
          tx,
          a,
          service,
          { status: 'up', latency_ms: 10, http_status: 200, message: 'Old' },
          old
        )
      )
      await scoped(b, tx =>
        appendCheck(
          tx,
          b,
          other,
          { status: 'up', latency_ms: 10, http_status: 200, message: 'Other' },
          old
        )
      )
      const config = await scoped(a, tx => getSettings(tx, a))
      const changed = await scoped(a, tx =>
        saveSettings(
          tx,
          a,
          settingsSaveSchema.parse({
            expected_updated: config.updated,
            history_retention_days: 7
          })
        )
      )
      await expect(
        scoped(a, tx =>
          saveSettings(
            tx,
            a,
            settingsSaveSchema.parse({ expected_updated: config.updated })
          )
        )
      ).rejects.toThrow('changed elsewhere')
      await scoped(a, tx => pruneChecks(tx, a, now))
      expect(
        await scoped(a, tx =>
          tx.select().from(checks).where(eq(checks.owner_id, a))
        )
      ).toEqual([])
      expect(
        await scoped(b, tx =>
          tx
            .select()
            .from(checks)
            .where(and(eq(checks.owner_id, b), eq(checks.service_id, other.id)))
        )
      ).toHaveLength(1)
      expect(changed.history_retention_days).toBe(7)
    })
  }
)
