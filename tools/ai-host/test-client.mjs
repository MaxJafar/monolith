import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import z from 'zod'

import { sharedInference } from '../../apps/api/src/lib/ai/shared/client.ts'

const folder = await mkdtemp(join(tmpdir(), 'shared-ai-client-'))
const token = 'a'.repeat(43)
const keyPath = join(folder, 'credential')
await writeFile(keyPath, token)
process.env.SHARED_AI_TOKEN_FILE = keyPath
let respond
let requests = 0
const server = createServer((request, response) => {
  requests++
  assert.equal(request.headers.authorization, `Bearer ${token}`)
  respond(request, response)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const endpoint = `http://127.0.0.1:${server.address().port}`
after(async () => {
  await new Promise(resolve => server.close(resolve))
  await rm(folder, { recursive: true, force: true })
})

test('validates the real client response schema', async () => {
  process.env.SHARED_AI_URL = endpoint
  respond = (_, response) => response.end(JSON.stringify({ ready: true }))
  assert.deepEqual(
    await sharedInference('/health', z.object({ ready: z.boolean() })),
    { ready: true }
  )
  respond = (_, response) =>
    response.end(JSON.stringify({ ready: 'incorrect' }))
  await assert.rejects(
    sharedInference('/health', z.object({ ready: z.boolean() })),
    error => error.code === 503
  )
})

test('rejects unsafe endpoints before sending credentials', async () => {
  for (const url of [
    'http://example.com',
    `${endpoint}?credential=hidden`,
    `http://user:secret@127.0.0.1`
  ]) {
    process.env.SHARED_AI_URL = url
    const before = requests
    await assert.rejects(
      sharedInference('/health', z.unknown()),
      error => error.code === 503
    )
    assert.equal(requests, before)
  }
})

test('does not follow redirects carrying the bearer credential', async () => {
  process.env.SHARED_AI_URL = endpoint
  const before = requests
  respond = (_, response) => {
    response.writeHead(302, { Location: '/destination' })
    response.end()
  }
  await assert.rejects(
    sharedInference('/health', z.unknown()),
    error => error.code === 503
  )
  assert.equal(requests, before + 1)
})

test('sanitizes upstream failures and enforces response size', async () => {
  process.env.SHARED_AI_URL = endpoint
  respond = (_, response) => {
    response.writeHead(503)
    response.end(`Private upstream detail: ${token}`)
  }
  await assert.rejects(
    sharedInference('/health', z.unknown()),
    error => error.code === 503 && !error.message.includes(token)
  )
  respond = (_, response) => response.end('x'.repeat(4 * 1024 * 1024 + 1))
  await assert.rejects(
    sharedInference('/health', z.unknown()),
    error => error.code === 503
  )
})
