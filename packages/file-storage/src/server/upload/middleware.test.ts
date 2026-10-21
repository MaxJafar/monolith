// SPDX-License-Identifier: 0BSD
import express, { type ErrorRequestHandler } from 'express'
import { readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import type { StagedFile } from '../../core/types'
import { sandbox } from '../../testing'

let area: Awaited<ReturnType<typeof sandbox>>,
  server: ReturnType<typeof createServer>,
  origin: string
let staging: typeof import('./staging')
let controllerCalls = 0
beforeAll(async () => {
  area = await sandbox()
  vi.stubEnv('FILE_STORAGE_LOCAL_PATH', join(area.root, 'uploads'))
  vi.stubEnv('FILE_UPLOAD_MAX_BYTES', '2048')
  vi.resetModules()
  staging = await import('./staging')
  const { default: upload } = await import('./middleware')
  const app = express()
  app.post(
    '/upload',
    upload({ attachment: 1 }),
    async (request, response, next) => {
      try {
        controllerCalls++
        const file = (request.files as unknown as Record<string, StagedFile[]>)
          .attachment[0]
        const result = {
          name: file.originalName,
          size: file.size,
          mime: file.mimeType,
          content: (await file.read()).toString()
        }
        await staging.releaseStaged(file)
        response.json(result)
      } catch (error) {
        next(error)
      }
    }
  )
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    response.status(400).json({ code: error.code ?? 'UPLOAD_FAILED' })
  }
  app.use(errors)
  server = createServer(app)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port
  await staging.ensureStagingDir()
})
afterEach(() => vi.stubEnv('FILE_UPLOAD_MAX_BYTES', '2048'))
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  )
  vi.unstubAllEnvs()
  await area.dispose()
})
async function send(fields: Array<[string, string]>) {
  const body = new FormData()
  for (const [key, text] of fields)
    body.append(key, new File([text], 'note.txt', { type: 'text/plain' }))
  return fetch(origin + '/upload', { method: 'POST', body })
}
it('delivers a readable staged file to the route', async () => {
  const result = await send([['attachment', 'hello']])
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({
    name: 'note.txt',
    size: 5,
    mime: 'text/plain',
    content: 'hello'
  })
  expect(await readdir(staging.STAGING_DIR)).toEqual([])
})
it('forwards size-limit failures instead of calling the route with a partial upload', async () => {
  vi.stubEnv('FILE_UPLOAD_MAX_BYTES', '8')
  const before = controllerCalls
  const result = await send([['attachment', 'content that exceeds the limit']])
  expect(result.status).toBe(400)
  expect(await result.json()).toEqual({ code: 'LIMIT_FILE_SIZE' })
  expect(controllerCalls).toBe(before)
  expect(await readdir(staging.STAGING_DIR)).toEqual([])
})
it.each([
  [['unexpected', 'first']],
  [
    ['attachment', 'first'],
    ['attachment', 'second']
  ]
] as Array<Array<[string, string]>>)(
  'rejects unexpected/extra parts and releases previously staged content',
  async (...fields) => {
    const before = controllerCalls
    const result = await send(fields)
    expect(result.status).toBe(400)
    expect(await result.json()).toEqual({ code: 'LIMIT_UNEXPECTED_FILE' })
    expect(controllerCalls).toBe(before)
    expect(await readdir(staging.STAGING_DIR)).toEqual([])
  }
)
