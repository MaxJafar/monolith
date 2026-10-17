import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

export class TargetPolicyError extends Error {}

/** Private LAN/Tailscale targets are intentional; local control planes are not. */
export function blockedAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)

    return (
      a === 0 ||
      a === 127 ||
      a! >= 224 ||
      (a === 169 && b === 254) ||
      address === '100.100.100.200'
    )
  }
  if (isIP(address) !== 6) return true
  let normalized = address.toLowerCase()

  const dotted = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/)

  if (dotted) {
    const octets = dotted[1]!.split('.').map(Number)
    normalized = normalized.replace(
      dotted[1]!,
      `${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`
    )
  }

  const [left, right] = normalized.split('::')
  const before = left ? left.split(':') : []
  const after = right ? right.split(':') : []
  const groups = normalized.includes('::')
    ? [
        ...before,
        ...Array(8 - before.length - after.length).fill('0'),
        ...after
      ]
    : before
  const words = groups.map(group => parseInt(group, 16))

  if (words.length !== 8) return true
  if (words.slice(0, 6).every(word => word === 0)) return true
  if (words.slice(0, 7).every(word => word === 0) && words[7]! <= 1) return true
  if ((words[0]! & 0xffc0) === 0xfe80 || (words[0]! & 0xff00) === 0xff00)
    return true
  if (words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff)
    return blockedAddress(
      `${words[6]! >> 8}.${words[6]! & 255}.${words[7]! >> 8}.${words[7]! & 255}`
    )
  // Translation prefixes must not tunnel reserved IPv4 destinations.
  if ((words[0] === 0x64 && words[1] === 0xff9b) || words[0] === 0x2002)
    return true

  return false
}

export function targetUrl(input: string): URL {
  let url: URL

  try {
    url = new URL(input)
  } catch {
    throw new TargetPolicyError('A valid HTTP or HTTPS target is required')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.href.length > 2048
  )
    throw new TargetPolicyError(
      'Targets cannot include credentials or fragments'
    )
  if (
    [...url.searchParams.keys()].some(key =>
      /token|password|secret|api[_-]?key|authorization|^(key|auth)$/i.test(key)
    )
  )
    throw new TargetPolicyError('Credentials cannot be placed in target URLs')

  return url
}

export async function resolveTarget(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '')

  if (!host || host.length > 253 || /[\s/\\@]/.test(host))
    throw new TargetPolicyError('A valid host is required')

  const records = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await new Promise<{ address: string; family: number }[]>(
        (resolve, reject) => {
          const deadline = setTimeout(
            () => reject(new Error('DNS lookup timed out')),
            5000
          )
          void lookup(host, { all: true, verbatim: true })
            .then(resolve, reject)
            .finally(() => clearTimeout(deadline))
        }
      )

  if (!records.length || records.some(record => blockedAddress(record.address)))
    throw new TargetPolicyError(
      'Loopback, link-local and metadata targets are unavailable'
    )

  return records[0]!
}

/** DNS is resolved once, checked and pinned; redirects and cookies are never forwarded. */
export async function readTarget(
  input: string,
  method: 'HEAD' | 'GET' = 'GET',
  json = false
): Promise<{ status: number; body: unknown }> {
  const url = targetUrl(input)
  const resolved = await resolveTarget(url.hostname)

  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        method,
        agent: false,
        timeout: 5000,
        headers: {
          'User-Agent': 'Monolith-TechLab/1.0',
          Accept: json ? 'application/json' : '*/*'
        },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [resolved])
          else callback(null, resolved.address, resolved.family)
        }
      },
      response => {
        const status = response.statusCode ?? 0

        if (!json || status < 200 || status >= 300) {
          response.destroy()
          resolve({ status, body: null })

          return
        }

        const chunks: Buffer[] = []

        let size = 0

        response.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > 262144) {
            response.destroy()
            reject(new Error('Telemetry response exceeds the size limit'))
          } else chunks.push(chunk)
        })
        response.on('error', reject)
        response.on('end', () => {
          try {
            resolve({
              status,
              body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
            })
          } catch {
            reject(new Error('Telemetry response is not valid JSON'))
          }
        })
      }
    )
    const deadline = setTimeout(
      () => request.destroy(new Error('Request timed out')),
      5000
    )

    request.on('close', () => clearTimeout(deadline))
    request.on('timeout', () => request.destroy(new Error('Request timed out')))
    request.on('error', reject)
    request.end()
  })
}
