import type { TechLabTimeline } from '../shared'

export type TimelineRow = {
  service_id: string | null
  bucket: number
  up: number
  down: number
  error: number
  latency_ms: number | null
}

/** Every service gets one slot per bucket; a slot without checks stays null. */
export function shapeTimeline(
  rows: TimelineRow[],
  serviceIds: string[],
  options: { from: Date; to: Date; buckets: number }
): TechLabTimeline {
  const slots = new Map(
    serviceIds.map(id => [
      id,
      Array<TechLabTimeline['services'][number]['buckets'][number]>(
        options.buckets
      ).fill(null)
    ])
  )

  for (const row of rows) {
    const buckets = row.service_id ? slots.get(row.service_id) : undefined

    if (!buckets || row.bucket < 0 || row.bucket >= options.buckets) continue
    buckets[row.bucket] = {
      up: row.up,
      down: row.down,
      error: row.error,
      latency_ms:
        row.latency_ms !== null && Number.isFinite(row.latency_ms)
          ? Math.round(row.latency_ms * 10) / 10
          : null
    }
  }

  return {
    from: options.from.toISOString(),
    to: options.to.toISOString(),
    bucket_seconds: Math.round(
      (options.to.getTime() - options.from.getTime()) / 1000 / options.buckets
    ),
    services: [...slots].map(([service_id, buckets]) => ({
      service_id,
      buckets
    }))
  }
}
