import { ClientError } from '@monolith/server-utils'

import {
  type Check,
  type Service,
  type ServiceHealth,
  type ServiceInput,
  httpUrlSchema
} from '../shared'

export function ownerId(res: { locals: Record<string, unknown> }): string {
  const id = res.locals.userId

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ClientError('Authentication required', 401)

  return id
}

export function checkUpdated(actual: Date, expected?: string) {
  if (!expected || actual.getTime() !== Date.parse(expected))
    throw new ClientError(
      'This item changed elsewhere. Reload before saving.',
      409
    )
}

export function nextUpdated(previous?: Date, now = new Date()) {
  return new Date(Math.max(now.getTime(), (previous?.getTime() ?? 0) + 1))
}

export function validateMonitor(input: ServiceInput) {
  if (
    input.monitor_target.includes('://') &&
    !httpUrlSchema.safeParse(input.monitor_target).success
  )
    throw new ClientError(
      'Monitor targets must not contain embedded credentials or credential query parameters'
    )
  if (!input.monitor_enabled) return
  if (input.monitor_kind === 'none')
    throw new ClientError('Choose a monitor type before enabling monitoring')
  if (!input.monitor_target)
    throw new ClientError('Enter a monitor target before enabling monitoring')

  if (input.monitor_kind === 'http') {
    if (!httpUrlSchema.safeParse(input.monitor_target).success)
      throw new ClientError(
        'HTTP monitoring needs an HTTP or HTTPS target without credentials'
      )
  } else {
    const target = input.monitor_target

    if (/[\s/@?#]/.test(target) || target.includes('://'))
      throw new ClientError(
        'TCP and Minecraft targets must be a hostname or IP address without a URL path'
      )
    if (!input.monitor_port)
      throw new ClientError('Enter a port for TCP or Minecraft monitoring')
  }
}

export function monitorChanged(a: ServiceInput, b: ServiceInput) {
  return (
    a.monitor_kind !== b.monitor_kind ||
    a.monitor_target !== b.monitor_target ||
    a.monitor_port !== b.monitor_port ||
    a.monitor_enabled !== b.monitor_enabled ||
    a.monitor_interval_seconds !== b.monitor_interval_seconds
  )
}

export function observedHealth(
  service: Service,
  history: Check[],
  staleMultiplier: number,
  now = new Date()
): ServiceHealth {
  const relevant = history.filter(
    check =>
      check.original_service_id === service.id &&
      check.monitor_revision === service.monitor_revision &&
      Date.parse(check.checked_at) <= now.getTime()
  )
  const latest = relevant.reduce<Check | null>(
    (last, item) => (!last || item.checked_at > last.checked_at ? item : last),
    null
  )
  const samples = relevant.filter(
    item => Date.parse(item.checked_at) >= now.getTime() - 86400000
  )
  const counts = {
    up: 0,
    down: 0,
    error: 0,
    total: samples.length,
    up_percent: null as number | null
  }

  for (const item of samples) counts[item.status]++
  if (counts.total) counts.up_percent = (counts.up / counts.total) * 100

  const status =
    !service.monitor_enabled || service.monitor_kind === 'none'
      ? 'disabled'
      : !latest
        ? 'unknown'
        : now.getTime() - Date.parse(latest.checked_at) >
            service.monitor_interval_seconds * staleMultiplier * 1000
          ? 'stale'
          : latest.status

  return {
    service_id: service.id,
    status,
    latest,
    observed_24h: counts,
    next_check_at:
      service.monitor_enabled && service.monitor_kind !== 'none'
        ? new Date(
            latest
              ? Date.parse(latest.checked_at) +
                  service.monitor_interval_seconds * 1000
              : now.getTime()
          ).toISOString()
        : null
  }
}
