import { createECDH, randomBytes, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { type RequestOptions, request as httpsRequest } from 'node:https'
import { describe, expect, it, vi } from 'vitest'
import webPush from 'web-push'

import { pushSubscriptionInputSchema } from '../pushShared'
import { startGymPushDispatcher } from './push'
import { civilNow, notificationPayload } from './pushStore'
import {
  classifyPushStatus,
  createPushSender,
  encryptedPushRequest,
  endpointHash,
  isPublicAddress,
  readVapidConfig,
  resolvePushEndpoint,
  validateEndpoint,
  validateSubscriptionKeys
} from './pushTransport'
import type { GymDatabase } from './store'

const vapid = webPush.generateVAPIDKeys()
const config = { ...vapid, subject: 'mailto:notifications@zillion.test' }
const pushOwner = randomUUID()
const curve = createECDH('prime256v1')
curve.generateKeys()
const keys = {
  p256dh: curve.getPublicKey().toString('base64url'),
  auth: randomBytes(16).toString('base64url')
}
const subscription = {
  endpoint: 'https://push.example.com/send/device-opaque-token',
  keys
}

describe('native Web Push transport', () => {
  it('requires a matching configured VAPID pair without exposing invalid secrets', () => {
    const env = {
      ZILLION_GYM_PUSH_PUBLIC_KEY: config.publicKey,
      ZILLION_GYM_PUSH_PRIVATE_KEY: config.privateKey,
      ZILLION_GYM_PUSH_SUBJECT: config.subject
    }
    expect(readVapidConfig(env)).toEqual(config)
    expect(readVapidConfig({})).toBeNull()
    expect(
      readVapidConfig({
        ...env,
        ZILLION_GYM_PUSH_PRIVATE_KEY: webPush.generateVAPIDKeys().privateKey
      })
    ).toBeNull()
    expect(
      readVapidConfig({ ...env, ZILLION_GYM_PUSH_SUBJECT: 'http://localhost' })
    ).toBeNull()
  })
  it.each([
    '127.0.0.1',
    '0.0.0.0',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.2',
    '169.254.169.254',
    '100.64.1.2',
    '198.18.0.1',
    '192.0.2.1',
    '198.51.100.2',
    '203.0.113.3',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fdff::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
    '2002:7f00:1::1',
    '64:ff9b::a00:1'
  ])('rejects non-public address %s', address => {
    expect(isPublicAddress(address)).toBe(false)
  })
  it('permits globally routed IPv4/IPv6 and denies unsafe URL schemes/credentials/ports', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true)
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true)
    for (const endpoint of [
      'http://push.example.com/send/x',
      'https://localhost/send/x',
      'https://push.local/send/x',
      'https://127.0.0.1/send/x',
      'https://2130706433/send/x',
      'https://[::1]/send/x',
      'https://push.example.com:8443/send/x',
      'https://name:secret@push.example.com/send/x',
      'https://push.example.com/send/x#fragment'
    ])
      expect(() => validateEndpoint(endpoint)).toThrow()
    expect(validateEndpoint(subscription.endpoint).protocol).toBe('https:')
  })
  it('validates every DNS answer and rechecks changed answers rather than trusting a prior resolution', async () => {
    const resolver = vi
      .fn()
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.1', family: 4 }
      ])
    expect(
      (await resolvePushEndpoint(subscription.endpoint, resolver)).address
        .address
    ).toBe('8.8.8.8')
    await expect(
      resolvePushEndpoint(subscription.endpoint, resolver)
    ).rejects.toThrow('non-public')
    expect(resolver).toHaveBeenCalledTimes(2)
  })
  it('validates canonical subscription encryption keys', () => {
    expect(() => validateSubscriptionKeys(keys)).not.toThrow()
    expect(() =>
      validateSubscriptionKeys({ ...keys, auth: keys.auth + '=' })
    ).toThrow()
    expect(() =>
      validateSubscriptionKeys({
        ...keys,
        p256dh: Buffer.alloc(65).toString('base64url')
      })
    ).toThrow()
    expect(() =>
      pushSubscriptionInputSchema.parse({
        subscription,
        preferences: { planned: true, rest: false, coach: true, unknown: true }
      })
    ).toThrow()
  })
  it('generates AES128GCM encrypted standard Web Push and VAPID headers entirely offline', () => {
    const payload = notificationPayload(
      'test',
      'en',
      'test:' + randomUUID(),
      pushOwner
    )
    const request = encryptedPushRequest(subscription, payload, config, 120)
    expect(request.method).toBe('POST')
    expect(request.headers['Content-Encoding']).toBe('aes128gcm')
    expect(request.headers.Authorization).toMatch(/^vapid /)
    expect(request.headers.TTL).toBe(120)
    expect(Buffer.isBuffer(request.body)).toBe(true)
    expect(request.body.includes(Buffer.from(payload.body))).toBe(false)
    expect(() =>
      encryptedPushRequest(
        subscription,
        { ...payload, url: 'https://evil.test' } as never,
        config,
        120
      )
    ).toThrow()
  })
  it('rejects redirects, removes expired subscriptions, and retries only transient provider errors', () => {
    expect(classifyPushStatus(201)).toBeNull()
    expect(classifyPushStatus(302)).toMatchObject({
      code: 'redirect_rejected',
      retryable: false
    })
    expect(classifyPushStatus(410)).toMatchObject({
      gone: true,
      retryable: false
    })
    expect(classifyPushStatus(429)).toMatchObject({ retryable: true })
    expect(classifyPushStatus(503)).toMatchObject({ retryable: true })
    expect(classifyPushStatus(401)).toMatchObject({ retryable: false })
  })
  it('pins the validated DNS address, verifies the service hostname and never follows a redirect', async () => {
    let captured: RequestOptions | undefined

    const transport = vi.fn(
      (
        url: URL,
        options: RequestOptions,
        listener: (message: IncomingMessage) => void
      ) => {
        captured = options
        expect(url.href).toBe(subscription.endpoint)
        const outgoing = new EventEmitter() as ClientRequest
        outgoing.end = (() => {
          queueMicrotask(() => {
            listener({
              statusCode: 302,
              resume: vi.fn()
            } as unknown as IncomingMessage)
            outgoing.emit('close')
          })

          return outgoing
        }) as ClientRequest['end']

        return outgoing
      }
    )
    const sender = createPushSender(
      async () => [{ address: '8.8.8.8', family: 4 }],
      transport as unknown as typeof httpsRequest
    )
    await expect(
      sender(
        subscription,
        notificationPayload('test', 'en', 'test:offline', pushOwner),
        config,
        60
      )
    ).rejects.toMatchObject({ code: 'redirect_rejected' })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(captured).toMatchObject({
      family: 4,
      servername: 'push.example.com',
      timeout: 10000
    })
    expect(captured?.agent).toBeTruthy()
    const lookup = (captured!.agent as import('node:https').Agent).options
      .lookup!
    await new Promise<void>((resolve, reject) => {
      lookup('push.example.com', {}, (error, address, family) => {
        if (error) reject(error)
        else {
          expect(address).toBe('8.8.8.8')
          expect(family).toBe(4)
          resolve()
        }
      })
    })
  })
  it('uses stable opaque endpoint hashes without returning endpoint credentials', () => {
    expect(endpointHash(subscription.endpoint)).toMatch(/^[a-f0-9]{64}$/)
    expect(endpointHash(subscription.endpoint)).toBe(
      endpointHash(subscription.endpoint)
    )
    expect(endpointHash(subscription.endpoint)).not.toContain(
      'device-opaque-token'
    )
  })
})

