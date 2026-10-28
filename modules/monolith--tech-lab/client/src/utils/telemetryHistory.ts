import { useSyncExternalStore } from 'react'

import type { DeviceTelemetry } from '../../../shared'

export type TelemetrySample = {
  at: number
  cpu: number | null
  ram: number | null
}

const limit = 30
const empty: TelemetrySample[] = []
const history = new Map<string, TelemetrySample[]>()
const listeners = new Set<() => void>()

export function ramPercent(value: DeviceTelemetry) {
  return value.ram_used_bytes !== null &&
    value.ram_total_bytes !== null &&
    value.ram_total_bytes > 0
    ? (value.ram_used_bytes / value.ram_total_bytes) * 100
    : null
}

/** Keep the newest readings, once each, like Homepage's rolling points. */
export function appendSample(
  samples: TelemetrySample[],
  value: DeviceTelemetry,
  max = limit
): TelemetrySample[] {
  const at = Date.parse(value.captured_at)

  if (
    value.status !== 'up' ||
    Number.isNaN(at) ||
    samples[samples.length - 1]?.at === at
  )
    return samples

  return [...samples, { at, cpu: value.cpu_percent, ram: ramPercent(value) }]
    .sort((a, b) => a.at - b.at)
    .slice(-max)
}

// Shared across widgets and kept while the tab is open, so a device shown in
// two places, or revisited, draws the same rolling history.
export function recordTelemetry(id: string, value: DeviceTelemetry) {
  const samples = history.get(id) ?? empty
  const next = appendSample(samples, value)

  if (next === samples) return
  history.set(id, next)
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function useTelemetryHistory(id: string | undefined) {
  return useSyncExternalStore(subscribe, () =>
    id ? (history.get(id) ?? empty) : empty
  )
}
