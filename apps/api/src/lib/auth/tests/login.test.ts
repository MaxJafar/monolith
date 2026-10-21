// SPDX-License-Identifier: 0BSD
import { hash as bcryptHash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { expect, it, vi } from 'vitest'

import { users } from '../../user/schema.drizzle'
import { login } from '../routes/login'
import { pending2FASessions } from '../utils/2fa'
import { verifyAccessToken } from '../utils/tokens'
import {
  database,
  fixturePassword,
  fixtureUser,
  invoke,
  signIn
} from './fixture'

it('authenticates an existing account and writes secure root-path cookies', async () => {
  const signed = await signIn()
  expect(signed.$status).toBe(200)
  const { accessToken } = signed.payload as { accessToken: string }
  expect(verifyAccessToken(accessToken).sub).toBe(fixtureUser.id)
  expect(signed.refresh).toBeTruthy()
  expect(signed.cookies).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'refresh_token',
        options: expect.objectContaining({
          path: '/',
          secure: true,
          httpOnly: true
        })
      }),
      expect.objectContaining({
        name: 'refresh_token',
        value: '',
        options: expect.objectContaining({ path: '/auth', maxAge: 0 })
      })
    ])
  )
  const saved = await database.query.authRefreshTokens.findMany()
  expect(saved).toHaveLength(1)
  expect(saved[0]!.token_hash).not.toBe(signed.refresh)
})
it.each([
  { email: 'missing@example.invalid', password: fixturePassword },
  { email: fixtureUser.email, password: 'incorrect' }
])('does not create credentials for rejected password sign-ins', async body => {
  const rejected = await invoke(login, { body })
  expect(rejected.$status).toBe(401)
  expect(rejected.cookies).toEqual([])
  expect(await database.query.authRefreshTokens.findMany()).toEqual([])
})
it('upgrades stored bcrypt credentials only after successful authentication', async () => {
  const previous = await bcryptHash(fixturePassword, 4)
  await database
    .update(users)
    .set({ auth_password_hash: previous })
    .where(eq(users.id, fixtureUser.id))
  expect((await signIn()).$status).toBe(200)
  const account = await database.query.users.findFirst()
  expect(account?.auth_password_hash).toMatch(/^\$argon2id\$/)
  expect((await signIn()).$status).toBe(200)
})
it('requires the second factor before creating a browser session', async () => {
  await database
    .update(users)
    .set({ twoFASecret: 'configured' })
    .where(eq(users.id, fixtureUser.id))
  const pending = await signIn()
  expect(pending.payload).toMatchObject({ state: '2fa_required' })
  expect(pending.cookies).toEqual([])
  const tid = (pending.payload as { tid: string }).tid
  expect(pending2FASessions.get(tid)).toEqual({ userId: fixtureUser.id })
  expect(await database.query.authRefreshTokens.findMany()).toEqual([])
})
it('validates the public login body before querying credentials', async () => {
  for (const body of [
    {},
    { email: 'not-an-email', password: 'anything' },
    { email: fixtureUser.email, password: '' }
  ]) {
    await expect(invoke(login, { body })).rejects.toThrow()
  }
  expect(await database.query.authRefreshTokens.findMany()).toEqual([])
})

vi.hoisted(() => {
  process.env.JWT_SIGNING_KEY = 'isolated-monolith-auth-fixture-key'
  process.env.MASTER_KEY = 'isolated-monolith-auth-secret-key'
})
vi.mock('../../../core/drizzle', () => ({
  get db() {
    return database
  }
}))
