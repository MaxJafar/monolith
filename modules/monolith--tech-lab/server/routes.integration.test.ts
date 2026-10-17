import { resolveAddonIdentity } from '@monolith/configs/node'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import { defineRelations, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type {
  Device,
  Service,
  TechLabImportPreview,
  TechLabSnapshot
} from '../shared'
import {
  checks,
  devices,
  relations,
  services,
  settings,
  tables
} from './schema.drizzle'

const enabled =
  process.env.ZILLION_INTEGRATION === '1' &&
  process.env.ZILLION_HTTP_INTEGRATION === '1'

if (enabled)
  dotenv.config({
    path: fileURLToPath(new URL('../../../env/.env.local', import.meta.url)),
    quiet: true
  })

const appUrl = process.env.DATABASE_URL ?? ''
const adminUrl = process.env.DATABASE_ADMIN_URL ?? ''
const api = process.env.TEST_API_URL ?? 'http://127.0.0.1:3636'

function isolated(value: string) {
  if (!value) throw new Error('An explicit isolated database URL is required')

  const target = new URL(value)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Tech Lab HTTP fixtures require an isolated loopback database on port 55432'
    )

  return value
}

if (enabled) {
  isolated(appUrl)
  isolated(adminUrl)
  const target = new URL(api)

  if (
    target.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '3636' ||
    target.username ||
    target.password ||
    target.pathname !== '/' ||
    target.search ||
    target.hash
  )
    throw new Error('Tech Lab HTTP fixtures require the local API on port 3636')
}

const disabled = 'postgres://127.0.0.1:55432/zillion_test_disabled'
const admin = postgres(enabled ? isolated(adminUrl) : disabled, {
  max: 2,
  prepare: false
})
const app = postgres(enabled ? isolated(appUrl) : disabled, {
  max: 2,
  prepare: false
})
const db = drizzle({
  client: app,
  relations: defineRelations(tables, relations)
})
const runId = randomUUID()
const accounts = [
  {
    id: randomUUID(),
    email: `tech-lab-first-${runId}@example.invalid`,
    username: `tech-lab-first-${runId}`
  },
  {
    id: randomUUID(),
    email: `tech-lab-second-${runId}@example.invalid`,
    username: `tech-lab-second-${runId}`
  }
]
const password = `Fixture-${randomUUID()}!`
const prefix = `/modules/${resolveAddonIdentity({ name: '@monolith/tech-lab' }).remoteId}`
const tokens: string[] = []

