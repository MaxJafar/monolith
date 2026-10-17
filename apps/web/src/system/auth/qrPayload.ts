/** Decode only the versioned pairing payload; the server still authorizes its session. */
export function readQRLoginPayload(text: string): { sessionId: string } | null {
  if (text.length > 4096) return null

  try {
    const value: unknown = JSON.parse(text)

    if (!value || typeof value !== 'object') return null
    if (!('type' in value) || value.type !== 'monolith-qr-login') return null
    if (!('v' in value) || value.v !== 1) return null
    if (!('sessionId' in value) || typeof value.sessionId !== 'string')
      return null
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.sessionId))
      return null

    return { sessionId: value.sessionId }
  } catch {
    return null
  }
}
