import { describe, expect, it } from 'vitest'

import type { DeviceTelemetry } from '../../../shared'
import { appendSample, ramPercent } from './telemetryHistory'

const reading = (
  captured_at: string,
  cpu: number | null,
  status: DeviceTelemetry['status'] = 'up'
): DeviceTelemetry => ({
  status,
  message: '',
  captured_at,
  cpu_percent: cpu,
  ram_used_bytes: 4,
  ram_total_bytes: 16,
  uptime_seconds: 60,
  filesystems: [],
  system: null,
  cpu_name: null,
  load: null,
  processes: []
})

describe('Rolling telemetry history', () => {
  it('appends each new reading once and keeps the newest points', () => {
    let samples = appendSample([], reading('2026-10-29T00:00:00Z', 10))
    samples = appendSample(samples, reading('2026-10-29T00:00:00Z', 99))
    samples = appendSample(samples, reading('2026-10-29T00:00:05Z', 20), 2)
    samples = appendSample(samples, reading('2026-10-29T00:00:10Z', 30), 2)

    expect(samples.map(sample => sample.cpu)).toEqual([20, 30])
    expect(samples[1]!.ram).toBe(25)
  })

  it('skips unavailable readings instead of plotting them as zero', () => {
    const samples = appendSample(
      [],
      reading('2026-10-29T00:00:00Z', null, 'error')
    )

    expect(samples).toEqual([])
    expect(ramPercent({ ...reading('x', 1), ram_total_bytes: 0 })).toBeNull()
  })
})
