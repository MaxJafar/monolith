import {
  type KeyObject,
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes
} from 'node:crypto'

import { ClientError } from '@monolith/server-utils'

export type EncryptedResponse = { iv: string; data: string; tag: string }
export type EncryptedPayload = EncryptedResponse & { k: string }

let keypair: { publicKey: KeyObject; privateKey: KeyObject } | undefined
function keys() {
  return (keypair ??= generateKeyPairSync('rsa', { modulusLength: 4096 }))
}

export function ensureKeysExist(): void {
  keys()
}
export function getPublicKey(): string {
  return keys().publicKey.export({ type: 'spki', format: 'pem' }).toString()
}

function bytes(value: string, length?: number): Buffer {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value
    )
  )
    throw new Error('Invalid base64 encoding')
  const decoded = Buffer.from(value, 'base64')
  if (length !== undefined && decoded.length !== length)
    throw new Error('Invalid encrypted field length')
  return decoded
}

export function decryptAESKey(wrapped: string): Buffer {
  const raw = privateDecrypt(
    {
      key: keys().privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    bytes(wrapped)
  )
  if (raw.length !== 32) throw new Error('Expected an AES-256 key')
  return raw
}

export function decryptPayload<T = unknown>(value: unknown): T {
  if (
    !value ||
    typeof value !== 'object' ||
    !['k', 'iv', 'data', 'tag'].every(
      field => typeof (value as Record<string, unknown>)[field] === 'string'
    )
  )
    return value as T
  const message = value as EncryptedPayload
  try {
    const cipher = createDecipheriv(
      'aes-256-gcm',
      decryptAESKey(message.k),
      bytes(message.iv, 12),
      { authTagLength: 16 }
    )
    cipher.setAuthTag(bytes(message.tag, 16))
    const plaintext = Buffer.concat([
      cipher.update(bytes(message.data)),
      cipher.final()
    ])
    return JSON.parse(plaintext.toString('utf8')) as T
  } catch {
    throw new ClientError('Failed to decrypt payload', 400)
  }
}

export function encryptResponse(
  value: unknown,
  key: Buffer
): EncryptedResponse {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce, {
    authTagLength: 16
  })
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value ?? null), 'utf8'),
    cipher.final()
  ])
  return {
    iv: nonce.toString('base64'),
    data: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  }
}
