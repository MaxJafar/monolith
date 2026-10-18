const storageKey = 'monolith-qr-login-session'

export interface QRSession {
  sessionId: string
  qrData: string
  expiresAt: string
}

function valid(value: unknown): value is QRSession {
  if (!value || typeof value !== 'object') return false

  const session = value as Partial<QRSession>

  if (
    typeof session.sessionId !== 'string' ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(session.sessionId)
  )
    return false
  if (
    typeof session.expiresAt !== 'string' ||
    !(Date.parse(session.expiresAt) > Date.now())
  )
    return false
  if (typeof session.qrData !== 'string') return false

  try {
    const data: unknown = JSON.parse(session.qrData)

    return Boolean(
      data &&
      typeof data === 'object' &&
      'type' in data &&
      data.type === 'monolith-qr-login' &&
      'v' in data &&
      data.v === 1 &&
      'sessionId' in data &&
      data.sessionId === session.sessionId
    )
  } catch {
    return false
  }
}

export function clearStoredSession() {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    /* Browser storage may be disabled. */
  }
}

export function getStoredSession(): QRSession | null {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(storageKey) ?? 'null'
    )

    if (valid(value)) return value
  } catch {
    /* Treat unavailable or malformed storage as a new session. */
  }
  clearStoredSession()

  return null
}

export function storeSession(session: QRSession) {
  if (!valid(session)) throw new Error('Invalid QR sign-in session')

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(session))
  } catch {
    /* Sign-in can continue in memory. */
  }
}
