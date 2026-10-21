// SPDX-License-Identifier: 0BSD
import { eq } from 'drizzle-orm'
import { expect, it, vi } from 'vitest'

import { refresh } from '../routes/refresh'
import { authRefreshTokens } from '../schema.drizzle'
import { createRefreshTokenStore, findToken } from '../utils/refreshTokenStore'
import { hashToken } from '../utils/tokens'
import {
  database,
  fixtureIP,
  fixtureUser,
  invoke,
  otherIP,
  signIn
} from './fixture'

it('rotates persisted credentials repeatedly and retires each previous credential', async () => {
  let credential = (await signIn()).refresh
  for (let index = 0; index < 3; index++) {
    const rotated = await invoke(refresh, { cookie: credential })
    expect(rotated.$status).toBe(200)
    expect(rotated.refresh).not.toBe(credential)
    expect((await findToken(credential!))?.revoked).toBe(true)
    credential = rotated.refresh
  }
  expect((await findToken(credential!))?.revoked).toBe(false)
})
it('revokes the successor family when a consumed credential is replayed', async () => {
  const first = (await signIn()).refresh
  const second = (await invoke(refresh, { cookie: first })).refresh
  expect((await invoke(refresh, { cookie: first })).$status).toBe(401)
  expect((await invoke(refresh, { cookie: second })).$status).toBe(401)
})
it('rejects another address and revokes that refresh family', async () => {
  const cookie = (await signIn()).refresh
  expect((await invoke(refresh, { cookie, ip: otherIP })).$status).toBe(401)
  expect((await findToken(cookie!))?.revoked).toBe(true)
})
it.each([undefined, '', [], {}, 'unknown'])(
  'rejects absent, malformed and unknown cookies',
  async cookie => {
    const rejected = await invoke(refresh, { cookie })
    expect(rejected.$status).toBe(401)
    expect(rejected.cookies).toEqual([])
  }
)
it('does not rotate an expired credential or a credential for a deleted account', async () => {
  const cookie = (await signIn()).refresh!
  await database.update(authRefreshTokens).set({ expires_at: new Date(1) })
  expect((await invoke(refresh, { cookie })).$status).toBe(401)
  await database
    .update(authRefreshTokens)
    .set({ expires_at: new Date(Date.now() + 100000) })
  const { users } = await import('../../user/schema.drizzle')
  await database.delete(users).where(eq(users.id, fixtureUser.id))
  expect((await invoke(refresh, { cookie })).$status).toBe(401)
  expect(await database.query.authRefreshTokens.findMany()).toHaveLength(1)
})
it('lets only one simultaneous transaction claim a refresh credential', async () => {
  const cookie = (await signIn()).refresh!
  const previous = (await findToken(cookie))!
  const store = createRefreshTokenStore(database as never)
  const rotated = await Promise.all(
    ['successor-one', 'successor-two'].map(newToken =>
      store.rotate({
        oldTokenHash: hashToken(cookie),
        newToken,
        ip: fixtureIP,
        family: previous.family
      })
    )
  )
  expect(rotated.filter(Boolean)).toHaveLength(1)
  expect(
    await database.query.authRefreshTokens.findMany({
      where: { revoked: false }
    })
  ).toHaveLength(1)
})
it('rolls back the old credential claim when successor persistence fails', async () => {
  const cookie = (await signIn()).refresh!
  const previous = (await findToken(cookie))!
  const failing = {
    transaction: (work: (tx: unknown) => unknown) =>
      database.transaction(
        async tx =>
          work(
            new Proxy(tx, {
              get(target, property) {
                if (property === 'insert')
                  return () => {
                    throw new Error('simulated write failure')
                  }
                const value = Reflect.get(target, property)
                return typeof value === 'function' ? value.bind(target) : value
              }
            })
          ) as never
      )
  }
  await expect(
    createRefreshTokenStore(failing as never).rotate({
      oldTokenHash: previous.token_hash,
      newToken: 'next',
      ip: fixtureIP,
      family: previous.family
    })
  ).rejects.toThrow('simulated write failure')
  expect((await findToken(cookie))?.revoked).toBe(false)
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
