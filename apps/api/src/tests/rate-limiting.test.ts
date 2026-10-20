import express from 'express'
import type { AddressInfo } from 'node:net'
import { expect, it } from 'vitest'

import limiter from '../core/middlewares/rateLimitingMiddleware'

it('keeps session recovery available after expired clients exhaust their polling budget', async () => {
  const app = express()
  app.use(limiter)
  app.use((_req, res) => res.status(204).end())
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const request = async (path: string) => {
    const response = await fetch(origin + path, {
      method: path.startsWith('/auth/') ? 'POST' : 'GET'
    })
    await response.text()
    return response.status
  }
  try {
    for (let batch = 0; batch < 25; batch++)
      expect(
        await Promise.all(
          Array.from({ length: 10 }, () => request('/updates/status'))
        )
      ).toEqual(Array(10).fill(204))
    expect(await request('/rooms/list')).toBe(429)
    expect(await request('/auth/refresh')).toBe(204)
    expect(await request('/auth/login')).toBe(204)
    expect(await request('/encryptionPublicKey')).toBe(204)
    // Authentication remains limited; changing auth paths cannot reset it.
    for (let batch = 0; batch < 24; batch++)
      await Promise.all(
        Array.from({ length: 10 }, () => request('/auth/login'))
      )
    for (let remaining = 0; remaining < 8; remaining++)
      expect(await request('/auth/login')).toBe(204)
    expect(await request('/auth/refresh')).toBe(429)
    expect(await request('/encryptionPublicKey')).toBe(204)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    )
  }
}, 15000)
