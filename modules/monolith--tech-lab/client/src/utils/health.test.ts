import { describe, expect, it } from 'vitest'

import {
  checkSchema,
  serviceHealthSchema,
  serviceSchema
} from '../../../shared'
import {
  filterServices,
  formatBytes,
  latencyPoints,
  observedAvailability
} from './health'

const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'
const device = '00000000-0000-4000-8000-000000000003'
const instant = '2026-10-13T00:00:00Z'
const services = [
  serviceSchema.parse({
    id: first,
    name: 'Art server',
    kind: 'game',
    device_id: device,
    tags: ['Art'],
    category: 'Games',
    created: instant,
    updated: instant,
    monitor_revision: 1
  }),
  serviceSchema.parse({
    id: second,
    name: 'Cart app',
    tags: ['Cart'],
    created: instant,
    updated: instant,
    monitor_revision: 1
  })
]
const health = serviceHealthSchema.parse({
  service_id: first,
  status: 'down',
  latest: null,
  observed_24h: { up: 1, down: 1, error: 2, total: 4, up_percent: 25 },
  next_check_at: null
})
const healthMap = new Map([[first, health]])
const filters = {
  search: '',
  kind: '',
  device: '',
  category: '',
  tag: '',
  status: ''
}

describe('Tech Lab observed health', () => {
  it('distinguishes unknown observations from zero-percent reachability', () => {
    expect(observedAvailability()).toBeNull()
    expect(
      observedAvailability({
        ...health,
        observed_24h: { up: 0, down: 0, error: 0, total: 0, up_percent: null }
      })
    ).toBeNull()
    expect(
      observedAvailability({
        ...health,
        observed_24h: { up: 0, down: 1, error: 0, total: 1, up_percent: 0 }
      })
    ).toBe(0)
  })
  it('uses the server ratio including errored checks in the denominator', () => {
    expect(observedAvailability(health)).toBe(25)
  })
  it('sorts checks in actual instant order, preserves duplicates, and leaves failure gaps', () => {
    const make = (
      checked_at: string,
      status: 'up' | 'down' | 'error',
      latency_ms: number | null
    ) =>
      checkSchema.parse({
        id: first,
        service_id: first,
        original_service_id: first,
        service_name: 'A',
        monitor_kind: 'http',
        monitor_target: 'http://host',
        monitor_port: null,
        monitor_revision: 1,
        checked_at,
        status,
        latency_ms,
        http_status: null,
        message: ''
      })
    const records = [
      make('2026-10-13T10:00:00Z', 'up', 0),
      make('2026-10-13T05:00:00-04:00', 'down', 24),
      make('2026-10-13T09:00:00Z', 'error', null)
    ]
    const points = latencyPoints(records)
    expect(points.map(point => point.value)).toEqual([null, null, 0])
    expect(points).toHaveLength(3)
    expect(points[0]?.position).toBe(points[1]?.position)
    expect(records[0]?.checked_at).toBe('2026-10-13T10:00:00Z')
  })
  it('matches tags exactly instead of confusing Art with Cart', () => {
    expect(
      filterServices(services, healthMap, { ...filters, tag: 'Art' }).map(
        service => service.id
      )
    ).toEqual([first])
  })
  it('combines device, kind, category, tag and status as AND filters', () => {
    expect(
      filterServices(services, healthMap, {
        ...filters,
        device,
        kind: 'game',
        category: 'Games',
        tag: 'Art',
        status: 'down'
      })
    ).toEqual([services[0]])
    expect(
      filterServices(services, healthMap, {
        ...filters,
        device,
        kind: 'service'
      })
    ).toEqual([])
  })
  it('keeps unassigned devices and unknown status distinct from all', () => {
    expect(
      filterServices(services, healthMap, {
        ...filters,
        device: 'unassigned',
        status: 'unknown'
      })
    ).toEqual([services[1]])
    expect(filterServices(services, healthMap, filters)).toHaveLength(2)
  })
  it('searches case-insensitively without altering source records', () => {
    expect(
      filterServices(services, healthMap, { ...filters, search: '  CART  ' })
    ).toEqual([services[1]])
    expect(services[1]?.name).toBe('Cart app')
  })
  it('preserves unknown and zero memory usage as different values', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KiB')
  })
})
