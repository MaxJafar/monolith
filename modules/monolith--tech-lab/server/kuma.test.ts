import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  kumaTime,
  normalizeKuma,
  readUptimeKuma,
  statusPageParts
} from './kuma'
import { readTarget } from './network'

vi.mock('./network', async importOriginal => {
  const actual = await importOriginal<typeof import('./network')>()

  return { ...actual, readTarget: vi.fn() }
})

const read = vi.mocked(readTarget)
const now = new Date('2026-10-28T23:10:00Z')

const page = {
  config: { slug: 'homelab', title: 'Home Lab' },
  publicGroupList: [
    {
      name: 'Devices',
      monitorList: [
        { id: 1, name: 'PC RTX 5060', type: 'http' },
        { id: 3, name: 'Dell OptiPlex', type: 'http' },
        { id: 'bad', name: 'Ignored' }
      ]
    }
  ]
}
const heartbeat = {
  heartbeatList: {
    '1': [{ status: 0, time: '2026-10-28 23:07:29.279', ping: null }],
    '3': [
      { status: 1, time: '2026-10-28 23:02:29.000', ping: 12 },
      { status: 2, time: 'not a time', ping: 3 },
      { status: 1, time: '2026-10-28 23:07:29.000', ping: 9.5 }
    ]
  },
  uptimeList: { '1_24': 0, '3_24': 1 }
}

beforeEach(() => read.mockReset())

describe('Uptime Kuma status pages', () => {
  it('reads Kuma UTC times without a zone as UTC', () => {
    expect(kumaTime('2026-10-28 23:07:29.279')).toBe('2026-10-28T23:07:29.279Z')
    expect(kumaTime('2026-10-28T23:07:29+04:00')).toBe(
      '2026-10-28T19:07:29.000Z'
    )
    expect(kumaTime('yesterday')).toBeNull()
  })

  it('splits a status page URL into its API base and slug', () => {
    expect(statusPageParts('http://kuma.invalid:3001/status/HomeLab/')).toEqual(
      {
        base: 'http://kuma.invalid:3001',
        slug: 'homelab'
      }
    )
    expect(statusPageParts('https://host.invalid/kuma/status/lab')).toEqual({
      base: 'https://host.invalid/kuma',
      slug: 'lab'
    })
    expect(() => statusPageParts('http://kuma.invalid/dashboard')).toThrow()
    expect(() =>
      statusPageParts('http://kuma.invalid/status/lab?token=x')
    ).toThrow()
  })

  it('normalizes monitors, latest state, uptime and valid beats', () => {
    const status = normalizeKuma(page, heartbeat, 'http://kuma/status/x', now)

    expect(status.title).toBe('Home Lab')
    expect(status.monitors).toEqual([
      {
        id: 1,
        name: 'PC RTX 5060',
        group: 'Devices',
        uptime_24h: 0,
        status: 'down',
        ping_ms: null,
        beats: [
          { status: 'down', time: '2026-10-28T23:07:29.279Z', ping_ms: null }
        ]
      },
      {
        id: 3,
        name: 'Dell OptiPlex',
        group: 'Devices',
        uptime_24h: 1,
        status: 'up',
        ping_ms: 9.5,
        beats: [
          { status: 'up', time: '2026-10-28T23:02:29.000Z', ping_ms: 12 },
          { status: 'up', time: '2026-10-28T23:07:29.000Z', ping_ms: 9.5 }
        ]
      }
    ])
  })

  it('requests both public endpoints and reports an unpublished page', async () => {
    read.mockResolvedValueOnce({ status: 200, body: page })
    read.mockResolvedValueOnce({ status: 200, body: heartbeat })

    const status = await readUptimeKuma(
      'http://kuma.invalid:3001/status/homelab'
    )

    expect(read.mock.calls.map(call => call[0])).toEqual([
      'http://kuma.invalid:3001/api/status-page/homelab',
      'http://kuma.invalid:3001/api/status-page/heartbeat/homelab'
    ])
    expect(status.monitors).toHaveLength(2)

    read.mockResolvedValue({ status: 404, body: null })
    await expect(
      readUptimeKuma('http://kuma.invalid:3001/status/homelab')
    ).rejects.toThrow('not published')
  })
})
