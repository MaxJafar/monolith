// SPDX-License-Identifier: 0BSD
import { PassThrough, Writable } from 'node:stream'
import { expect, it, vi } from 'vitest'

import files from '../lib/files'

const storage = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../core/storage', () => ({ storageProvider: storage }))

it('does not open object storage until owner metadata is found', async () => {
  storage.get.mockReset()
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  await files.get.getValue().callback({
    db: { query: { files: { findFirst: async () => undefined } } },
    query: { key: 'not-owned' },
    res
  } as never)
  expect(res.status).toHaveBeenCalledWith(404)
  expect(storage.get).not.toHaveBeenCalled()
})
it('releases the request transaction before download completion and closes the source on disconnect', async () => {
  const source = new PassThrough()
  storage.get.mockResolvedValue({
    stream: source,
    size: 100,
    mimeType: 'application/octet-stream'
  })
  const response = Object.assign(
    new Writable({
      write(_chunk, _encoding, done) {
        done()
      }
    }),
    { set: vi.fn() }
  )
  await files.get.getValue().callback({
    db: {
      query: {
        files: { findFirst: async () => ({ originalName: 'fixture.bin' }) }
      }
    },
    query: { key: 'owned' },
    res: response
  } as never)
  expect(source.readableEnded).toBe(false)
  response.destroy()
  await new Promise(done => setImmediate(done))
  expect(source.destroyed).toBe(true)
})
