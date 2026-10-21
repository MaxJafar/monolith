// SPDX-License-Identifier: 0BSD
import type { Request, Response } from 'express'
import { beforeEach, expect, it, vi } from 'vitest'

import authMiddleware from '../core/middlewares/authMiddleware'

const adapters = vi.hoisted(() => ({
  verify: vi.fn(),
  agent: vi.fn(),
  endpoint: vi.fn()
}))
vi.mock('../core/functions/deviceSession', () => ({
  verifyApplicationToken: adapters.verify
}))
vi.mock('../../../../modules/monolith--agents/server/auth', () => ({
  authenticateAgent: adapters.agent,
  agentRuntimeEndpoint: adapters.endpoint
}))
const id = 'a0f55a8f-6ae1-47f1-b18c-9b0cdc91e59b'
beforeEach(() => {
  vi.resetAllMocks()
  adapters.verify.mockResolvedValue({ sub: id })
  adapters.endpoint.mockReturnValue(true)
})

async function request(
  options: {
    token?: string
    cookie?: unknown
    method?: string
    path?: string
    noAuth?: boolean
  } = {}
) {
  const next = vi.fn(),
    send = vi.fn(),
    locals: Record<string, unknown> = {}
  const res = { locals, status: vi.fn(() => ({ send })) }
  const req = {
    headers: { authorization: options.token },
    cookies: { access_token: options.cookie },
    method: options.method ?? 'GET',
    originalUrl: options.path ?? '/user/me',
    db: {}
  }
  await authMiddleware(options.noAuth ?? false)(
    req as unknown as Request,
    res as unknown as Response,
    next
  )
  return { next, send, res, locals }
}
it('authenticates bearer credentials and rejects malformed authorization schemes', async () => {
  expect((await request({ token: 'Bearer valid' })).locals.userId).toBe(id)
  expect(adapters.verify).toHaveBeenCalledWith('valid')
  for (const token of ['Basic valid', 'valid', 'Bearer a b']) {
    const rejected = await request({ token })
    expect(rejected.res.status).toHaveBeenCalledWith(401)
    expect(rejected.next).not.toHaveBeenCalled()
  }
})
it('accepts the file cookie only on a read-only file route', async () => {
  expect(
    (await request({ cookie: 'saved', path: '/files/get?key=x' })).next
  ).toHaveBeenCalledOnce()
  for (const options of [
    { path: '/user/me' },
    { path: '/files/get', method: 'POST' }
  ]) {
    expect(
      (await request({ ...options, cookie: 'saved' })).res.status
    ).toHaveBeenCalledWith(401)
  }
})
it('requires a valid account subject and stops rejected sessions before the next middleware', async () => {
  adapters.verify
    .mockResolvedValueOnce({ sub: 'not-an-account' })
    .mockRejectedValueOnce(new Error('expired'))
  for (let index = 0; index < 2; index++) {
    const rejected = await request({ token: 'Bearer credential' })
    expect(rejected.next).not.toHaveBeenCalled()
    expect(rejected.res.status).toHaveBeenCalledWith(401)
  }
})
it('keeps agent credentials restricted even on public endpoints', async () => {
  adapters.endpoint.mockReturnValueOnce(false)
  expect(
    (await request({ token: 'Bearer za1.credential', noAuth: true })).res.status
  ).toHaveBeenCalledWith(403)
  adapters.agent.mockResolvedValue({
    owner: id,
    principalId: 'agent',
    credentialId: 'credential'
  })
  const accepted = await request({ token: 'Bearer za1.credential' })
  expect(accepted.locals).toEqual({
    userId: id,
    actorType: 'agent',
    principalId: 'agent',
    credentialId: 'credential'
  })
  expect(adapters.verify).not.toHaveBeenCalled()
})
it('allows public requests without a session and forwards agent-store failures', async () => {
  expect((await request({ noAuth: true })).next).toHaveBeenCalledOnce()
  const failure = new Error('database unavailable')
  adapters.agent.mockRejectedValue(failure)
  expect(
    (await request({ token: 'Bearer za1.credential' })).next
  ).toHaveBeenCalledWith(failure)
})
