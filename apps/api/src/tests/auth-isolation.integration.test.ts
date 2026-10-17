import { hash as argonHash, verify as argonVerify } from 'argon2'
import { hash as bcryptHash } from 'bcryptjs'
import cookieParser from 'cookie-parser'
import { defineRelations, eq, inArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import express from 'express'
import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { Readable } from 'node:stream'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createProvider, generateThumbKey } from '@monolith/file-storage'
import { defineEndpoints } from '@monolith/server-utils'

import {
  bases,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import { users } from '../lib/user/schema.drizzle'

const enabled = process.env.ZILLION_INTEGRATION === '1'
const api = process.env.TEST_API_URL || 'http://localhost:3636'
const adminUrl = process.env.DATABASE_ADMIN_URL
const appUrl = process.env.DATABASE_URL
const signingKey = process.env.JWT_SIGNING_KEY || ''

function requireLocalDatabase(value: string | undefined) {
  if (!value) throw new Error('An explicit isolated database URL is required')

  const target = new URL(value)

  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  )
    throw new Error(
      'Integration tests only use isolated local Monolith databases on port 55432'
    )

  return value
}

if (enabled) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Integration fixtures cannot run in production')
  requireLocalDatabase(adminUrl)

  requireLocalDatabase(appUrl)

  if (!signingKey) throw new Error('A test JWT key is required')

  const target = new URL(api)

  if (
    target.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.port !== '3636' ||
    target.username ||
    target.password
  )
    throw new Error('Auth integration tests require the local API on port 3636')
  if (process.env.FILE_STORAGE_PROVIDER === 's3')
    throw new Error('Auth fixtures require local file storage')
}

const disabledUrl = 'postgres://127.0.0.1:55432/zillion_test_disabled'
const applicationName = `zillion-auth-fixture-${randomUUID()}`
const admin = postgres(enabled ? requireLocalDatabase(adminUrl) : disabledUrl, {
  max: 2,
  prepare: false
})
const appClient = postgres(
  enabled ? requireLocalDatabase(appUrl) : disabledUrl,
  { max: 2, prepare: false, connection: { application_name: applicationName } }
)
const db = drizzle({
  client: appClient,
  relations: defineRelations({ ...tables, users })
})
const adminDb = drizzle({ client: admin })

let storage: ReturnType<typeof createProvider> | undefined

const runId = randomUUID()
const first = {
  id: randomUUID(),
  email: `auth-first-${runId}@example.invalid`,
  username: `auth-first-${runId}`
}
const second = {
  id: randomUUID(),
  email: `auth-second-${runId}@example.invalid`,
  username: `auth-second-${runId}`
}
const password = `Fixture-${randomUUID()}!`
const fileKey = `auth-integration/${runId}.txt`
const thumbKey = generateThumbKey(fileKey, '44x44')
const rollbackId = randomUUID(),
  committedId = randomUUID()

let bcryptOriginal: string
let localServer: Server | undefined
let localUrl = ''
let accessFirst = '',
  accessSecond = ''

