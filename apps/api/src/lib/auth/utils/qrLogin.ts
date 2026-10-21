// SPDX-License-Identifier: 0BSD
import { createCache } from '@functions/cache'

export interface PendingQRSession {
  sessionId: string
  browserInfo: string
  status: 'pending' | 'approved'
  accessToken: string
  refreshToken: string
  userId: string
}
export const QR_SESSION_SECONDS = 300
export const sessions = createCache<PendingQRSession>('qr-sessions-auth', {
  stdTTL: QR_SESSION_SECONDS
})
