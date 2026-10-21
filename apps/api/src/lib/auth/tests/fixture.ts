// SPDX-License-Identifier: 0BSD
import { PGlite } from '@electric-sql/pglite'
import { hash } from 'argon2'
import { defineRelations } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import type { Request, Response } from 'express'
import { afterAll, beforeAll, beforeEach, vi } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import { users } from '../../user/schema.drizzle'
import { authRefreshTokens } from '../schema.drizzle'
import { pending2FASessions, pendingTOTPSetups } from '../utils/2fa'
import { clearLoginRateLimit } from '../utils/loginRateLimiter'
import { sessions } from '../utils/qrLogin'

type RequestContext = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]

export const fixtureUser = {
  id: '23026239-0725-4db2-81ef-a861e43f8bad',
  email: 'account@example.invalid',
  username: 'fixture'
}
export const fixturePassword = 'Local fixture passphrase'
export const fixtureIP = '192.0.2.20'
export const otherIP = '192.0.2.21'
let client: PGlite
let passwordHash: string
export let database: ReturnType<typeof createDatabase>
function createDatabase(client: PGlite) {
  return drizzle({
    client,
    relations: defineRelations({ users, authRefreshTokens })
  })
}

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) NOT NULL UNIQUE,
      email_visibility boolean NOT NULL DEFAULT false, verified boolean NOT NULL DEFAULT false,
      username varchar(150) NOT NULL UNIQUE, name varchar(255), avatar varchar(255), date_of_birth varchar(50),
      theme varchar(50) NOT NULL DEFAULT 'system', color varchar(50), bg_temp varchar(255), bg_image varchar(255),
      backdrop_filters json, font_family varchar(255), dashboard_layout json, workspace_pages jsonb NOT NULL DEFAULT '{}',
      api_keys_master_password_hash varchar(255), two_fa_secret varchar(255), font_scale real NOT NULL DEFAULT 1,
      border_radius_multiplier real NOT NULL DEFAULT 1, bordered boolean NOT NULL DEFAULT false,
      language varchar(50) NOT NULL DEFAULT 'en', auth_password_hash varchar(255),
      created timestamp NOT NULL DEFAULT now(), updated timestamp NOT NULL DEFAULT now()
    );
    CREATE TABLE auth__refresh_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
      token_hash varchar(255) NOT NULL, family varchar(255) NOT NULL,
      bound_ip varchar(255) NOT NULL, last_ip varchar(255) NOT NULL,
      expires_at timestamp NOT NULL, revoked boolean NOT NULL DEFAULT false,
      last_used_at timestamp NOT NULL DEFAULT now(), created timestamp NOT NULL DEFAULT now(),
      updated timestamp NOT NULL DEFAULT now()
    );
  `)
  database = createDatabase(client)
  passwordHash = await hash(fixturePassword, { type: 2 })
})
beforeEach(async () => {
  vi.useRealTimers()
  await client.exec('TRUNCATE auth__refresh_tokens, users')
  await database
    .insert(users)
    .values({ ...fixtureUser, auth_password_hash: passwordHash })
  pending2FASessions.clear()
  pendingTOTPSetups.clear()
  sessions.clear()
  clearLoginRateLimit(fixtureIP)
  clearLoginRateLimit(otherIP)
})
afterAll(async () => {
  vi.useRealTimers()
  await client?.close()
})

export async function invoke(
  route: EndpointContract,
  options: {
    body?: unknown
    query?: unknown
    cookie?: unknown
    ip?: string
    userId?: string
    db?: unknown
    io?: unknown
    media?: Record<string, unknown>
    core?: unknown
  } = {}
) {
  const configuration = route.getValue()
  const cookies: {
    name: string
    value: string
    options: Record<string, unknown>
  }[] = []
  const req = {
    ip: options.ip ?? fixtureIP,
    socket: {},
    cookies: { refresh_token: options.cookie },
    protocol: 'https',
    secure: true,
    io: options.io,
    headers: {}
  } as unknown as Request
  const res = {
    locals: { userId: options.userId ?? fixtureUser.id },
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options })
      return this
    }
  } as unknown as Response
  const result = await configuration.callback({
    db: options.db ?? database,
    req,
    res,
    body: configuration.schema.body?.parse(options.body),
    query: configuration.schema.query?.parse(options.query),
    media: options.media ?? {},
    core: options.core ?? {}
  } as unknown as RequestContext)
  return {
    ...result,
    cookies,
    refresh: cookies.find(
      item => item.name === 'refresh_token' && item.options.maxAge !== 0
    )?.value
  }
}

export async function signIn() {
  const { login } = await import('../routes/login')
  return invoke(login, {
    body: { email: fixtureUser.email, password: fixturePassword }
  })
}
