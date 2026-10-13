import ipaddr from 'ipaddr.js'
import { createECDH, createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { Agent, request } from 'node:https'
import { isIP } from 'node:net'
import webPush from 'web-push'

import { ClientError } from '@lifeforge/server-utils'

import { type PushPayload, pushPayloadSchema } from '../pushShared'

export type VapidConfig = {
  publicKey: string
  privateKey: string
  subject: string
}

export type BrowserSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export type ResolvedAddress = { address: string; family: number }

export type PushResolver = (hostname: string) => Promise<ResolvedAddress[]>

export type PushSender = (
  subscription: BrowserSubscription,
  payload: PushPayload,
  config: VapidConfig,
  ttl: number
) => Promise<void>

export class PushDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = false,
    public readonly gone = false
  ) {
    super(code)
  }
}

export const endpointHash = (endpoint: string) =>
  createHash('sha256').update(endpoint).digest('hex')

function decodeKey(value: string, size: number) {
  const decoded = Buffer.from(value, 'base64url')

  if (
    !/^[A-Za-z0-9_-]+$/.test(value) ||
    decoded.length !== size ||
    decoded.toString('base64url') !== value
  )
    throw new ClientError('Invalid Web Push encryption key')

  return decoded
}

export function validateSubscriptionKeys(keys: BrowserSubscription['keys']) {
  const point = decodeKey(keys.p256dh, 65)
  decodeKey(keys.auth, 16)

  try {
    const curve = createECDH('prime256v1')
    curve.generateKeys()
    curve.computeSecret(point)
  } catch {
    throw new ClientError('Invalid Web Push public key')
  }
}

export function readVapidConfig(
  env: NodeJS.ProcessEnv = process.env
): VapidConfig | null {
  const publicKey = env.ZILLION_GYM_PUSH_PUBLIC_KEY
  const privateKey = env.ZILLION_GYM_PUSH_PRIVATE_KEY
  const subject = env.ZILLION_GYM_PUSH_SUBJECT

  if (!publicKey || !privateKey || !subject) return null

  try {
    const publicBytes = decodeKey(publicKey, 65)
    const privateBytes = decodeKey(privateKey, 32)
    const curve = createECDH('prime256v1')
    curve.setPrivateKey(privateBytes)
    if (!curve.getPublicKey().equals(publicBytes)) return null

    const contact = new URL(subject)

    if (contact.protocol === 'mailto:') {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.pathname) ||
        contact.search ||
        contact.hash
      )
        return null
    } else if (contact.protocol === 'https:') validateEndpoint(subject, false)
    else return null

    return { publicKey, privateKey, subject }
  } catch {
    return null
  }
}

export function isPublicAddress(address: string) {
  try {
    const normalized = ipaddr.process(address)

    if (normalized.range() !== 'unicast') return false
    // IPv6 transition mechanisms may route embedded private IPv4 addresses.
    if (
      normalized.kind() === 'ipv6' &&
      !normalized.match(ipaddr.parse('2000::'), 3)
    )
      return false

    return true
  } catch {
    return false
  }
}

export function validateEndpoint(
  endpoint: string,
  requireResource = true
): URL {
  let url: URL

  try {
    url = new URL(endpoint)
  } catch {
    throw new ClientError('Invalid push endpoint')
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (
    endpoint.length > 2048 ||
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash ||
    !url.pathname ||
    (requireResource && url.pathname === '/') ||
    host.endsWith('.') ||
    !host.includes('.') ||
    /(^|\.)(localhost|local|internal|test|invalid|example|home|lan)$/.test(
      host
    ) ||
    (isIP(host) !== 0 && !isPublicAddress(host))
  )
    throw new ClientError(
      'Push endpoint must use a public HTTPS service on port 443'
    )

  return url
}

const defaultResolver: PushResolver = hostname =>
  lookup(hostname, { all: true, verbatim: true })

export async function resolvePushEndpoint(
  endpoint: string,
  resolver: PushResolver = defaultResolver
) {
  const url = validateEndpoint(endpoint)

  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const addresses = await Promise.race([
      resolver(url.hostname),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new PushDeliveryError('dns_timeout', true)),
          5000
        )
      })
    ])

    if (
      !addresses.length ||
      addresses.some(
        item =>
          ![4, 6].includes(item.family) ||
          isIP(item.address) !== item.family ||
          !isPublicAddress(item.address)
      )
    )
      throw new ClientError('Push endpoint resolves to a non-public network')

    return { url, address: addresses[0]! }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function encryptedPushRequest(
  subscription: BrowserSubscription,
  payload: PushPayload,
  config: VapidConfig,
  ttl: number
) {
  validateEndpoint(subscription.endpoint)
  validateSubscriptionKeys(subscription.keys)

  return webPush.generateRequestDetails(
    subscription,
    JSON.stringify(pushPayloadSchema.parse(payload)),
    {
      vapidDetails: config,
      contentEncoding: 'aes128gcm',
      TTL: Math.max(0, Math.min(3600, Math.floor(ttl))),
      urgency: 'high'
    }
  )
}

export function classifyPushStatus(status: number) {
  if (status >= 200 && status < 300) return null
  if (status === 404 || status === 410)
    return new PushDeliveryError('subscription_expired', false, true)
  if (status >= 300 && status < 400)
    return new PushDeliveryError('redirect_rejected')
  if (status === 429 || status >= 500)
    return new PushDeliveryError(`provider_${status}`, true)

  return new PushDeliveryError(`provider_${status}`)
}

export function createPushSender(
  resolver: PushResolver = defaultResolver,
  sendRequest: typeof request = request
): PushSender {
  return async (subscription, payload, config, ttl) => {
    let resolved: Awaited<ReturnType<typeof resolvePushEndpoint>>

    try {
      resolved = await resolvePushEndpoint(subscription.endpoint, resolver)
    } catch (error) {
      if (error instanceof PushDeliveryError) throw error
      throw new PushDeliveryError(
        error instanceof ClientError ? 'endpoint_rejected' : 'dns_failed',
        !(error instanceof ClientError)
      )
    }

    const details = encryptedPushRequest(subscription, payload, config, ttl)
    // DNS is resolved again for every send, then this exact public address is pinned
    // for the connection; TLS still verifies the original service hostname.
    const agent = new Agent({
      keepAlive: false,
      lookup: (_hostname, _options, callback) =>
        callback(null, resolved.address.address, resolved.address.family)
    })

    try {
      await new Promise<void>((resolve, reject) => {
        const outgoing = sendRequest(
          resolved.url,
          {
            method: 'POST',
            headers: details.headers,
            agent,
            family: resolved.address.family,
            servername: resolved.url.hostname,
            timeout: 10000
          },
          incoming => {
            incoming.resume()
            const error = classifyPushStatus(incoming.statusCode ?? 502)

            if (error) reject(error)
            else resolve()
          }
        )
        const timer = setTimeout(
          () => outgoing.destroy(new PushDeliveryError('send_timeout', true)),
          10000
        )
        outgoing.once('close', () => clearTimeout(timer))
        outgoing.once('error', error =>
          reject(
            error instanceof PushDeliveryError
              ? error
              : new PushDeliveryError('network_failed', true)
          )
        )
        outgoing.once('timeout', () =>
          outgoing.destroy(new PushDeliveryError('send_timeout', true))
        )
        outgoing.end(details.body)
      })
    } finally {
      agent.destroy()
    }
  }
}
