// SPDX-License-Identifier: 0BSD
/// <reference types="node" />
import {
  type KeyObject,
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes
} from 'node:crypto'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  clearServerPublicKey,
  createEncryptionSession,
  decrypt,
  decryptResponse,
  encrypt,
  encryptRequest,
  hasServerPublicKey,
  initializeEncryption,
  isEncryptedResponse,
  setServerPublicKey
} from './encryption'

const network = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('../desktop/runtime', () => ({ applicationFetch: network.fetch }))
let server: { publicKey: KeyObject; privateKey: KeyObject }
let other: typeof server
const publicPem = (pair: typeof server) =>
  pair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
beforeAll(() => {
  server = generateKeyPairSync('rsa', { modulusLength: 2048 })
  other = generateKeyPairSync('rsa', { modulusLength: 2048 })
})
beforeEach(() => {
  clearServerPublicKey()
  network.fetch.mockReset()
})
afterEach(() => {
  clearServerPublicKey()
})

describe('encrypted request interoperability', () => {
  it('produces a request decryptable with the server RSA/AES parameters', async () => {
    await setServerPublicKey(publicPem(server))
    const { payload } = await encryptRequest({ title: 'Monolith ✓', count: 0 })
    const key = privateDecrypt(
      {
        key: server.privateKey,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(payload.k, 'base64')
    )
    expect(key.length).toBe(32)
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'base64')
    )
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final()
    ]).toString()
    expect(JSON.parse(decoded)).toEqual({ title: 'Monolith ✓', count: 0 })
  })
  it('reads a server response and rejects tag tampering and invalid nonce lengths', async () => {
    await setServerPublicKey(publicPem(server))
    const { session } = await createEncryptionSession()
    const iv = randomBytes(12)
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(session.aesKeyRaw),
      iv
    )
    const data = Buffer.concat([
      cipher.update('{"saved":true}'),
      cipher.final()
    ])
    const packet = {
      iv: iv.toString('base64'),
      data: data.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    }
    expect(await decryptResponse(packet, session)).toEqual({ saved: true })
    const altered = Buffer.from(packet.tag, 'base64')
    altered[0] = altered[0]! ^ 1
    await expect(
      decryptResponse({ ...packet, tag: altered.toString('base64') }, session)
    ).rejects.toThrow()
    await expect(
      decryptResponse({ ...packet, iv: 'AA==' }, session)
    ).rejects.toThrow('Invalid encrypted response')
    expect(isEncryptedResponse(packet)).toBe(true)
    expect(isEncryptedResponse({ data: '', iv: null, tag: '' })).toBe(false)
  })
  it('deduplicates concurrent key fetches and keeps different servers isolated', async () => {
    network.fetch.mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify({
            data: publicPem(url.includes('second') ? other : server)
          })
        )
    )
    await Promise.all([
      initializeEncryption('https://first.invalid/'),
      initializeEncryption('https://first.invalid')
    ])
    expect(network.fetch).toHaveBeenCalledTimes(1)
    await initializeEncryption('https://second.invalid')
    const one = await createEncryptionSession('https://first.invalid')
    const two = await createEncryptionSession('https://second.invalid')
    expect(
      privateDecrypt(
        { key: server.privateKey, oaepHash: 'sha256' },
        Buffer.from(one.encryptedKey, 'base64')
      ).length
    ).toBe(32)
    expect(
      privateDecrypt(
        { key: other.privateKey, oaepHash: 'sha256' },
        Buffer.from(two.encryptedKey, 'base64')
      ).length
    ).toBe(32)
    expect(network.fetch).toHaveBeenCalledTimes(2)
  })
  it('does not repopulate cleared keys when an old request finishes', async () => {
    let finish!: (response: Response) => void
    network.fetch.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const request = initializeEncryption('https://example.invalid')
    clearServerPublicKey()
    finish(new Response(JSON.stringify(publicPem(server))))
    await request
    expect(hasServerPublicKey()).toBe(false)
    await expect(createEncryptionSession()).rejects.toThrow(
      'Server public key not set'
    )
  })
  it('allows key rotation and retries fetching after a failed attempt', async () => {
    network.fetch.mockResolvedValueOnce(new Response('', { status: 503 }))
    await expect(
      initializeEncryption('https://example.invalid')
    ).rejects.toThrow('503')
    network.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: publicPem(server) }))
    )
    await initializeEncryption('https://example.invalid')
    network.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: publicPem(other) }))
    )
    await initializeEncryption('https://example.invalid')
    const { encryptedKey } = await createEncryptionSession(
      'https://example.invalid'
    )
    expect(
      privateDecrypt(
        { key: other.privateKey, oaepHash: 'sha256' },
        Buffer.from(encryptedKey, 'base64')
      ).length
    ).toBe(32)
  })
  it('retains stored CryptoJS passphrase data compatibility', () => {
    const encrypted = encrypt('Personal note ✓', 'fixture-passphrase')
    expect(encrypted.startsWith('U2FsdGVkX1')).toBe(true)
    expect(decrypt(encrypted, 'fixture-passphrase')).toBe('Personal note ✓')
  })
})
