import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readTarget } from './network'
import {
  glancesUptime,
  normalizeGlances,
  readGlancesTelemetry
} from './telemetry'

vi.mock('./network', async importOriginal => {
  const actual = await importOriginal<typeof import('./network')>()

  return { ...actual, readTarget: vi.fn() }
})

const read = vi.mocked(readTarget)
const now = new Date('2026-10-13T12:00:00Z')

beforeEach(() => {
  read.mockReset()

  vi.useFakeTimers()

  vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())

describe('Observed Glances values', () => {
  it('preserves zero and observed numeric units without treating them as missing', () => {
    expect(
      normalizeGlances(
        { total: 0 },
        { total: 1000, used: 0 },
        [{ mnt_point: '/', size: 2000, used: 0 }],
        '0:00:00'
      )
    ).toEqual({
      cpu_percent: 0,
      ram_total_bytes: 1000,
      ram_used_bytes: 0,
      uptime_seconds: 0,
      filesystems: [{ name: '/', total_bytes: 2000, used_bytes: 0 }]
    })
  })

  it('suppresses impossible metrics instead of inventing clamped observations', () => {
    const result = normalizeGlances(
      { total: 150 },
      { total: 100, used: 120 },
      [{ mnt_point: '/', size: 100, used: 120 }],
      -1
    )

    expect(result.cpu_percent).toBeNull()
    expect(result.ram_used_bytes).toBeNull()
    expect(result.filesystems).toEqual([])
    expect(result.uptime_seconds).toBeNull()
  })

  it('does not coerce strings, booleans or infinities into numeric metrics', () => {
    expect(
      normalizeGlances(
        { total: '30' },
        { total: Infinity, used: false },
        {},
        null
      )
    ).toEqual({
      cpu_percent: null,
      ram_total_bytes: null,
      ram_used_bytes: null,
      uptime_seconds: null,
      filesystems: []
    })
  })

  it.each([
    ['1 day, 02:03:04', 93784],
    ['2 days, 00:00:01', 172801],
    ['25:00:00', 90000],
    [1234, 1234],
    ['00:60:00', null],
    ['00:00:60', null],
    ['not-uptime', null],
    [Infinity, null]
  ])('interprets observed uptime %s', (value, seconds) => {
    expect(glancesUptime(value)).toBe(seconds)
  })
})

describe('Glances plugin reads', () => {
  it('performs no request for an unconfigured device', async () => {
    expect(await readGlancesTelemetry('')).toMatchObject({
      status: 'disabled',
      cpu_percent: null
    })
    expect(read).not.toHaveBeenCalled()
  })

  it('collects only metric plugins and preserves their actual values', async () => {
    read.mockImplementation(async input => {
      const plugin = input.split('/').pop()
      const body =
        plugin === 'cpu'
          ? { total: 13.5 }
          : plugin === 'mem'
            ? { total: 16000, used: 8000 }
            : plugin === 'fs'
              ? [{ mnt_point: '/', size: 100000, used: 20000 }]
              : '1 day, 00:00:00'

      return { status: 200, body }
    })
    const result = await readGlancesTelemetry(
      'http://fixture.invalid/glances/api/4/'
    )

    expect(read.mock.calls.map(call => call[0])).toEqual(
      ['cpu', 'mem', 'fs', 'uptime'].map(
        plugin => `http://fixture.invalid/glances/api/4/${plugin}`
      )
    )
    expect(
      read.mock.calls.every(call => call[1] === 'GET' && call[2] === true)
    ).toBe(true)
    expect(result).toMatchObject({
      status: 'up',
      cpu_percent: 13.5,
      ram_used_bytes: 8000,
      ram_total_bytes: 16000,
      uptime_seconds: 86400,
      filesystems: [{ name: '/', used_bytes: 20000, total_bytes: 100000 }]
    })
  })

  it('retains successful metrics when one plugin request rejects', async () => {
    read.mockImplementation(async input => {
      if (input.endsWith('/mem')) throw new Error('PRIVATE_FAILURE_DETAIL')

      return {
        status: 200,
        body: input.endsWith('/cpu')
          ? { total: 25 }
          : input.endsWith('/uptime')
            ? 3600
            : []
      }
    })
    const result = await readGlancesTelemetry('http://fixture.invalid')

    expect(result).toMatchObject({
      status: 'up',
      cpu_percent: 25,
      ram_total_bytes: null,
      uptime_seconds: 3600
    })
    expect(result.message).toContain('Some')
    expect(JSON.stringify(result)).not.toContain('PRIVATE_FAILURE_DETAIL')
  })

  it('tries v3 only after every v4 plugin is absent', async () => {
    read.mockImplementation(async input => ({
      status: input.includes('/api/4/') ? 404 : 200,
      body: input.endsWith('/cpu') ? { total: 5 } : null
    }))
    const result = await readGlancesTelemetry('http://fixture.invalid/api/3')

    expect(read).toHaveBeenCalledTimes(8)
    expect(
      read.mock.calls.slice(4).every(call => call[0].includes('/api/3/'))
    ).toBe(true)
    expect(result.cpu_percent).toBe(5)
  })

  it('does not show healthy telemetry for 200 responses with no valid metrics', async () => {
    read.mockResolvedValue({ status: 200, body: { unrelated: true } })
    const result = await readGlancesTelemetry('http://fixture.invalid')

    expect(result.status).toBe('error')
    expect(result.cpu_percent).toBeNull()
    expect(result.ram_total_bytes).toBeNull()
    expect(result.uptime_seconds).toBeNull()
    expect(result.filesystems).toEqual([])
  })

  it('timestamps completion rather than the moment requests started', async () => {
    read.mockImplementation(async () => {
      vi.setSystemTime(new Date(now.getTime() + 5000))

      return { status: 200, body: { total: 5 } }
    })
    const result = await readGlancesTelemetry('http://fixture.invalid')

    expect(result.captured_at).toBe('2026-10-13T12:00:05.000Z')
  })

  it.each([
    'http://user:secret@fixture.invalid',
    'http://fixture.invalid?api_key=secret',
    'http://fixture.invalid?view=full'
  ])('rejects unsupported telemetry URL %s before requesting it', async url => {
    expect(await readGlancesTelemetry(url)).toMatchObject({ status: 'error' })
    expect(read).not.toHaveBeenCalled()
  })
})
