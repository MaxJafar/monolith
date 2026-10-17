import { afterEach, expect, it, vi } from 'vitest'

import {
  clearStoredSession,
  getStoredSession,
  storeSession
} from './QRSessionMngr'

const id = 'cf8e7ca3-7135-4f4b-9a07-ac49dc1f0400'
const session = () => ({
  sessionId: id,
  qrData: JSON.stringify({ type: 'monolith-qr-login', v: 1, sessionId: id }),
  expiresAt: new Date(Date.now() + 60_000).toISOString()
})
afterEach(() => vi.unstubAllGlobals())

it('round-trips only valid unexpired sessions and discards malformed storage', () => {
  const entries = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => entries.get(key),
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key)
  })
  const value = session()
  storeSession(value)
  expect(getStoredSession()).toEqual(value)
  entries.set(
    'monolith-qr-login-session',
    JSON.stringify({ ...value, expiresAt: 'invalid' })
  )
  expect(getStoredSession()).toBeNull()
  expect(entries.size).toBe(0)
  expect(() => storeSession({ ...value, qrData: '{}' })).toThrow('Invalid')
})

it('continues without persistent storage when the browser denies it', () => {
  vi.stubGlobal('sessionStorage', {
    getItem() {
      throw new Error('denied')
    },
    setItem() {
      throw new Error('denied')
    },
    removeItem() {
      throw new Error('denied')
    }
  })
  expect(getStoredSession()).toBeNull()
  expect(() => storeSession(session())).not.toThrow()
  expect(() => clearStoredSession()).not.toThrow()
})
