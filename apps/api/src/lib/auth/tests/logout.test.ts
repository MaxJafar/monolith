// SPDX-License-Identifier: 0BSD
import { expect, it, vi } from 'vitest'

import { logout } from '../routes/logout'
import { refresh } from '../routes/refresh'
import { database, invoke, signIn } from './fixture'

it('expires both cookie paths and prevents refreshing the logged-out session', async () => {
  const cookie = (await signIn()).refresh
  const ended = await invoke(logout, { cookie })
  expect(ended).toMatchObject({ $status: 200, payload: true })
  expect(
    ended.cookies.map(({ name, options }) => [
      name,
      options.path,
      options.maxAge
    ])
  ).toEqual([
    ['access_token', '/', 0],
    ['refresh_token', '/', 0],
    ['refresh_token', '/auth', 0]
  ])
  expect((await invoke(refresh, { cookie })).$status).toBe(401)
})
it('ends the whole family without invalidating a separately signed-in browser', async () => {
  const first = (await signIn()).refresh
  const separate = (await signIn()).refresh
  const successor = (await invoke(refresh, { cookie: first })).refresh
  expect((await invoke(logout, { cookie: first })).$status).toBe(200)
  expect((await invoke(refresh, { cookie: successor })).$status).toBe(401)
  expect((await invoke(refresh, { cookie: separate })).$status).toBe(200)
})
it('clears stale cookies even when a session cannot be located', async () => {
  for (const cookie of [undefined, {}, 'missing']) {
    const ended = await invoke(logout, { cookie })
    expect(ended.$status).toBe(401)
    expect(ended.cookies).toHaveLength(3)
    expect(
      ended.cookies.every(
        item => item.value === '' && item.options.maxAge === 0
      )
    ).toBe(true)
  }
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
