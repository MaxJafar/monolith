import cors from 'cors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { configMock } = vi.hoisted(() => ({ configMock: vi.fn() }))

vi.mock('dotenv', () => ({ default: { config: configMock } }))
vi.mock('@functions/logging', () => ({
  coreLogger: { info: vi.fn(), warn: vi.fn() }
}))

describe('API startup environment dependencies', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('PORT', undefined)
    vi.stubEnv('CORS_ALLOWED_ORIGINS', undefined)
    configMock.mockReset()
    configMock.mockImplementation(() => {
      vi.stubEnv('PORT', '4873')
      vi.stubEnv(
        'CORS_ALLOWED_ORIGINS',
        ' http://localhost:5173, https://zillion.example, , '
      )

      return { parsed: { PORT: '4873' } }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads the configured port before a direct constants import captures it', async () => {
    const { PORT } = await import('../core/constants')

    expect(PORT).toBe('4873')
    expect(configMock).toHaveBeenCalledExactlyOnceWith({
      path: expect.stringMatching(/env[\\/]\.env\.local$/),
      quiet: true
    })
  })

  it('loads and normalizes allowed origins before a direct CORS constants import', async () => {
    const { CORS_ALLOWED_ORIGINS } =
      await import('../core/routes/constants/corsAllowedOrigins')

    expect(CORS_ALLOWED_ORIGINS).toEqual([
      'http://localhost:5173',
      'https://zillion.example'
    ])
    expect(configMock).toHaveBeenCalledTimes(1)
  })

  it('returns allowed-origin headers for the public-key GET and preflight and excludes other origins', async () => {
    const { CORS_ALLOWED_ORIGINS } =
      await import('../core/routes/constants/corsAllowedOrigins')
    const app = express()
    app.use(cors({ origin: CORS_ALLOWED_ORIGINS, credentials: true }))
    app.get('/encryptionPublicKey', (_req, res) => {
      res.json({ status: 'success', data: 'Test public key' })
    })
    const server = app.listen(0, '127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/encryptionPublicKey`

    try {
      const key = await fetch(url, {
        headers: { Origin: 'http://localhost:5173' }
      })
      expect(key.status).toBe(200)
      expect(key.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:5173'
      )
      expect(key.headers.get('access-control-allow-credentials')).toBe('true')
      expect(await key.json()).toMatchObject({ data: 'Test public key' })

      const preflight = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type'
        }
      })
      expect(preflight.status).toBe(204)
      expect(preflight.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:5173'
      )
      expect(preflight.headers.get('access-control-allow-headers')).toBe(
        'content-type'
      )

      const denied = await fetch(url, {
        headers: { Origin: 'https://unlisted.example' }
      })
      expect(denied.headers.get('access-control-allow-origin')).toBeNull()
      await denied.text()
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()))
      })
    }
  })
})
