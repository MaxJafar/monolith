// SPDX-License-Identifier: 0BSD
import { type EndpointClient, encrypt } from '@monolith/api'

const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function generateVaultPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, byte => alphabet[byte & 63]).join('')
}

export function passwordIssue(password: string, confirmation: string) {
  if (!password.trim() || !confirmation.trim()) return 'empty'
  return password === confirmation ? null : 'mismatch'
}

export async function protectPassword(
  password: string,
  challenge: EndpointClient
) {
  const value: unknown = await challenge.query()
  if (typeof value !== 'string' || !value)
    throw new Error('Missing password challenge')
  return { password: encrypt(password, value) }
}
