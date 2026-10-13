import dayjs from 'dayjs'

import type { Check, Service, ServiceHealth } from '../../../shared'

export function observedAvailability(health?: ServiceHealth) {
  const total = health?.observed_24h.total ?? 0

  return total > 0 ? (health?.observed_24h.up_percent ?? null) : null
}

export function latencyPoints(checks: Check[]) {
  return [...checks]
    .sort(
      (a, b) => dayjs(a.checked_at).valueOf() - dayjs(b.checked_at).valueOf()
    )
    .map(check => ({
      label: dayjs(check.checked_at).format('lll'),
      position: dayjs(check.checked_at).valueOf(),
      value: check.status === 'up' ? check.latency_ms : null,
      detail: check.status
    }))
}

export function filterServices(
  services: Service[],
  health: Map<string, ServiceHealth>,
  filters: {
    search: string
    kind: string
    device: string
    category: string
    tag: string
    status: string
  }
) {
  const search = filters.search.trim().toLocaleLowerCase()

  return services.filter(
    service =>
      (!filters.kind || service.kind === filters.kind) &&
      (!filters.device ||
        (filters.device === 'unassigned'
          ? !service.device_id
          : service.device_id === filters.device)) &&
      (!filters.category || service.category === filters.category) &&
      (!filters.tag || service.tags.includes(filters.tag)) &&
      (!filters.status ||
        (health.get(service.id)?.status ?? 'unknown') === filters.status) &&
      (!search ||
        [
          service.name,
          service.description,
          service.address,
          service.url,
          service.category,
          ...service.tags
        ].some(value => value.toLocaleLowerCase().includes(search)))
  )
}

export function formatBytes(value: number | null) {
  if (value === null) return '—'
  if (value < 1024) return `${Math.round(value)} B`

  const units = ['KiB', 'MiB', 'GiB', 'TiB']

  let scaled = value / 1024
  let index = 0

  while (scaled >= 1024 && index < units.length - 1) {
    scaled /= 1024
    index++
  }

  return `${scaled.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[index]}`
}