async function request<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const response = await fetch(`${api}${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(options.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(10000)
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : undefined

  return {
    status: response.status,
    data: payload?.data as T,
    message: payload?.message as unknown
  }
}

async function native<T = unknown>(
  path: string,
  body?: unknown,
  account = 0,
  method?: string
) {
  return request<T>(`${prefix}/${path}`, {
    body,
    token: tokens[account],
    method
  })
}

async function cleanupOwner(id: string) {
  await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${id},true)`)
    await tx.delete(checks).where(eq(checks.owner_id, id))
    await tx.delete(services).where(eq(services.owner_id, id))
    await tx.delete(devices).where(eq(devices.owner_id, id))
    await tx.delete(settings).where(eq(settings.owner_id, id))
  })
}
beforeAll(async () => {
  if (!enabled) return
  expect((await request('/status')).status).toBe(200)
  const hashed = await hash(password, 4)

  for (const account of accounts) {
    await admin`insert into users(id,email,username,name,auth_password_hash) values(${account.id},${account.email},${account.username},'Synthetic Tech Lab owner',${hashed})`
    const login = await request<{ accessToken: string }>('/auth/login', {
      body: { email: account.email, password }
    })
    expect(login.status).toBe(200)
    expect(login.data.accessToken).toBeTypeOf('string')
    tokens.push(login.data.accessToken)
  }
})
afterAll(async () => {
  if (enabled) {
    // Disabled-only visits remove their collector on the first one-second tick.
    await new Promise(resolve => setTimeout(resolve, 1200))

    for (const account of accounts) {
      await cleanupOwner(account.id)
      await admin`delete from auth__refresh_tokens where user_id=${account.id}`
      await admin`delete from users where id=${account.id}`
    }
  }
  await app.end()
  await admin.end()
})
describe.skipIf(!enabled)('Tech Lab real authenticated API routes', () => {
  it('requires authentication and serves empty owner-scoped DTOs', async () => {
    expect((await request(`${prefix}/snapshot`)).status).toBe(401)
    const result = await native<TechLabSnapshot>('snapshot')
    expect(result.status).toBe(200)
    expect(result.data.devices).toEqual([])
    expect(result.data.services).toEqual([])
    expect(result.data.settings.updated).toBeTypeOf('string')
  })
  it('creates, edits and deletes native inventory with stale and foreign UUID denial', async () => {
    const created = await native<Device>('devices/save', {
      name: 'Synthetic node',
      kind: 'server',
      host: 'host.example.invalid'
    })
    expect(created.status).toBe(200)
    expect(created.data).toMatchObject({
      name: 'Synthetic node',
      host: 'host.example.invalid'
    })
    expect('owner_id' in created.data).toBe(false)
    const service = await native<Service>('services/save', {
      name: 'Synthetic link',
      device_id: created.data.id,
      url: 'https://service.example.invalid',
      kind: 'link'
    })
    expect(service.status).toBe(200)
    expect(service.data.monitor_enabled).toBe(false)
    const foreign = await native<Service>(
      'services/save',
      { name: 'Forbidden link', device_id: created.data.id },
      1
    )
    expect(foreign.status).toBe(404)
    expect(
      (await native(`history?id=${service.data.id}`, undefined, 1)).status
    ).toBe(404)
    expect(
      (await native('devices/telemetry?id=' + created.data.id, undefined, 1))
        .status
    ).toBe(404)
    const updated = await native<Device>('devices/save', {
      name: 'Synthetic renamed',
      id: created.data.id,
      expected_updated: created.data.updated
    })
    expect(updated.status).toBe(200)
    expect(updated.data.name).toBe('Synthetic renamed')
    expect(
      (
        await native('devices/save', {
          name: 'Stale name',
          id: created.data.id,
          expected_updated: created.data.updated
        })
      ).status
    ).toBe(409)
    expect(
      (
        await native(
          'devices/delete',
          { id: created.data.id, expected_updated: updated.data.updated },
          1
        )
      ).status
    ).toBe(404)
    expect(
      (
        await native('devices/delete', {
          id: created.data.id,
          expected_updated: updated.data.updated
        })
      ).status
    ).toBe(204)
    const snapshot = await native<TechLabSnapshot>('snapshot')
    expect(snapshot.data.devices).toEqual([])
    const detached = snapshot.data.services.find(
      item => item.id === service.data.id
    )!
    expect(detached.device_id).toBeNull()
    expect(
      (
        await native('services/delete', {
          id: detached.id,
          expected_updated: detached.updated
        })
      ).status
    ).toBe(204)
  })
  it('returns safe 400 preview errors and retries an import once with disabled checks', async () => {
    const malformed = await native('imports/preview', {
      format: 'homepage-services',
      text: '- broken: ['
    })
    expect(malformed.status).toBe(400)
    expect(String(malformed.message)).toContain('Unable to preview inventory')
    const preview = await native<TechLabImportPreview>('imports/preview', {
      format: 'homepage-services',
      text: '- Synthetic group:\n  - Synthetic dashboard:\n      href: https://dashboard.example.invalid\n      description: Local fixture'
    })
    expect(preview.status).toBe(200)
    expect(preview.data.data.services).toHaveLength(1)
    expect(preview.data.data.services[0]!.monitor_enabled).toBe(false)
    const first = await native<{ created: { services: number } }>(
      'imports/apply',
      { data: preview.data.data }
    )
    expect(first.status).toBe(200)
    expect(first.data.created.services).toBe(1)
    const second = await native<{ skipped: { services: number } }>(
      'imports/apply',
      { data: preview.data.data }
    )
    expect(second.status).toBe(200)
    expect(second.data.skipped.services).toBe(1)
    const snapshot = await native<TechLabSnapshot>('snapshot')
    const imported = snapshot.data.services.find(
      item => item.name === 'Synthetic dashboard'
    )!
    const skipped = await native<{ checks: unknown[]; skipped: number }>(
      `checks/run?id=${imported.id}`,
      {},
      0,
      'POST'
    )
    expect(skipped.status).toBe(200)
    expect(skipped.data).toEqual({ checks: [], skipped: 1 })
    expect(
      (await native(`checks/run?id=${imported.id}`, {}, 1, 'POST')).status
    ).toBe(404)
    expect(
      (await native<TechLabSnapshot>('snapshot', undefined, 1)).data.services
    ).toEqual([])
  })
})