async function request(
  path: string,
  options: {
    method?: string
    body?: unknown
    access?: string
    cookie?: string
    base?: string
    forwardedFor?: string
  } = {}
) {
  const response = await fetch(`${options.base || api}${path}`, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.access ? { Authorization: `Bearer ${options.access}` } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.forwardedFor
        ? { 'X-Forwarded-For': options.forwardedFor }
        : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const text = await response.text()

  return {
    response,
    body:
      text && response.headers.get('content-type')?.includes('json')
        ? JSON.parse(text)
        : text
  }
}

function cookie(response: globalThis.Response, name: string) {
  const header = response.headers
    .getSetCookie()
    .find(value => value.startsWith(`${name}=`))

  expect(header, `Missing ${name} cookie`).toBeDefined()

  return header!.split(';')[0]!
}

function tokenSubject(access: string) {
  const payload = jwt.verify(access, signingKey, { algorithms: ['HS512'] })

  return typeof payload === 'string' ? undefined : payload.sub
}

async function login(user = first) {
  const result = await request('/auth/login', {
    body: { email: user.email, password }
  })

  expect(result.response.status).toBe(200)

  return { ...result, access: result.body.data.accessToken as string }
}

function barrier() {
  let resolve = () => {}

  const promise = new Promise<void>(done => {
    resolve = done
  })

  return { promise, resolve }
}

async function waitForBlockedUserQueries(count: number) {
  const deadline = Date.now() + 5000

  while (Date.now() < deadline) {
    const [blocked] = await admin`
      select count(*)::int as count from pg_stat_activity
      where application_name = ${applicationName} and wait_event_type = 'Lock'
        and query ilike '%users%'
    `

    if (blocked!.count >= count) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(
    `Expected ${count} fixture requests to reach their locked user query`
  )
}

describe.skipIf(!enabled)('Authenticated Monolith isolation', () => {
  beforeAll(async () => {
    const { registerController } =
      await import('../core/functions/routes/executeEndpoint')
    const qrRoutes = await import('../lib/auth/routes/qrLogin')
    const { refresh } = await import('../lib/auth/routes/refresh')
    const { login: loginRoute } = await import('../lib/auth/routes/login')

    storage = createProvider()
    expect((await request('/status')).response.status).toBe(200)
    bcryptOriginal = await bcryptHash(password, 4)
    const argon = await argonHash(password)

    for (const [user, hash] of [
      [first, bcryptOriginal],
      [second, argon]
    ] as const)
      await admin`
      insert into users (id, email, username, name, auth_password_hash)
      values (${user.id}, ${user.email}, ${user.username}, ${user.username}, ${hash})
    `
    await storage.save(fileKey, Readable.from('Private original fixture'))
    await storage.save(thumbKey, Readable.from('Private thumbnail fixture'))
    await admin`
    insert into files (key, original_name, mime_type, size, module_id, owner_id)
    values (${fileKey}, 'private.txt', 'text/plain', 24, 'auth-integration', ${first.id})
  `

    const app = express()

    app.set('trust proxy', 'loopback')
    app.use(express.json())
    app.use(cookieParser())
    app.use((req, _res, next) => {
      req.db = db
      next()
    })
    const router = express.Router()
    const endpoints = defineEndpoints()

    for (const [name, route] of Object.entries(qrRoutes))
      registerController(route, router, `qr/${name}`)
    registerController(refresh, router, 'refresh')
    registerController(loginRoute, router, 'login')

    for (const [name, id, reject] of [
      ['rollback', rollbackId, true],
      ['commit', committedId, false]
    ] as const) {
      const route = endpoints
        .mutation({
          description:
            'Exercise the production authenticated transaction boundary',
          encrypted: false,
          output: { NO_CONTENT: true }
        })
        .callback(async ({ db: scoped, res, response }) => {
          await scoped.insert(bases).values({
            id,
            owner_id: res.locals.userId as string,
            name: 'Transaction fixture'
          })

          return reject
            ? response.badRequest('Intentional rejection')
            : response.noContent()
        })

      registerController(route, router, name)
    }
    app.use(router)
    localServer = await new Promise<Server>(resolve => {
      const server = app.listen(0, '127.0.0.1', () => resolve(server))
    })
    const address = localServer.address()

    if (!address || typeof address === 'string')
      throw new Error('Missing test port')
    localUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await storage?.delete(fileKey)
    await admin`delete from files where key = ${fileKey}`
    await adminDb
      .delete(bases)
      .where(inArray(bases.owner_id, [first.id, second.id]))
    await admin`delete from auth__refresh_tokens where user_id in (${first.id}, ${second.id})`
    await admin`delete from users where id in (${first.id}, ${second.id})`
    if (localServer)
      await new Promise<void>((resolve, reject) =>
        localServer!.close(error => (error ? reject(error) : resolve()))
      )
    await admin.end()
    await appClient.end()
  })

  it('rehashes bcrypt only after successful login and returns the JWT account', async () => {
    const failed = await request('/auth/login', {
      body: { email: first.email, password: `${password}-wrong` }
    })

    expect(failed.response.status).toBe(401)
    const [unchanged] =
      await admin`select auth_password_hash from users where id = ${first.id}`

    expect(unchanged!.auth_password_hash).toBe(bcryptOriginal)
    const firstLogin = await login(),
      secondLogin = await login(second)

    accessFirst = firstLogin.access
    accessSecond = secondLogin.access
    expect(tokenSubject(accessFirst)).toBe(first.id)
    expect(tokenSubject(accessSecond)).toBe(second.id)
    const [migrated] =
      await admin`select auth_password_hash from users where id = ${first.id}`

    expect(migrated!.auth_password_hash.startsWith('$argon2')).toBe(true)
    expect(await argonVerify(migrated!.auth_password_hash, password)).toBe(true)

    for (const [access, user] of [
      [accessFirst, first],
      [accessSecond, second]
    ] as const) {
      const result = await request('/user/me', { access })

      expect(result.response.status).toBe(200)
      expect(result.body.data.userData).toMatchObject({
        id: user.id,
        email: user.email
      })
      expect(result.body.data.userData).not.toHaveProperty('auth_password_hash')
      expect(result.body.data.userData).not.toHaveProperty('twoFASecret')
      expect(result.body.data.userData).not.toHaveProperty(
        'APIKeysMasterPasswordHash'
      )
    }
    for (const access of [
      jwt.sign({ sub: first.id }, signingKey, { algorithm: 'HS256' }),
      jwt.sign({ sub: 'invalid-account' }, signingKey, { algorithm: 'HS512' })
    ])
      expect((await request('/user/me', { access })).response.status).toBe(401)
  })

  it('refreshes the cookie account and revokes a replayed or differently bound family', async () => {
    const original = await login()
    const originalCookie = cookie(original.response, 'refresh_token')
    const refreshed = await request('/auth/refresh', {
      method: 'POST',
      cookie: originalCookie,
      access: accessSecond
    })

    expect(refreshed.response.status).toBe(200)
    expect(tokenSubject(refreshed.body.data.accessToken)).toBe(first.id)
    const newCookie = cookie(refreshed.response, 'refresh_token')

    expect(newCookie).not.toBe(originalCookie)
    expect(
      (
        await request('/auth/refresh', {
          method: 'POST',
          cookie: originalCookie
        })
      ).response.status
    ).toBe(401)
    expect(
      (await request('/auth/refresh', { method: 'POST', cookie: newCookie }))
        .response.status
    ).toBe(401)
    const bound = await login()
    const boundCookie = cookie(bound.response, 'refresh_token')
    const hash = createHash('sha256')
      .update(boundCookie.slice('refresh_token='.length))
      .digest('hex')

    await admin`update auth__refresh_tokens set bound_ip = '203.0.113.1' where token_hash = ${hash}`
    expect(
      (await request('/auth/refresh', { method: 'POST', cookie: boundCookie }))
        .response.status
    ).toBe(401)
    const family =
      await admin`select revoked from auth__refresh_tokens where family = (select family from auth__refresh_tokens where token_hash = ${hash})`

    expect(family.length).toBeGreaterThan(0)
    expect(family.every(record => record.revoked)).toBe(true)
  })

  it('rejects expired access and refresh credentials without issuing replacement cookies', async () => {
    const access = jwt.sign({ sub: first.id }, signingKey, {
      algorithm: 'HS512',
      expiresIn: -1
    })

    expect((await request('/user/me', { access })).response.status).toBe(401)
    const original = await login()
    const refreshCookie = cookie(original.response, 'refresh_token')
    const hash = createHash('sha256')
      .update(refreshCookie.slice('refresh_token='.length))
      .digest('hex')

    await admin`update auth__refresh_tokens set expires_at = now() - interval '1 second' where token_hash = ${hash}`
    const expired = await request('/auth/refresh', {
      method: 'POST',
      cookie: refreshCookie
    })

    expect(expired.response.status).toBe(401)
    expect(expired.response.headers.getSetCookie()).toEqual([])
  })

  it('consumes a refresh token only once under concurrent requests', async () => {
    const original = await login()
    const refreshCookie = cookie(original.response, 'refresh_token')
    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        request('/auth/refresh', { method: 'POST', cookie: refreshCookie })
      )
    )

    expect(
      attempts.filter(attempt => attempt.response.status === 200)
    ).toHaveLength(1)
    expect(
      attempts.filter(attempt => attempt.response.status === 401)
    ).toHaveLength(7)
  })

  it('guards original files, thumbnails and access cookies with ownership', async () => {
    const path = `/files/get?key=${encodeURIComponent(fileKey)}`

    expect((await request(path)).response.status).toBe(401)
    expect(
      (await request(path, { access: accessSecond })).response.status
    ).toBe(404)
    expect(
      (await request(`${path}&thumb=44x44`, { access: accessSecond })).response
        .status
    ).toBe(404)
    const original = await request(path, { access: accessFirst })

    expect(original.response.status).toBe(200)
    expect(original.body).toBe('Private original fixture')
    expect(original.response.headers.get('cache-control')).toBe(
      'private, max-age=300'
    )
    expect(
      (await request(`${path}&thumb=44x44`, { access: accessFirst })).body
    ).toBe('Private thumbnail fixture')
    const loggedIn = await login()

    expect(
      (
        await request(path, {
          cookie: cookie(loggedIn.response, 'access_token')
        })
      ).response.status
    ).toBe(200)
    expect(
      (
        await request('/user/me', {
          cookie: cookie(loggedIn.response, 'access_token')
        })
      ).response.status
    ).toBe(401)
  })

  it('binds QR refresh to the claiming browser while retaining the approving account and a single claim', async () => {
    const approverIp = '203.0.113.8',
      claimantIp = '198.51.100.24'
    const registered = await request('/qr/register', {
      base: localUrl,
      forwardedFor: claimantIp,
      body: { browserInfo: 'Isolated requesting browser' }
    })

    expect(registered.response.status).toBe(201)
    const sessionId = registered.body.data.sessionId as string

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(
      (await request('/qr/claim', { base: localUrl, body: { sessionId } }))
        .response.status
    ).toBe(404)
    expect(
      (await request('/qr/approve', { base: localUrl, body: { sessionId } }))
        .response.status
    ).toBe(401)
    const [before] =
      await admin`select count(*)::int as count from auth__refresh_tokens where user_id = ${second.id}`
    const approved = await request('/qr/approve', {
      base: localUrl,
      access: accessSecond,
      forwardedFor: approverIp,
      body: { sessionId }
    })

    expect(approved.response.status).toBe(200)
    const [after] =
      await admin`select count(*)::int as count from auth__refresh_tokens where user_id = ${second.id}`

    expect(after!.count).toBe(before!.count)
    const claims = await Promise.all(
      Array.from({ length: 2 }, () =>
        request('/qr/claim', {
          base: localUrl,
          access: accessFirst,
          forwardedFor: claimantIp,
          body: { sessionId }
        })
      )
    )
    const claimed = claims.find(result => result.response.status === 200)

    expect(
      claims.filter(result => result.response.status === 200)
    ).toHaveLength(1)
    expect(
      claims.filter(result => result.response.status === 404)
    ).toHaveLength(1)
    expect(claimed).toBeDefined()
    expect(tokenSubject(claimed!.body.data.accessToken)).toBe(second.id)
    const refreshCookie = cookie(claimed!.response, 'refresh_token')
    const hash = createHash('sha256')
      .update(refreshCookie.slice('refresh_token='.length))
      .digest('hex')
    const [token] =
      await admin`select user_id, bound_ip from auth__refresh_tokens where token_hash = ${hash}`

    expect(token).toMatchObject({ user_id: second.id, bound_ip: claimantIp })
    const refreshed = await request('/refresh', {
      base: localUrl,
      method: 'POST',
      forwardedFor: claimantIp,
      cookie: refreshCookie
    })

    expect(refreshed.response.status).toBe(200)
    expect(tokenSubject(refreshed.body.data.accessToken)).toBe(second.id)
    const rotated = cookie(refreshed.response, 'refresh_token')
    const wrongDevice = await request('/refresh', {
      base: localUrl,
      method: 'POST',
      forwardedFor: approverIp,
      cookie: rotated
    })

    expect(wrongDevice.response.status).toBe(401)
    expect(wrongDevice.response.headers.getSetCookie()).toEqual([])
    expect(
      (await request('/qr/claim', { base: localUrl, body: { sessionId } }))
        .response.status
    ).toBe(404)
  })

  it('rolls back a callback returned error and commits successful writes under the verified owner', async () => {
    expect(
      (
        await request('/rollback', {
          base: localUrl,
          method: 'POST',
          access: accessFirst
        })
      ).response.status
    ).toBe(400)
    expect(
      await adminDb.select().from(bases).where(eq(bases.id, rollbackId))
    ).toHaveLength(0)
    expect(
      (
        await request('/commit', {
          base: localUrl,
          method: 'POST',
          access: accessFirst
        })
      ).response.status
    ).toBe(204)
    const [committed] = await adminDb
      .select()
      .from(bases)
      .where(eq(bases.id, committedId))

    expect(committed!.owner_id).toBe(first.id)
    const visibleToOther = await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id', ${second.id}, true)`
      )

      return tx.select().from(bases).where(eq(bases.id, committedId))
    })

    expect(visibleToOther).toEqual([])
  })

  it('preserves a newer password when a bcrypt login migration races with a password change', async () => {
    await admin`update users set auth_password_hash = ${bcryptOriginal} where id = ${first.id}`
    const newPassword = `Replacement-${randomUUID()}!`
    const replacement = await argonHash(newPassword)
    const locked = barrier(),
      release = barrier()
    const changingPassword = admin.begin(async transaction => {
      await transaction`update users set auth_password_hash = ${replacement} where id = ${first.id}`
      locked.resolve()
      await release.promise
    })

    await locked.promise
    const loggingIn = request('/login', {
      base: localUrl,
      body: { email: first.email, password }
    })

    try {
      await waitForBlockedUserQueries(1)
    } finally {
      release.resolve()
      await changingPassword
    }
    expect((await loggingIn).response.status).toBe(200)
    const [persisted] =
      await admin`select auth_password_hash from users where id = ${first.id}`

    expect(persisted!.auth_password_hash).toBe(replacement)
    expect(await argonVerify(persisted!.auth_password_hash, newPassword)).toBe(
      true
    )
    expect(await argonVerify(persisted!.auth_password_hash, password)).toBe(
      false
    )
  })

  it('allows only one account to approve a QR session after competing asynchronous user lookups', async () => {
    const registered = await request('/qr/register', {
      base: localUrl,
      body: { browserInfo: 'Competing approval fixture' }
    })
    const sessionId = registered.body.data.sessionId as string
    const locked = barrier(),
      release = barrier()
    const blockingLookup = admin.begin(async transaction => {
      await transaction`lock table users in access exclusive mode`
      locked.resolve()
      await release.promise
    })

    await locked.promise
    const attempts = [
      { access: accessFirst, user: first },
      { access: accessSecond, user: second }
    ].map(async ({ access, user }) => ({
      user,
      result: await request('/qr/approve', {
        base: localUrl,
        access,
        body: { sessionId }
      })
    }))

    try {
      await waitForBlockedUserQueries(2)
    } finally {
      release.resolve()
      await blockingLookup
    }

    const results = await Promise.all(attempts)
    const winner = results.find(
      attempt => attempt.result.response.status === 200
    )

    expect(
      results.filter(attempt => attempt.result.response.status === 200)
    ).toHaveLength(1)
    expect(
      results.filter(attempt => attempt.result.response.status === 400)
    ).toHaveLength(1)
    expect(winner).toBeDefined()

    const status = await request(`/qr/status?sessionId=${sessionId}`, {
      base: localUrl
    })

    expect(tokenSubject(status.body.data.accessToken)).toBe(winner!.user.id)
    const claimed = await request('/qr/claim', {
      base: localUrl,
      forwardedFor: '198.51.100.32',
      body: { sessionId }
    })

    expect(claimed.response.status).toBe(200)
    expect(tokenSubject(claimed.body.data.accessToken)).toBe(winner!.user.id)
    const refreshCookie = cookie(claimed.response, 'refresh_token')
    const hash = createHash('sha256')
      .update(refreshCookie.slice('refresh_token='.length))
      .digest('hex')
    const [token] =
      await admin`select user_id,bound_ip from auth__refresh_tokens where token_hash = ${hash}`

    expect(token).toMatchObject({
      user_id: winner!.user.id,
      bound_ip: '198.51.100.32'
    })
  })
})
