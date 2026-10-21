// SPDX-License-Identifier: 0BSD
import { eq } from 'drizzle-orm'
import { expect, it, vi } from 'vitest'

import { APPEARANCE_LAYOUT_KEY } from '@monolith/blocks'

import { createFirstUser } from '../../user/routes/auth'
import { me } from '../../user/routes/me'
import {
  deleteBgImage,
  updateBgImage,
  updatePersonalization
} from '../../user/routes/personalization'
import {
  deleteAvatar,
  updateAvatar,
  updatePassword,
  updateProfile
} from '../../user/routes/settings'
import { users } from '../../user/schema.drizzle'
import {
  database,
  fixturePassword,
  fixtureUser,
  invoke,
  signIn
} from './fixture'

vi.hoisted(() => {
  process.env.JWT_SIGNING_KEY = 'isolated-monolith-auth-fixture-key'
  process.env.MASTER_KEY = 'isolated-monolith-auth-secret-key'
})
vi.mock('../../../core/drizzle', () => ({
  get db() {
    return database
  }
}))

it('projects only public account properties and never returns secrets or private pages', async () => {
  await database.update(users).set({
    twoFASecret: 'secret',
    APIKeysMasterPasswordHash: 'secret',
    workspacePages: {}
  })
  const result = await invoke(me, { core: { storage: {} } })
  const profile = (result.payload as { userData: Record<string, unknown> })
    .userData
  expect(profile).toMatchObject({
    id: fixtureUser.id,
    twoFAEnabled: true,
    hasAPIKeysMasterPassword: true
  })
  for (const key of [
    'auth_password_hash',
    'twoFASecret',
    'APIKeysMasterPasswordHash',
    'workspacePages',
    'created',
    'updated'
  ]) {
    expect(profile).not.toHaveProperty(key)
  }
})
it('updates only the current account with fields allowed by the profile contract', async () => {
  const other = '8ed02689-4cba-4987-9bb9-e9dc2b69457a'
  await database.insert(users).values({
    id: other,
    email: 'second@example.invalid',
    username: 'second',
    name: 'Unchanged'
  })
  expect(
    (
      await invoke(updateProfile, {
        body: {
          data: {
            name: 'Changed',
            dateOfBirth: '2001-05-06',
            twoFASecret: 'injected'
          }
        }
      })
    ).$status
  ).toBe(204)
  expect(
    await database.query.users.findFirst({ where: { id: fixtureUser.id } })
  ).toMatchObject({
    name: 'Changed',
    dateOfBirth: '2001-05-06',
    twoFASecret: null
  })
  expect(
    (await database.query.users.findFirst({ where: { id: other } }))?.name
  ).toBe('Unchanged')
  await expect(
    invoke(updateProfile, {
      userId: '9b2b87df-46ab-4167-8b31-685d88fdd5cf',
      body: { data: { name: 'No' } }
    })
  ).rejects.toMatchObject({ code: 401 })
})
it('requires the existing password and matching confirmation before replacing credentials', async () => {
  const nextPassword = 'Replacement fixture password'
  expect(
    (
      await invoke(updatePassword, {
        body: {
          oldPassword: 'wrong',
          password: nextPassword,
          passwordConfirm: nextPassword
        }
      })
    ).$status
  ).toBe(400)
  await expect(
    invoke(updatePassword, {
      body: {
        oldPassword: fixturePassword,
        password: nextPassword,
        passwordConfirm: 'Different fixture password'
      }
    })
  ).rejects.toThrow()
  expect((await signIn()).$status).toBe(200)
  expect(
    (
      await invoke(updatePassword, {
        body: {
          oldPassword: fixturePassword,
          password: nextPassword,
          passwordConfirm: nextPassword
        }
      })
    ).$status
  ).toBe(204)
  const { login } = await import('../routes/login')
  expect(
    (
      await invoke(login, {
        body: { email: fixtureUser.email, password: nextPassword }
      })
    ).$status
  ).toBe(200)
  expect((await signIn()).$status).toBe(401)
})
it('keeps appearance-builder data during dashboard preference saves', async () => {
  const appearance = { version: 1, title: 'Saved appearance' }
  await database.update(users).set({
    dashboardLayout: { [APPEARANCE_LAYOUT_KEY]: appearance, oldLayout: true }
  })
  expect(
    (
      await invoke(updatePersonalization, {
        body: {
          data: {
            bordered: false,
            dashboardLayout: {
              widgets: ['clock'],
              [APPEARANCE_LAYOUT_KEY]: 'overwrite attempt'
            }
          }
        }
      })
    ).$status
  ).toBe(204)
  expect((await database.query.users.findFirst())?.dashboardLayout).toEqual({
    widgets: ['clock'],
    [APPEARANCE_LAYOUT_KEY]: appearance
  })
  expect(
    (await invoke(updatePersonalization, { body: { data: {} } })).$status
  ).toBe(400)
})
it('preserves image references and thumbnail requests through upload and removal', async () => {
  const storage = {
    save: vi.fn(async () => ({ key: 'new-image' })),
    delete: vi.fn(async () => {})
  }
  const file = {
    originalname: 'image.png',
    mimetype: 'image/png',
    buffer: Buffer.from('fixture')
  }
  await database
    .update(users)
    .set({ avatar: 'old-avatar', bgImage: 'old-background' })
  expect(
    (await invoke(updateAvatar, { media: { file }, core: { storage } })).payload
  ).toEqual({ key: 'new-image' })
  expect(storage.save).toHaveBeenCalledWith(
    expect.objectContaining({ currentKey: 'old-avatar', thumbs: ['256x0'] })
  )
  expect(
    (await invoke(updateBgImage, { media: { file }, core: { storage } }))
      .$status
  ).toBe(200)
  expect(
    (await database.query.users.findFirst())?.backdropFilters
  ).toMatchObject({ brightness: 100, overlayOpacity: 50 })
  await invoke(deleteAvatar, { core: { storage } })
  await invoke(deleteBgImage, { core: { storage } })
  expect(await database.query.users.findFirst()).toMatchObject({
    avatar: null,
    bgImage: null
  })
  expect(storage.delete).toHaveBeenCalledTimes(2)
})
it('initializes only an empty installation and hashes the first account password', async () => {
  const body = {
    email: 'owner@example.invalid',
    username: 'owner',
    name: 'Owner',
    password: fixturePassword
  }
  expect((await invoke(createFirstUser, { body })).$status).toBe(400)
  await database.delete(users).where(eq(users.id, fixtureUser.id))
  expect((await invoke(createFirstUser, { body })).$status).toBe(201)
  expect(await database.query.users.findFirst()).toMatchObject({
    email: body.email,
    verified: true,
    auth_password_hash: expect.stringMatching(/^\$argon2id\$/)
  })
  expect(
    (
      await invoke(createFirstUser, {
        body: { ...body, email: 'extra@example.invalid' }
      })
    ).$status
  ).toBe(400)
  expect(await database.query.users.findMany()).toHaveLength(1)
})
