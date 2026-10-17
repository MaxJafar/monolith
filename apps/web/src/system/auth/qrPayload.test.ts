import { describe, expect, it } from 'vitest'

import { readQRLoginPayload } from './qrPayload'

const sessionId = 'c807536b-4dd1-4cd0-a47f-d132d75be5df'
const valid = { type: 'monolith-qr-login', v: 1, sessionId }

describe('device approval payload', () => {
  it('returns only a validated version-one session identifier', () => {
    expect(
      readQRLoginPayload(
        JSON.stringify({ ...valid, accessToken: 'not-trusted' })
      )
    ).toEqual({ sessionId })
  })
  it('rejects malformed, oversized and differently typed data before requesting approval', () => {
    for (const value of [
      null,
      [],
      {},
      { ...valid, v: 2 },
      { ...valid, type: 'other' },
      { ...valid, sessionId: {} },
      { ...valid, sessionId: 'anything' }
    ]) {
      expect(readQRLoginPayload(JSON.stringify(value))).toBeNull()
    }
    expect(readQRLoginPayload('{')).toBeNull()
    expect(
      readQRLoginPayload(' '.repeat(4097) + JSON.stringify(valid))
    ).toBeNull()
  })
})
