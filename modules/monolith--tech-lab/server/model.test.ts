import { describe, expect, it } from 'vitest'

import {
  type Check,
  deviceInputSchema,
  httpUrlSchema,
  importDataSchema,
  serviceInputSchema,
  serviceSchema
} from '../shared'
import {
  checkUpdated,
  monitorChanged,
  nextUpdated,
  observedHealth,
  ownerId,
  validateMonitor
} from './model'

const now = new Date('2026-10-13T12:00:00.000Z')
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const service = serviceSchema.parse({
  name: 'Home server',
  id,
  created: now.toISOString(),
  updated: now.toISOString(),
  monitor_kind: 'http',
  monitor_target: 'https://dashboard.example.test',
  monitor_enabled: true,
  monitor_interval_seconds: 60,
  monitor_revision: 1
})
const check = (status: Check['status'], offset = 0, revision = 1): Check => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  service_id: id,
  original_service_id: id,
  service_name: service.name,
  monitor_kind: 'http',
  monitor_target: service.monitor_target,
  monitor_port: null,
  monitor_revision: revision,
  status,
  latency_ms: status === 'error' ? null : 14,
  http_status: status === 'error' ? null : 200,
  message: 'Synthetic observation',
  checked_at: new Date(now.getTime() + offset).toISOString()
})

describe('Tech Lab input and actual observed health', () => {
  it('defaults to disabled monitors and retains private HTTP launchers', () => {
    expect(
      serviceInputSchema.parse({ name: 'NAS', url: 'http://192.168.1.12:8080' })
        .monitor_enabled
    ).toBe(false)
    expect(deviceInputSchema.parse({ name: 'NAS', ram_gb: 0 }).ram_gb).toBe(0)
    expect(httpUrlSchema.safeParse('smb://host/share').success).toBe(false)
    expect(
      httpUrlSchema.safeParse('https://user:password@example.test').success
    ).toBe(false)
    for (const key of [
      'token',
      'password',
      'api_key',
      'Authorization',
      'refresh_token',
      'auth',
      'key',
      'passwd'
    ])
      expect(
        httpUrlSchema.safeParse(`https://host.test/?${key}=sensitive`).success
      ).toBe(false)
    expect(httpUrlSchema.safeParse('https://host.test/?view=all').success).toBe(
      true
    )
    expect(
      importDataSchema.safeParse({
        devices: [],
        services: [
          {
            name: 'Unsafe import',
            monitor_target: 'https://host.test/?auth=sensitive',
            monitor_enabled: false
          }
        ]
      }).success
    ).toBe(false)
    expect(
      serviceInputSchema.safeParse({
        name: 'Unsafe target',
        monitor_target: 'user:password@host.test'
      }).success
    ).toBe(false)
  })
  it('requires usable explicit target and ports before enabling a monitor', () => {
    for (const changes of [
      { monitor_kind: 'none' },
      { monitor_target: '' },
      { monitor_target: 'https://user:pass@host.test' },
      {
        monitor_kind: 'tcp',
        monitor_target: 'host.test/path',
        monitor_port: 3000
      },
      {
        monitor_kind: 'minecraft',
        monitor_target: 'host.test',
        monitor_port: null
      }
    ] as const)
      expect(() => validateMonitor({ ...service, ...changes })).toThrow()
    expect(() =>
      validateMonitor({
        ...service,
        monitor_kind: 'minecraft',
        monitor_target: '192.168.1.12',
        monitor_port: 25565
      })
    ).not.toThrow()
    expect(() =>
      validateMonitor(
        serviceInputSchema.parse({ name: 'Draft', monitor_kind: 'tcp' })
      )
    ).not.toThrow()
  })
  it('rejects unsafe interval, RAM, and ports without normalizing bad data', () => {
    expect(
      serviceInputSchema.safeParse({
        name: 'bad',
        monitor_interval_seconds: 59
      }).success
    ).toBe(false)
    expect(
      serviceInputSchema.safeParse({ name: 'bad', monitor_port: 65536 }).success
    ).toBe(false)
    expect(
      deviceInputSchema.safeParse({ name: 'bad', ram_gb: -1 }).success
    ).toBe(false)
  })
  it('authenticates UUID ownership and rejects missing or forged locals', () => {
    expect(ownerId({ locals: { userId: id } })).toBe(id)
    expect(() => ownerId({ locals: {} })).toThrow('Authentication required')
    expect(() => ownerId({ locals: { userId: 'someone' } })).toThrow(
      'Authentication required'
    )
  })
  it('compares instants for stale edits and advances timestamps monotonically', () => {
    expect(() => checkUpdated(now, '2026-10-13T08:00:00-04:00')).not.toThrow()
    expect(() => checkUpdated(now)).toThrow('changed elsewhere')
    expect(() => checkUpdated(now, '2026-10-13T11:59:59Z')).toThrow(
      'changed elsewhere'
    )
    expect(nextUpdated(now, new Date(now.getTime() - 2000)).getTime()).toBe(
      now.getTime() + 1
    )
  })
  it('changes monitor revisions only when configuration changes', () => {
    expect(
      monitorChanged(service, { ...service, name: 'Renamed', notes: 'Details' })
    ).toBe(false)
    for (const changes of [
      { monitor_target: 'https://another.test' },
      { monitor_enabled: false },
      { monitor_interval_seconds: 120 },
      { monitor_port: 80 },
      { monitor_kind: 'tcp' as const }
    ])
      expect(monitorChanged(service, { ...service, ...changes })).toBe(true)
  })
  it('keeps zero-sample unknown separate from disabled, with no invented uptime', () => {
    expect(observedHealth(service, [], 3, now)).toMatchObject({
      status: 'unknown',
      latest: null,
      observed_24h: { total: 0, up_percent: null }
    })
    expect(
      observedHealth({ ...service, monitor_enabled: false }, [], 3, now)
    ).toMatchObject({ status: 'disabled', next_check_at: null })
  })
  it('counts errors explicitly in the observed sample denominator', () => {
    const result = observedHealth(
      service,
      [check('up'), check('down', -1000), check('error', -2000)],
      3,
      now
    )
    expect(result).toMatchObject({
      status: 'up',
      observed_24h: { up: 1, down: 1, error: 1, total: 3 }
    })
    expect(result.observed_24h.up_percent).toBeCloseTo(100 / 3)
  })
  it('excludes previous target configurations, future checks and samples older than a day', () => {
    const result = observedHealth(
      service,
      [
        check('down', 0, 2),
        check('up', 1000),
        check('down', -86400001),
        check('error', -500)
      ],
      3,
      now
    )
    expect(result.latest?.status).toBe('error')
    expect(result.observed_24h).toEqual({
      up: 0,
      down: 0,
      error: 1,
      total: 1,
      up_percent: 0
    })
  })
  it('keeps stale successful observations visible with their actual timestamps', () => {
    const item = check('up', -181000)
    expect(observedHealth(service, [item], 3, now)).toMatchObject({
      status: 'stale',
      latest: item,
      next_check_at: new Date(now.getTime() - 121000).toISOString()
    })
    expect(
      observedHealth(service, [check('down', -180000)], 3, now).status
    ).toBe('down')
  })
  it('never blends observations from another service', () => {
    const other = {
      ...check('up'),
      original_service_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    }
    expect(observedHealth(service, [other], 3, now).observed_24h.total).toBe(0)
  })
  it('resolves current error, down, and up distinctly', () => {
    for (const status of ['error', 'down', 'up'] as const)
      expect(observedHealth(service, [check(status)], 3, now).status).toBe(
        status
      )
  })
})
