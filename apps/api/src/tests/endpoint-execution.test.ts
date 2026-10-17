import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEndpointHandler } from '../core/functions/routes/executeEndpoint'

const calls = vi.hoisted(() => ({
  decryptKey: vi.fn(),
  clientError: vi.fn(),
  success: vi.fn(),
  serverError: vi.fn(),
  observe: vi.fn()
}))
vi.mock('@functions/encryption', () => ({
  decryptAESKey: calls.decryptKey,
  decryptPayload: (value: unknown) => value,
  encryptResponse: (value: unknown) => value
}))
vi.mock('@monolith/drizzle', async original => ({
  ...(await original<typeof import('@monolith/drizzle')>()),
  scopeDbForModule: (db: unknown) => db
}))
vi.mock('../core/middlewares/authMiddleware', () => ({
  default: () => () => {}
}))
vi.mock('@monolith/server-utils', async original => ({
  ...(await original<typeof import('@monolith/server-utils')>()),
  observeMutation: calls.observe
}))
vi.mock('../core/functions/routes/utils/coreContext', () => ({
  createCoreContext: () => ({})
}))
vi.mock('../core/functions/routes/utils/response', () => ({
  clientError: calls.clientError,
  serverError: calls.serverError,
  success: calls.success
}))

function configuration(callback: (...args: any[]) => any) {
  return {
    method: 'post',
    description: '',
    encrypted: true,
    noAuth: false,
    schema: { query: undefined, body: undefined },
    media: null,
    output: {},
    noDefaultResponse: false,
    isDownloadable: false,
    rateLimit: true,
    middlewares: [],
    callback
  } as Parameters<typeof createEndpointHandler>[0]
}

beforeEach(() => vi.clearAllMocks())

function request() {
  const persisted: string[] = []
  const transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
    const pending: string[] = []
    const value = await work({
      execute: vi.fn(),
      write: (text: string) => pending.push(text)
    })
    persisted.push(...pending)
    return value
  })
  const req = {
    method: 'POST',
    headers: {},
    body: {},
    query: {},
    is: () => false,
    db: { transaction }
  } as unknown as Request
  const res = {
    locals: { userId: 'user-1' },
    headersSent: false
  } as unknown as Response
  return { req, res, transaction, persisted }
}

describe('endpoint execution boundaries', () => {
  it('aborts before invoking the route or opening a transaction for an invalid encryption header', async () => {
    const { req, res, transaction } = request()
    req.method = 'GET'
    req.headers['x-monolith-key'] = 'invalid'
    calls.decryptKey.mockImplementation(() => {
      throw new Error('bad key')
    })
    const callback = vi.fn()
    await createEndpointHandler(configuration(callback))(req, res)
    expect(transaction).not.toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
    expect(calls.clientError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    )
  })

  it('rolls back writes when an endpoint returns a declared error', async () => {
    const { req, res, persisted } = request()
    const config = configuration(async ({ db }) => {
      ;(db as unknown as { write: (value: string) => void }).write(
        'uncommitted'
      )
      return { $status: 409, payload: 'Conflict' } as never
    })
    await createEndpointHandler(config)(req, res)
    expect(persisted).toEqual([])
    expect(calls.clientError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 409, message: 'Conflict' })
    )
    expect(calls.success).not.toHaveBeenCalled()
  })

  it('commits successful writes and sends the result once', async () => {
    const { req, res, persisted } = request()
    const config = configuration(async ({ db }) => {
      ;(db as unknown as { write: (value: string) => void }).write('committed')
      return { saved: true }
    })
    await createEndpointHandler(config)(req, res)
    expect(persisted).toEqual(['committed'])
    expect(calls.success).toHaveBeenCalledWith(res, { saved: true }, 200)
    expect(calls.observe).toHaveBeenCalledTimes(2)
  })
})
