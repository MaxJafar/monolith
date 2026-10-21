// SPDX-License-Identifier: 0BSD
import express from 'express'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import { addonAssets } from '../core/routes/addonAssets'

it('serves active bundles, recovers previous hashed assets, and preserves API CORS on misses', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'monolith-assets-'))
  const active = join(directory, 'active'),
    previous = join(directory, 'previous')
  for (const root of [active, previous])
    mkdirSync(join(root, 'client/dist/assets'), { recursive: true })
  writeFileSync(join(active, 'client/dist/remoteEntry.js'), 'current bundle')
  writeFileSync(join(previous, 'client/dist/assets/old.js'), 'previous asset')
  writeFileSync(join(previous, 'client/dist/remoteEntry.js'), 'old entry')
  writeFileSync(join(directory, 'private.txt'), 'must not escape root')
  const app = express()
  app.use((_req, res, next) => {
    res.set('Access-Control-Allow-Origin', 'https://workspace.example')
    res.set('Access-Control-Allow-Credentials', 'true')
    next()
  })
  app.use(
    '/modules/:moduleName/*',
    addonAssets(
      id => (id === 'test' ? active : undefined),
      () => previous
    )
  )
  app.use((_req, res) => res.status(404).end())
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(done => server.once('listening', done))
  const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  try {
    const current = await fetch(url + '/modules/test/remoteEntry.js')
    expect(await current.text()).toBe('current bundle')
    expect(current.headers.get('cache-control')).toBe('no-store')
    expect(current.headers.get('access-control-allow-origin')).toBe('*')
    expect(current.headers.get('access-control-allow-credentials')).toBeNull()
    expect(
      await (await fetch(url + '/modules/test/assets/old.js')).text()
    ).toBe('previous asset')
    const missing = await fetch(url + '/modules/test/missing')
    expect(missing.status).toBe(404)
    expect(missing.headers.get('access-control-allow-origin')).toBe(
      'https://workspace.example'
    )
    expect(missing.headers.get('access-control-allow-credentials')).toBe('true')
    expect(
      (await fetch(url + '/modules/test/%2e%2e%2f%2e%2e%2fprivate.txt')).status
    ).toBe(404)
  } finally {
    await new Promise<void>((done, reject) =>
      server.close(error => (error ? reject(error) : done()))
    )
    rmSync(directory, { recursive: true, force: true })
  }
})
