// SPDX-License-Identifier: 0BSD
import { eq } from 'drizzle-orm'
import speakeasy from 'speakeasy'
import { expect, it, vi } from 'vitest'

import { users } from '../../user/schema.drizzle'
import * as qr from '../routes/qrLogin'
import * as totp from '../routes/twoFA'
import { pending2FASessions, pendingTOTPSetups } from '../utils/2fa'
import { sessions } from '../utils/qrLogin'
import { verifyAccessToken } from '../utils/tokens'
import { database, fixtureUser, invoke, otherIP, signIn } from './fixture'

it('supports authenticator enrollment, retry, sign-in and disabling with persisted encryption', async () => {
  const setup = await invoke(totp.generate)
  const { tid, link } = setup.payload as { tid: string; link: string }
  const secret = new URL(link).searchParams.get('secret')!
  expect(
    (await invoke(totp.enable, { body: { tid, otp: 'bad' } })).$status
  ).toBe(401)
  expect(pendingTOTPSetups.has(tid)).toBe(true)
  const otp = speakeasy.totp({ secret, encoding: 'base32' })
  expect((await invoke(totp.enable, { body: { tid, otp } })).$status).toBe(204)
  const account = await database.query.users.findFirst()
  expect(account?.twoFASecret).not.toBe(secret)
  const pending = (await signIn()).payload as { tid: string }
  expect(
    (await invoke(totp.verify, { body: { tid: pending.tid, otp: 'bad' } }))
      .$status
  ).toBe(401)
  expect(pending2FASessions.has(pending.tid)).toBe(true)
  const completed = await invoke(totp.verify, {
    body: { tid: pending.tid, otp }
  })
  expect(completed.$status).toBe(200)
  expect(completed.refresh).toBeTruthy()
  expect(
    (await invoke(totp.verify, { body: { tid: pending.tid, otp } })).$status
  ).toBe(401)
  expect((await invoke(totp.disable)).$status).toBe(204)
  expect((await database.query.users.findFirst())?.twoFASecret).toBeNull()
})
it('binds authenticator setup to its owner and expires pending sign-ins', async () => {
  const setup = (await invoke(totp.generate)).payload as {
    tid: string
    link: string
  }
  const secret = new URL(setup.link).searchParams.get('secret')!
  const otp = speakeasy.totp({ secret, encoding: 'base32' })
  expect(
    (
      await invoke(totp.enable, {
        userId: 'another-user',
        body: { tid: setup.tid, otp }
      })
    ).$status
  ).toBe(401)
  vi.useFakeTimers()
  vi.setSystemTime(Date.now() + 301000)
  expect(
    (await invoke(totp.enable, { body: { tid: setup.tid, otp } })).$status
  ).toBe(401)
  vi.useRealTimers()
})
it('approves QR sign-in once, broadcasts it and binds the claimed session to the receiving browser', async () => {
  const registered = await invoke(qr.register, {
    body: { browserInfo: 'Fixture desktop' }
  })
  const { sessionId } = registered.payload as { sessionId: string }
  expect(
    (await invoke(qr.status, { query: { sessionId } })).payload
  ).toMatchObject({ status: 'pending' })
  const emit = vi.fn()
  const io = { of: vi.fn(() => ({ to: vi.fn(() => ({ emit })) })) }
  expect(
    (await invoke(qr.approve, { body: { sessionId }, io })).payload
  ).toEqual({ browserInfo: 'Fixture desktop' })
  expect(emit).toHaveBeenCalledWith('sessionApproved', {
    accessToken: expect.any(String)
  })
  expect((await invoke(qr.approve, { body: { sessionId } })).$status).toBe(400)
  const approved = (await invoke(qr.status, { query: { sessionId } }))
    .payload as { accessToken: string }
  expect(verifyAccessToken(approved.accessToken).sub).toBe(fixtureUser.id)
  const results = await Promise.all(
    [0, 1].map(() => invoke(qr.claim, { body: { sessionId }, ip: otherIP }))
  )
  expect(results.map(item => item.$status).sort()).toEqual([200, 404])
  expect(sessions.has(sessionId)).toBe(false)
  expect(await database.query.authRefreshTokens.findMany()).toEqual([
    expect.objectContaining({ userId: fixtureUser.id, bound_ip: otherIP })
  ])
})
it('does not approve a QR session consumed or replaced during an asynchronous account lookup', async () => {
  const registered = await invoke(qr.register, {
    body: { browserInfo: 'Fixture' }
  })
  const { sessionId } = registered.payload as { sessionId: string }
  const suspended = {
    query: {
      users: {
        findFirst: async () => {
          sessions.del(sessionId)
          return fixtureUser
        }
      }
    }
  }
  expect(
    (await invoke(qr.approve, { body: { sessionId }, db: suspended })).$status
  ).toBe(404)
  expect(await database.query.authRefreshTokens.findMany()).toEqual([])
})
it('rejects a second-factor challenge when its account or stored secret is unavailable', async () => {
  await database
    .update(users)
    .set({ twoFASecret: 'unreadable' })
    .where(eq(users.id, fixtureUser.id))
  const pending = (await signIn()).payload as { tid: string }
  expect(
    (await invoke(totp.verify, { body: { tid: pending.tid, otp: '123456' } }))
      .$status
  ).toBe(401)
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
