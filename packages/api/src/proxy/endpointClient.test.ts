import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APIError } from '../client/fetch'
import { EndpointClient } from './endpointClient'

type TestContract = {
  __isEndpointContract: true
  __input: { body: { title?: string } }
  __media: null
  __output: { saved: boolean }
}

const mocked = vi.hoisted(() => ({
  fetch: vi.fn(),
  initialize: vi.fn(),
  encrypt: vi.fn(),
  session: vi.fn()
}))
vi.mock('../client/fetch', async importOriginal => ({
  ...(await importOriginal<typeof import('../client/fetch')>()),
  fetchAPI: mocked.fetch
}))
vi.mock('../crypto/encryption', () => ({
  encryptRequest: mocked.encrypt,
  initializeEncryption: mocked.initialize,
  createEncryptionSession: mocked.session,
  isEncryptedResponse: () => false,
  decryptResponse: vi.fn()
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocked.initialize.mockResolvedValue(undefined)
  mocked.encrypt.mockResolvedValue({
    payload: { data: 'synthetic' },
    session: {}
  })
  mocked.session.mockResolvedValue({ encryptedKey: 'synthetic', session: {} })
})

describe('server encryption key rotation', () => {
  it.each(['mutate', 'query'] as const)(
    're-encrypts %s once after a stale-key rejection',
    async method => {
      mocked.fetch
        .mockRejectedValueOnce(
          new APIError(
            method === 'mutate'
              ? 'Failed to decrypt payload'
              : 'Failed to decrypt encryption key',
            400
          )
        )
        .mockResolvedValueOnce({ saved: true })
      const endpoint = new EndpointClient<TestContract>(
        'https://example.invalid',
        'workspace/save'
      )
      expect(
        await (method === 'mutate'
          ? endpoint.mutate({ title: 'synthetic' })
          : endpoint.query())
      ).toEqual({ saved: true })
      expect(mocked.initialize).toHaveBeenCalledWith('https://example.invalid')
      expect(mocked.initialize).toHaveBeenCalledTimes(1)
      expect(mocked.fetch).toHaveBeenCalledTimes(2)
    }
  )
  it('never replays an ordinary failed mutation or loops on repeated key failures', async () => {
    const endpoint = new EndpointClient<TestContract>(
      'https://example.invalid',
      'workspace/save'
    )
    mocked.fetch.mockRejectedValueOnce(
      new APIError('Database unavailable', 500)
    )
    await expect(endpoint.mutate({})).rejects.toThrow('Database unavailable')
    expect(mocked.initialize).not.toHaveBeenCalled()
    mocked.fetch.mockRejectedValue(
      new APIError('Failed to decrypt payload', 400)
    )
    await expect(endpoint.mutate({})).rejects.toThrow(
      'Failed to decrypt payload'
    )
    expect(mocked.initialize).toHaveBeenCalledTimes(1)
    expect(mocked.fetch).toHaveBeenCalledTimes(3)
  })
})
