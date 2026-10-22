import ipaddr from 'ipaddr.js'
import type { LookupAddress } from 'node:dns'
import { lookup } from 'node:dns/promises'
import { type IncomingMessage, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

import { ExternalServiceError } from './serviceRequest'

export function isPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) return false

  let parsed = ipaddr.parse(address)

  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress())
    parsed = (parsed as ipaddr.IPv6).toIPv4Address()

  return parsed.range() === 'unicast'
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)

    signal.throwIfAborted()
    signal.addEventListener('abort', abort, { once: true })
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort))
  })
}

function connect(
  url: URL,
  address: LookupAddress,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        agent: false,
        family: address.family,
        headers,
        signal,
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [address])
          else callback(null, address.address, address.family)
        }
      },
      resolve
    )

    request.on('error', reject)
    request.end()
  })
}

/** Reads a user-supplied URL from public addresses only. Each hop, redirects
 * included, is resolved once, checked and pinned so DNS rebinding cannot reach
 * loopback, private or metadata networks. */
export async function publicResponse(
  service: string,
  target: URL | string,
  headers: Record<string, string> = {},
  limit = 8 * 1024 * 1024
): Promise<{ text: string; contentType: string }> {
  const signal = AbortSignal.timeout(20_000)

  let url = new URL(target)

  try {
    for (let hop = 0; hop <= 5; hop++) {
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new ExternalServiceError(service)

      const addresses = await abortable(
        lookup(url.hostname.replace(/^\[|\]$/g, ''), {
          all: true,
          verbatim: true
        }),
        signal
      )

      if (
        !addresses.length ||
        addresses.some(address => !isPublicAddress(address.address))
      )
        throw new ExternalServiceError(service)

      const response = await connect(url, addresses[0]!, headers, signal)
      const status = response.statusCode ?? 0
      const location = response.headers.location

      if (status >= 300 && status < 400 && location) {
        response.resume()
        url = new URL(location, url)
        continue
      }

      if (status < 200 || status >= 300) {
        response.resume()
        throw new ExternalServiceError(service, status)
      }

      const chunks: Buffer[] = []

      let bytes = 0

      for await (const chunk of response as AsyncIterable<Buffer>) {
        bytes += chunk.byteLength

        if (bytes > limit) {
          response.destroy()
          throw new ExternalServiceError(service)
        }
        chunks.push(chunk)
      }

      return {
        text: Buffer.concat(chunks).toString('utf8'),
        contentType: String(response.headers['content-type'] ?? '')
      }
    }
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error
    throw new ExternalServiceError(service)
  }
  throw new ExternalServiceError(service)
}
