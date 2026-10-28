import type { UptimeKumaStatus } from '../shared'
import { TargetPolicyError, readTarget, targetUrl } from './network'

const beatStatuses = ['down', 'up', 'pending', 'maintenance'] as const

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
}

/** Kuma reports heartbeat times in UTC without a zone designator. */
export function kumaTime(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : value.replace(' ', 'T') + 'Z'
  const time = new Date(iso)

  return Number.isNaN(time.getTime()) ? null : time.toISOString()
}

export function statusPageParts(input: string) {
  const url = targetUrl(input)
  const match = url.pathname.match(/^(.*)\/status\/([a-z0-9-]{1,64})\/?$/i)

  if (!match || url.search)
    throw new TargetPolicyError(
      'Use an Uptime Kuma status page URL such as http://host:3001/status/homelab'
    )

  return { base: url.origin + match[1], slug: match[2]!.toLowerCase() }
}

export function normalizeKuma(
  page: unknown,
  heartbeat: unknown,
  url: string,
  now = new Date()
): UptimeKumaStatus {
  const config = object(object(page).config)
  const groups = Array.isArray(object(page).publicGroupList)
    ? (object(page).publicGroupList as unknown[])
    : []
  const beats = object(object(heartbeat).heartbeatList)
  const uptime = object(object(heartbeat).uptimeList)

  const monitors = groups.slice(0, 50).flatMap(rawGroup => {
    const group = object(rawGroup)
    const list = Array.isArray(group.monitorList) ? group.monitorList : []

    return list.flatMap(rawMonitor => {
      const monitor = object(rawMonitor)

      if (typeof monitor.id !== 'number' || !Number.isInteger(monitor.id))
        return []

      const history = (
        Array.isArray(beats[String(monitor.id)])
          ? (beats[String(monitor.id)] as unknown[])
          : []
      )
        .slice(-100)
        .flatMap(rawBeat => {
          const beat = object(rawBeat)
          const status =
            typeof beat.status === 'number' ? beatStatuses[beat.status] : null
          const time = kumaTime(beat.time)

          return status && time
            ? [{ status, time, ping_ms: finite(beat.ping) }]
            : []
        })
      const ratio = finite(uptime[`${monitor.id}_24`])
      const latest = history.at(-1)

      return [
        {
          id: monitor.id,
          name: String(monitor.name ?? monitor.id).slice(0, 500),
          group: String(group.name ?? '').slice(0, 500),
          uptime_24h: ratio !== null && ratio <= 1 ? ratio : null,
          status: latest?.status ?? null,
          ping_ms: latest?.ping_ms ?? null,
          beats: history
        }
      ]
    })
  })

  return {
    title: String(config.title ?? '').slice(0, 500),
    url,
    captured_at: now.toISOString(),
    monitors: monitors.slice(0, 200)
  }
}

/** Read a public Uptime Kuma status page; no Kuma credentials are involved. */
export async function readUptimeKuma(input: string): Promise<UptimeKumaStatus> {
  const { base, slug } = statusPageParts(input)
  const [page, heartbeat] = await Promise.all([
    readTarget(`${base}/api/status-page/${slug}`, 'GET', true),
    readTarget(`${base}/api/status-page/heartbeat/${slug}`, 'GET', true)
  ])

  if (page.status !== 200 || heartbeat.status !== 200)
    throw new TargetPolicyError(
      'The Uptime Kuma status page is unavailable or not published'
    )

  return normalizeKuma(page.body, heartbeat.body, input)
}
