import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestHTTP } from './server/http'

const { lookup, request } = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn()
}))
vi.mock('node:dns/promises', () => ({ lookup }))
vi.mock('node:https', () => ({ default: { request } }))

afterEach(() => {
  vi.clearAllMocks()
})
describe('HTTP action network boundary', () => {
  it('cancels a stalled DNS lookup', async () => {
    lookup.mockReturnValue(new Promise(() => {}))
    const controller = new AbortController()
    const pending = requestHTTP(
      { method: 'GET', url: 'https://example.com' },
      controller.signal
    )
    controller.abort(Error('Cancelled'))
    await expect(pending).rejects.toThrow('Cancelled')
    expect(request).not.toHaveBeenCalled()
  })
  it('rejects a host when any resolved address is private', async () => {
    lookup.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ])
    await expect(
      requestHTTP(
        { method: 'GET', url: 'https://example.com' },
        new AbortController().signal
      )
    ).rejects.toThrow('blocked')
    expect(request).not.toHaveBeenCalled()
  })
  it('pins the resolved address and parses a successful response', async () => {
    lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }])
    request.mockImplementation((_url, options, receive) => {
      expect(options.family).toBe(4)
      options.lookup('example.com', {}, (error: unknown, address: string) => {
        expect(error).toBeNull()
        expect(address).toBe('8.8.8.8')
      })
      const response = Object.assign(new PassThrough(), { statusCode: 200 })
      const req = Object.assign(new EventEmitter(), {
        end: () => {
          receive(response)
          response.end('{"ok":true}')
        }
      })
      return req
    })
    expect(
      await requestHTTP(
        { method: 'GET', url: 'https://example.com' },
        new AbortController().signal
      )
    ).toEqual({ status: 200, body: { ok: true } })
  })
})
