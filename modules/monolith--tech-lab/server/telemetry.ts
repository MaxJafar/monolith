import type { DeviceTelemetry } from '../shared'
import { readTarget, targetUrl } from './network'

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function glancesUptime(value: unknown): number | null {
  if (typeof value === 'number') return number(value)
  if (typeof value !== 'string') return null

  const match = value.match(/^(?:(\d+) days?,\s*)?(\d+):(\d{2}):(\d{2})$/)

  const seconds =
    match && Number(match[3]) < 60 && Number(match[4]) < 60
      ? Number(match[1] || 0) * 86400 +
        Number(match[2]) * 3600 +
        Number(match[3]) * 60 +
        Number(match[4])
      : null

  return seconds !== null && Number.isSafeInteger(seconds) ? seconds : null
}

export function normalizeGlances(
  cpu: unknown,
  mem: unknown,
  fs: unknown,
  uptime: unknown
): Pick<
  DeviceTelemetry,
  | 'cpu_percent'
  | 'ram_used_bytes'
  | 'ram_total_bytes'
  | 'filesystems'
  | 'uptime_seconds'
> {
  const cpuValue = number(object(cpu).total)
  const memory = object(mem)
  const total = number(memory.total)
  const used = number(memory.used)

  return {
    cpu_percent: cpuValue === null || cpuValue > 100 ? null : cpuValue,
    ram_total_bytes: total,
    ram_used_bytes:
      used !== null && total !== null && used > total ? null : used,
    uptime_seconds: glancesUptime(uptime),
    filesystems: Array.isArray(fs)
      ? fs.slice(0, 64).flatMap(raw => {
          const entry = object(raw)
          const size = number(entry.size)
          const usedBytes = number(entry.used)
          const name = entry.mnt_point ?? entry.device_name

          return size !== null &&
            usedBytes !== null &&
            usedBytes <= size &&
            typeof name === 'string'
            ? [
                {
                  name: name.slice(0, 500),
                  total_bytes: size,
                  used_bytes: usedBytes
                }
              ]
            : []
        })
      : []
  }
}

/** Read only the metric plugins; process command lines and credentials are never requested. */
export async function readGlancesTelemetry(
  input: string
): Promise<DeviceTelemetry> {
  const empty: DeviceTelemetry = {
    status: input ? 'error' : 'disabled',
    message: '',
    captured_at: new Date().toISOString(),
    cpu_percent: null,
    ram_used_bytes: null,
    ram_total_bytes: null,
    uptime_seconds: null,
    filesystems: []
  }

  if (!input) return empty

  try {
    const url = targetUrl(input)

    if (url.search)
      throw new Error('Glances URL must not contain query parameters')

    const prefix = url.pathname.replace(/\/$/, '').replace(/\/api\/[34]$/, '')

    for (const version of [4, 3]) {
      const requests = await Promise.allSettled(
        ['cpu', 'mem', 'fs', 'uptime'].map(plugin =>
          readTarget(
            `${url.origin}${prefix}/api/${version}/${plugin}`,
            'GET',
            true
          )
        )
      )
      const results = requests.map(result =>
        result.status === 'fulfilled' ? result.value : { status: 0, body: null }
      )

      if (version === 4 && results.every(result => result.status === 404))
        continue

      const bodies = results.map(result =>
        result.status === 200 ? result.body : null
      )
      const normalized = normalizeGlances(
        bodies[0],
        bodies[1],
        bodies[2],
        bodies[3]
      )
      const successful = [
        normalized.cpu_percent !== null,
        normalized.ram_used_bytes !== null &&
          normalized.ram_total_bytes !== null,
        normalized.filesystems.length > 0,
        normalized.uptime_seconds !== null
      ].filter(Boolean).length

      return {
        ...empty,
        ...normalized,
        captured_at: new Date().toISOString(),
        status: successful ? 'up' : 'error',
        message:
          successful === 4
            ? 'Glances metrics received'
            : successful
              ? 'Some metric plugins are unavailable'
              : 'Glances is unavailable or requires authentication'
      }
    }

    return {
      ...empty,
      captured_at: new Date().toISOString(),
      message: 'Glances API version 3 or 4 was not found'
    }
  } catch {
    return {
      ...empty,
      captured_at: new Date().toISOString(),
      message: 'Glances telemetry could not be read from this server'
    }
  }
}