describe('Gym notification lifecycle', () => {
  it('uses each owner civil day and clock across daylight savings boundaries', () => {
    expect(
      civilNow(new Date('2026-11-01T05:30:00Z'), 'America/New_York')
    ).toEqual({ date: '2026-11-01', minute: 90 })
    expect(
      civilNow(new Date('2026-11-01T06:30:00Z'), 'America/New_York')
    ).toEqual({ date: '2026-11-01', minute: 90 })
    expect(
      civilNow(new Date('2026-10-12T00:05:00Z'), 'America/New_York')
    ).toEqual({ date: '2026-10-11', minute: 1205 })
    expect(civilNow(new Date('2026-10-12T00:05:00Z'), 'UTC')).toEqual({
      date: '2026-10-12',
      minute: 5
    })
  })
  it('keeps disabled servers inert and supports deterministic stop without leaked timers', async () => {
    const listOwners = vi.fn(async () => [])
    const dispatcher = startGymPushDispatcher({
      db: {} as GymDatabase,
      listOwners,
      config: null,
      runImmediately: false
    })
    expect(await dispatcher.tick()).toMatchObject({
      configured: false,
      owners: 0
    })
    expect(listOwners).not.toHaveBeenCalled()
    await dispatcher.stop()
  })
  it('coalesces concurrent ticks and stops future enumeration', async () => {
    let release!: (owners: string[]) => void

    const listOwners = vi.fn(
      () =>
        new Promise<string[]>(resolve => {
          release = resolve
        })
    )
    const dispatcher = startGymPushDispatcher({
      db: {} as GymDatabase,
      listOwners,
      config,
      runImmediately: false,
      intervalMs: 60000
    })
    const first = dispatcher.tick(),
      second = dispatcher.tick()
    expect(first).toBe(second)
    release([])
    expect(await first).toMatchObject({ configured: true, owners: 0 })
    await dispatcher.stop()
    await dispatcher.tick()
    expect(listOwners).toHaveBeenCalledTimes(1)
  })
  it('localizes native navigation-safe payloads in every supported language', () => {
    for (const language of ['en', 'ms', 'zh-CN', 'zh-TW'] as const)
      for (const kind of ['planned', 'rest', 'coach', 'test'] as const) {
        const payload = notificationPayload(
          kind,
          language,
          kind + ':test',
          pushOwner
        )
        expect(payload.owner_id).toBe(pushOwner)
        expect(payload.title.length).toBeGreaterThan(0)
        expect(payload.body.length).toBeGreaterThan(0)
        expect(payload.url).toMatch(
          /^\/gym\?section=(dashboard|workout|coach)$/
        )
      }
  })
})
