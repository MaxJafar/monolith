import CryptoJS from 'crypto-js'

import { applicationFetch } from '../desktop/runtime'

// Passphrase adapters remain for addon data that uses the dependency's format.
export const encrypt = (text: string, key: string): string =>
  CryptoJS.AES.encrypt(text, key).toString()
export const decrypt = (text: string, key: string): string =>
  CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8)

export type EncryptedResponse = { iv: string; data: string; tag: string }
export type EncryptedPayload = EncryptedResponse & { k: string }
export type EncryptionConfig = {
  rsaKeySize: number
  aesAlgorithm: string
  aesKeyLength: number
  ivLength: number
  authTagLength: number
}
export type EncryptionSession = { aesKey: CryptoKey; aesKeyRaw: ArrayBuffer }

type Authority = { pem: string; key: CryptoKey }
const authorities = new Map<string, Authority>()
const pending = new Map<string, Promise<void>>()
let selected: Authority | undefined
let generation = 0

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0))
}
function encode(bytes: Uint8Array): string {
  let text = ''
  for (let offset = 0; offset < bytes.length; offset += 8192)
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(text)
}
async function authority(pem: string): Promise<Authority> {
  if (selected?.pem === pem) return selected
  const der = decode(pem.replace(/-----[A-Z ]+-----|\s/g, ''))
  const key = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
  return { pem, key }
}

export async function setServerPublicKey(pem: string): Promise<void> {
  const request = ++generation
  const next = await authority(pem)
  if (generation === request) selected = next
}
export function hasServerPublicKey(): boolean {
  return selected !== undefined
}
export function clearServerPublicKey(): void {
  generation++
  selected = undefined
  authorities.clear()
  pending.clear()
}

/** Refreshes one server's key; concurrent refreshes for that server share one request. */
export async function initializeEncryption(apiHost: string): Promise<void> {
  if (pending.has(apiHost)) return pending.get(apiHost)!
  const request = ++generation
  let loading!: Promise<void>
  loading = (async () => {
    const response = await applicationFetch(
      apiHost.replace(/\/$/, '') + '/encryptionPublicKey',
      { method: 'GET' }
    )
    if (!response.ok)
      throw new Error('Failed to fetch public key: ' + response.status)
    const data = await response.json()
    const pem: unknown = typeof data === 'string' ? data : data?.data
    if (typeof pem !== 'string' || !pem)
      throw new Error('No public key in response')
    const next = await authority(pem)
    if (pending.get(apiHost) !== loading) return
    authorities.set(apiHost, next)
    if (generation === request) selected = next
  })()
  pending.set(apiHost, loading)
  try {
    await loading
  } finally {
    if (pending.get(apiHost) === loading) pending.delete(apiHost)
  }
}

export async function createEncryptionSession(
  apiHost?: string
): Promise<{ encryptedKey: string; session: EncryptionSession }> {
  if (apiHost !== undefined && !authorities.has(apiHost))
    await initializeEncryption(apiHost)
  const server = apiHost === undefined ? selected : authorities.get(apiHost)
  if (!server)
    throw new Error(
      'Server public key not set. Call setServerPublicKey() first.'
    )
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const aesKeyRaw = await crypto.subtle.exportKey('raw', aesKey)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    server.key,
    aesKeyRaw
  )
  return {
    encryptedKey: encode(new Uint8Array(wrapped)),
    session: { aesKey, aesKeyRaw }
  }
}

export async function encryptRequest<T>(
  value: T,
  apiHost?: string
): Promise<{ payload: EncryptedPayload; session: EncryptionSession }> {
  const { encryptedKey, session } = await createEncryptionSession(apiHost)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      session.aesKey,
      new TextEncoder().encode(JSON.stringify(value ?? null))
    )
  )
  return {
    session,
    payload: {
      k: encryptedKey,
      iv: encode(nonce),
      data: encode(sealed.subarray(0, -16)),
      tag: encode(sealed.subarray(-16))
    }
  }
}

export async function decryptResponse<T>(
  message: EncryptedResponse,
  session: EncryptionSession
): Promise<T> {
  const data = decode(message.data),
    tag = decode(message.tag),
    nonce = decode(message.iv)
  if (nonce.length !== 12 || tag.length !== 16)
    throw new Error('Invalid encrypted response')
  const sealed = new Uint8Array(data.length + tag.length)
  sealed.set(data)
  sealed.set(tag, data.length)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    session.aesKey,
    sealed
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

export function isEncryptedResponse(
  value: unknown
): value is EncryptedResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    ['iv', 'data', 'tag'].every(
      field => typeof (value as Record<string, unknown>)[field] === 'string'
    )
  )
}
