import dotenv from 'dotenv'
import { randomBytes, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

import { type PlatformUpdateStatus, emptyUpdateStatus } from '@monolith/configs'

// Disposable UI/API fixture. It simulates the privileged supervisor and never
// executes Docker, replaces an application, or contacts a published release.
const root = path.resolve(import.meta.dirname, '../..')
dotenv.config({ path: path.join(root, 'env/.env.local'), quiet: true })
const database = new URL(process.env.DATABASE_URL!)
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  database.port !== '55432' ||
  !['/zillion_dev', '/monolith_dev'].includes(database.pathname)
)
  throw Error('Use the isolated development database')
const owner = randomUUID(),
  token = randomBytes(32).toString('hex')
const state: PlatformUpdateStatus = {
  ...emptyUpdateStatus('0.0.0', 'linux-amd64'),
  configured: true,
  preferences: {
    channel: 'stable',
    autoDownload: false,
    autoInstall: false,
    installHourUTC: 3
  }
}
const release: NonNullable<PlatformUpdateStatus['release']> = {
  format: 1,
  version: '0.0.1',
  channel: 'stable',
  protocol: 1,
  schemaHash: 'a'.repeat(64),
  notes:
    'Monolith update acceptance fixture.\nImproved workspace updates and recovery.',
  artifacts: []
}
let busy = false
const supervisor = http.createServer(async (req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.writeHead(403).end()
    return
  }
  let body = ''
  for await (const part of req) body += part
  const reply = (code = 200) => {
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(state))
  }
  if (req.url === '/status') {
    reply()
    return
  }
  if (req.method !== 'POST' || busy) {
    reply(409)
    return
  }
  state.error = ''
  state.noticeId = randomUUID()
  if (req.url === '/settings') state.preferences = JSON.parse(body)
  else if (req.url === '/check') {
    state.release = release
    state.phase = 'available'
    state.total = 10 * 1048576
  } else if (req.url === '/download') {
    busy = true
    state.phase = 'downloading'
    state.received = 0
    const timer = setInterval(() => {
      state.received = Math.min(state.total, state.received + 1048576)
      if (state.received === state.total) {
        clearInterval(timer)
        state.phase = 'ready'
        busy = false
      }
    }, 750)
  } else if (req.url === '/install') {
    state.phase = 'installing'
    busy = true
    setTimeout(() => {
      state.phase = 'rolledBack'
      state.error =
        'The candidate failed its health check. The previous server was restored.'
      state.failedVersion = release.version
      busy = false
    }, 2000)
  } else {
    reply(400)
    return
  }
  reply()
})
await new Promise<void>(resolve => supervisor.listen(0, '127.0.0.1', resolve))
const address = supervisor.address() as { port: number }
Object.assign(process.env, {
  PORT: '3638',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5187',
  MONOLITH_UPDATER_URL: `http://127.0.0.1:${address.port}`,
  MONOLITH_UPDATER_TOKEN: token,
  MONOLITH_UPDATE_ADMIN_IDS: owner,
  MONOLITH_ADDON_STATE_ROOT: await fs.mkdtemp(
    path.join(root, '.temp/update-fixture-')
  )
})
await fs.writeFile(
  path.join(root, '.temp/update-fixture.json'),
  JSON.stringify({ owner })
)
await import('../../apps/api/src/index.ts')
