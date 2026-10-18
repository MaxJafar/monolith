import ipaddr from 'ipaddr.js'
import type { LookupAddress } from 'node:dns'
import { lookup } from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'

import type { HTTPAction } from './engine'

export function isPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) return false
  let parsed = ipaddr.parse(address)
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress())
    parsed = (parsed as ipaddr.IPv6).toIPv4Address()
  return parsed.range() === 'unicast'
}

/** Resolve once and pin the socket to a public address; never follow redirects. */
export const requestHTTP: HTTPAction = async (config, parentSignal) => {
  const url = new URL(String(config.url))
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error('Only public HTTP(S) URLs without credentials are supported')
  if (url.port && !['80', '443'].includes(url.port))
    throw Error('HTTP actions use ports 80 and 443')
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(10000)])
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  signal.throwIfAborted()
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    lookup(hostname, { all: true })
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener('abort', abort)
      })
  })
  signal.throwIfAborted()
  if (
    !addresses.length ||
    addresses.some(address => !isPublicAddress(address.address))
  )
    throw Error(
      'Private, loopback and reserved network destinations are blocked'
    )
  const address = addresses[0]!
  const body =
    config.method === 'POST' ? JSON.stringify(config.body ?? {}) : undefined
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method: String(config.method),
        signal,
        agent: false,
        family: address.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        headers: {
          Accept: 'application/json',
          ...(body
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
              }
            : {})
        }
      },
      response => {
        const status = response.statusCode ?? 0
        if (status < 200 || status >= 300) {
          response.resume()
          reject(
            Error(`HTTP action returned ${status}; redirects are not followed`)
          )
          return
        }
        const chunks: Buffer[] = []
        let bytes = 0
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length
          if (bytes > 100_000) {
            response.destroy(Error('HTTP response exceeds 100 KB'))
            return
          }
          chunks.push(chunk)
        })
        response.on('error', reject)
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            resolve({ status, body: JSON.parse(text) })
          } catch {
            resolve({ status, body: text })
          }
        })
      }
    )
    request.on('error', reject)
    request.end(body)
  })
}
