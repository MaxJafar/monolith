import CryptoJS from 'crypto-js'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync
} from 'node:crypto'

const marker = Buffer.from('monolith:sealed:1\0')
const textPrefix = 'monolith:sealed:1:'

/** New persisted secrets use a versioned authenticated envelope. */
export function encrypt(data: Buffer, secret: string): Buffer {
  const salt = randomBytes(16)
  const nonce = randomBytes(12)
  const key = scryptSync(secret, salt, 32)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(marker)
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([marker, salt, nonce, cipher.getAuthTag(), ciphertext])
}

export function decrypt(data: Buffer, secret: string): Buffer {
  if (data.subarray(0, marker.length).equals(marker)) {
    const offset = marker.length
    if (data.length < offset + 44)
      throw new Error('Incomplete encrypted secret')
    const key = scryptSync(secret, data.subarray(offset, offset + 16), 32)
    const cipher = createDecipheriv(
      'aes-256-gcm',
      key,
      data.subarray(offset + 16, offset + 28)
    )
    cipher.setAAD(marker)
    cipher.setAuthTag(data.subarray(offset + 28, offset + 44))
    return Buffer.concat([
      cipher.update(data.subarray(offset + 44)),
      cipher.final()
    ])
  }
  // Read installed data using its original on-disk format; all new writes use the envelope above.
  if (data.length < 16) throw new Error('Incomplete encrypted secret')
  const key = createHash('sha256').update(secret).digest('base64').slice(0, 32)
  const reader = createDecipheriv('aes-256-ctr', key, data.subarray(0, 16))
  return Buffer.concat([reader.update(data.subarray(16)), reader.final()])
}

export function encrypt2(value: string, secret: string): string {
  return (
    textPrefix + encrypt(Buffer.from(value, 'utf8'), secret).toString('base64')
  )
}
export function decrypt2(value: string, secret: string): string {
  return value.startsWith(textPrefix)
    ? decrypt(
        Buffer.from(value.slice(textPrefix.length), 'base64'),
        secret
      ).toString('utf8')
    : CryptoJS.AES.decrypt(value, secret).toString(CryptoJS.enc.Utf8)
}
