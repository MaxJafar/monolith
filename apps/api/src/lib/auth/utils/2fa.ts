// SPDX-License-Identifier: 0BSD
import { createCache } from '@functions/cache'
import { randomUUID } from 'node:crypto'

const challengeLifetime = { stdTTL: 5 * 60 }
export const pendingTOTPSetups = createCache<{
  secret: string
  userId: string
}>('totp-setups', challengeLifetime)
export const pending2FASessions = createCache<{ userId: string }>(
  '2fa-sessions',
  challengeLifetime
)

export async function create2FASession(userId: string): Promise<string> {
  const id = randomUUID()
  pending2FASessions.set(id, { userId })
  return id
}
