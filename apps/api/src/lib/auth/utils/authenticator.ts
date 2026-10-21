// SPDX-License-Identifier: 0BSD
import { decrypt, encrypt } from '@functions/auth/encryption'
import speakeasy from 'speakeasy'

function encryptionKey(): string {
  const key = process.env.MASTER_KEY
  if (!key) throw new Error('MASTER_KEY is required for authenticator settings')
  return key
}
export function createAuthenticator(email: string) {
  const secret = speakeasy.generateSecret({ length: 32 }).base32
  const parameters = new URLSearchParams({ secret, issuer: 'Monolith' })
  return {
    secret,
    link:
      'otpauth://totp/' +
      encodeURIComponent(email) +
      '?' +
      parameters.toString()
  }
}
export function acceptsCode(secret: string, token: string): boolean {
  return (
    /^\d{6}$/.test(token) &&
    speakeasy.totp.verify({ secret, token, encoding: 'base32', window: 1 })
  )
}
export function sealAuthenticator(secret: string): string {
  return encrypt(Buffer.from(secret, 'utf8'), encryptionKey()).toString(
    'base64'
  )
}
export function openAuthenticator(value: string): string {
  return decrypt(Buffer.from(value, 'base64'), encryptionKey()).toString('utf8')
}
