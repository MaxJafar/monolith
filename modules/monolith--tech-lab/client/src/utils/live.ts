import type { LiveStatus } from '@/charts/StatusMark'
import type { StripStatus } from '@/charts/StatusStrip'

import type {
  ServiceHealth,
  TechLabTimeline,
  UptimeKumaStatus
} from '../../../shared'

export const healthMark: Record<ServiceHealth['status'], LiveStatus> = {
  up: 'up',
  down: 'down',
  error: 'warning',
  stale: 'pending',
  disabled: 'off',
  unknown: 'unknown'
}

type Bucket = TechLabTimeline['services'][number]['buckets'][number]

export function bucketStatus(bucket: Bucket): StripStatus {
  if (!bucket) return 'empty'

  const failed = bucket.down + bucket.error

  return !failed ? 'up' : bucket.up ? 'partial' : 'down'
}

export function kumaMark(
  status: UptimeKumaStatus['monitors'][number]['status']
): LiveStatus {
  return status === null ? 'unknown' : status
}

/** Group in first-seen order, which keeps the inventory's own sorting. */
export function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const name = key(item)
    groups.set(name, [...(groups.get(name) ?? []), item])
  }

  return groups
}

/** Mean of the monitors that have data; null when none have reported yet. */
export function averageAvailability(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null)

  return known.length
    ? known.reduce((sum, value) => sum + value, 0) / known.length
    : null
}
