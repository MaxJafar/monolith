import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CanvasPage } from '@monolith/blocks'

const enabled = process.env.MONOLITH_PAGE_INTEGRATION === '1'
const api = process.env.TEST_API_URL ?? 'http://127.0.0.1:3636'
const database = process.env.DATABASE_ADMIN_URL ?? ''

if (enabled) {
  const db = new URL(database)
  const target = new URL(api)

  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(db.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(db.hostname) ||
    db.port !== '55432' ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(db.pathname) ||
    target.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.port !== '3636' ||
    target.pathname !== '/' ||
    target.search ||
    target.hash ||
    target.username ||
    target.password
  )
    throw new Error('Page fixtures require the isolated local database and API')
}

const db = postgres(
  enabled ? database : 'postgres://127.0.0.1:55432/zillion_test_disabled',
  { max: 2 }
)
const accounts = [randomUUID(), randomUUID()]
const password = `Fixture-${randomUUID()}!`
const tokens: string[] = []
const key = `/page/${randomUUID()}`
const otherKey = `/page/${randomUUID()}`
const page: CanvasPage = {
  version: 1,
  title: 'Synthetic page',
  icon: 'lucide:file-text',
  fullWidth: false,
  revision: 0,
  updated: null,
  blocks: [
    {
      id: randomUUID(),
      type: 'button',
      title: 'Projects',
      width: 'half',
      content: '',
      url: '/projects',
      widget: ''
    }
  ]
}

async function request(path: string, body?: unknown, owner?: number) {
  const result = await fetch(`${api}/user/pages/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(owner === undefined
        ? {}
        : { Authorization: `Bearer ${tokens[owner]}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  })

  return { status: result.status, payload: await result.json() }
}

beforeAll(async () => {
  if (!enabled) return

  const hashed = await hash(password, 4)

  for (const id of accounts) {
    const email = `page-${id}@example.invalid`

    await db`insert into users(id,email,username,name,auth_password_hash) values(${id},${email},${id},'Synthetic page owner',${hashed})`
    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000)
    })
    expect(response.status).toBe(200)
    tokens.push((await response.json()).data.accessToken)
  }
})

afterAll(async () => {
  if (enabled)
    for (const id of accounts) {
      await db`delete from auth__refresh_tokens where user_id=${id}`
      await db`delete from users where id=${id}`
    }
  await db.end()
})

describe.skipIf(!enabled)('Owned workspace pages through the real API', () => {
  it('requires authentication', async () => {
    expect((await request(`get?key=${encodeURIComponent(key)}`)).status).toBe(
      401
    )
    expect((await request('list')).status).toBe(401)
    expect(
      (await request('save', { key, page, expected_revision: 0 })).status
    ).toBe(401)
  })

  it('persists blocks and supplies server revisions and timestamps', async () => {
    expect(
      (await request(`get?key=${encodeURIComponent(key)}`, undefined, 0))
        .payload.data.page
    ).toBeNull()
    const result = await request('save', { key, page, expected_revision: 0 }, 0)

    expect(result.status).toBe(200)
    expect(result.payload.data.page).toMatchObject({
      ...page,
      revision: 1,
      updated: expect.any(String)
    })
    expect(Number.isFinite(Date.parse(result.payload.data.page.updated))).toBe(
      true
    )
    const fetched = await request(
      `get?key=${encodeURIComponent(key)}`,
      undefined,
      0
    )

    expect(fetched.payload.data.page).toEqual(result.payload.data.page)
    expect((await request('list', undefined, 0)).payload.data).toEqual([
      { key, title: page.title, icon: page.icon, revision: 1 }
    ])
  })

  it('keeps the same page path private to each account', async () => {
    expect(
      (await request(`get?key=${encodeURIComponent(key)}`, undefined, 1))
        .payload.data.page
    ).toBeNull()
    expect((await request('list', undefined, 1)).payload.data).toEqual([])
    expect(
      (
        await request(
          'save',
          {
            key,
            page: { ...page, title: 'Second owner' },
            expected_revision: 0
          },
          1
        )
      ).status
    ).toBe(200)
    expect(
      (await request(`get?key=${encodeURIComponent(key)}`, undefined, 0))
        .payload.data.page.title
    ).toBe('Synthetic page')
  })

  it('allows only one concurrent writer and preserves unrelated pages', async () => {
    expect(
      (await request('save', { key: otherKey, page, expected_revision: 0 }, 0))
        .status
    ).toBe(200)
    const results = await Promise.all(
      ['First edit', 'Second edit'].map(title =>
        request(
          'save',
          { key, page: { ...page, title }, expected_revision: 1 },
          0
        )
      )
    )

    expect(results.map(result => result.status).sort()).toEqual([200, 409])
    const winner = results.find(result => result.status === 200)!
    const fetched = await request(
      `get?key=${encodeURIComponent(key)}`,
      undefined,
      0
    )

    expect(fetched.payload.data.page).toEqual(winner.payload.data.page)
    expect(fetched.payload.data.page.revision).toBe(2)
    expect(
      (await request(`get?key=${encodeURIComponent(otherKey)}`, undefined, 0))
        .payload.data.page.title
    ).toBe('Synthetic page')
  })

  it('rejects unsafe links, forged fields and malformed documents without changing saved data', async () => {
    const before = (
      await request(`get?key=${encodeURIComponent(key)}`, undefined, 0)
    ).payload.data.page

    for (const invalid of [
      { ...page, blocks: [{ ...page.blocks[0], url: 'javascript:alert(1)' }] },
      { ...page, owner_id: accounts[1] },
      {
        ...page,
        blocks: [
          {
            ...page.blocks[0],
            type: 'document',
            content: 'zillion:blocks:v1\n{broken'
          }
        ]
      },
      { ...page, blocks: [page.blocks[0], page.blocks[0]] }
    ])
      expect(
        (await request('save', { key, page: invalid, expected_revision: 2 }, 0))
          .status
      ).toBe(400)

    expect(
      (
        await request(
          'save',
          { key: '/../foreign', page, expected_revision: 0 },
          0
        )
      ).status
    ).toBe(400)
    expect(
      (await request(`get?key=${encodeURIComponent(key)}`, undefined, 0))
        .payload.data.page
    ).toEqual(before)
  })
})
