// SPDX-License-Identifier: 0BSD
import CryptoJS from 'crypto-js'

import { applicationFetch } from '../desktop/runtime'
import { fromBase64, toBase64 } from './wireBytes'

// Stored add-on passphrases use CryptoJS's published OpenSSL-compatible format.
export function encrypt(text: string, key: string): string {
  return String(CryptoJS.AES.encrypt(text, key))
}
export function decrypt(text: string, key: string): string {
  return CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(text, key))
}
export type EncryptedResponse = { data: string; iv: string; tag: string }
export type EncryptedPayload = EncryptedResponse & { k: string }
export type EncryptionConfig = {
  rsaKeySize: number
  aesAlgorithm: string
  aesKeyLength: number
  ivLength: number
  authTagLength: number
}
export type EncryptionSession = { aesKey: CryptoKey; aesKeyRaw: ArrayBuffer }

type ServerEntry = { key?: CryptoKey; loading?: Promise<void> }
const servers = new Map<string, ServerEntry>()
let activeKey: CryptoKey | undefined
let selection = 0
const address = (host: string) => host.replace(/\/+$/, '')

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .split(/\r?\n/)
    .filter(line => !line.startsWith('-----'))
    .join('')
    .replace(/\s/g, '')
  return crypto.subtle.importKey(
    'spki',
    fromBase64(body),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

export async function setServerPublicKey(pem: string): Promise<void> {
  const ticket = ++selection
  const imported = await importPublicKey(pem)
  if (selection === ticket) activeKey = imported
}
export const hasServerPublicKey = (): boolean => activeKey !== undefined
export function clearServerPublicKey(): void {
  selection += 1
  activeKey = undefined
  servers.clear()
}

export function initializeEncryption(apiHost: string): Promise<void> {
  const host = address(apiHost)
  const previous = servers.get(host)
  if (previous?.loading) return previous.loading
  const entry: ServerEntry = { key: previous?.key }
  const ticket = ++selection
  servers.set(host, entry)
  entry.loading = (async () => {
    const response = await applicationFetch(host + '/encryptionPublicKey', {
      method: 'GET',
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok)
      throw new Error('Failed to fetch public key: ' + response.status)
    const result: unknown = await response.json()
    const pem =
      typeof result === 'string'
        ? result
        : result && typeof result === 'object' && 'data' in result
          ? result.data
          : null
    if (typeof pem !== 'string' || !pem.trim())
      throw new Error('No public key in response')
    const imported = await importPublicKey(pem)
    if (servers.get(host) !== entry) return
    entry.key = imported
    if (ticket === selection) activeKey = imported
  })().finally(() => {
    entry.loading = undefined
  })
  return entry.loading
}

export async function createEncryptionSession(
  apiHost?: string
): Promise<{ encryptedKey: string; session: EncryptionSession }> {
  let publicKey = activeKey
  if (apiHost !== undefined) {
    const host = address(apiHost)
    if (!servers.get(host)?.key) await initializeEncryption(host)
    publicKey = servers.get(host)?.key
  }
  if (!publicKey)
    throw new Error(
      'Server public key not set. Call setServerPublicKey() first.'
    )
  // Algorithm parameters and field sizes are the existing server wire protocol.
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    aesKeyRaw
  )
  return {
    encryptedKey: toBase64(new Uint8Array(wrapped)),
    session: { aesKey, aesKeyRaw }
  }
}

export async function encryptRequest<T>(
  value: T,
  apiHost?: string
): Promise<{ payload: EncryptedPayload; session: EncryptionSession }> {
  const { session, encryptedKey } = await createEncryptionSession(apiHost)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value ?? null))
  const packet = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      session.aesKey,
      plaintext
    )
  )
  const boundary = packet.byteLength - 16
  return {
    session,
    payload: {
      k: encryptedKey,
      iv: toBase64(iv),
      data: toBase64(packet.slice(0, boundary)),
      tag: toBase64(packet.slice(boundary))
    }
  }
}

export async function decryptResponse<T>(
  packet: EncryptedResponse,
  session: EncryptionSession
): Promise<T> {
  const iv = fromBase64(packet.iv)
  const tag = fromBase64(packet.tag)
  if (iv.byteLength !== 12 || tag.byteLength !== 16)
    throw new Error('Invalid encrypted response')
  const body = fromBase64(packet.data)
  const authenticated = Uint8Array.from([...body, ...tag])
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    session.aesKey,
    authenticated
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

export function isEncryptedResponse(
  value: unknown
): value is EncryptedResponse {
  if (!value || typeof value !== 'object') return false
  const fields = value as Partial<EncryptedResponse>
  return (
    typeof fields.iv === 'string' &&
    typeof fields.tag === 'string' &&
    typeof fields.data === 'string'
  )
}
