import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  getProvider,
  registerProvider
} from '../core/functions/external/ai/providers'
import {
  createChatProvider,
  decodeCompletion
} from '../core/functions/external/ai/providers/chatTransport'

const { complete, createClient } = vi.hoisted(() => ({
  complete: vi.fn(),
  createClient: vi.fn()
}))
vi.mock('openai', () => ({
  default: class {
    constructor(options: unknown) {
      createClient(options)
    }
    chat = { completions: { create: complete } }
  }
}))

beforeEach(() => vi.clearAllMocks())

describe('Monolith AI transport', () => {
  it('validates structured JSON, including valid false/zero values', () => {
    expect(decodeCompletion('false', z.boolean())).toBe(false)
    expect(decodeCompletion('0', z.number())).toBe(0)
    expect(() => decodeCompletion('invalid', z.object({}))).toThrow(
      'valid JSON'
    )
    expect(() =>
      decodeCompletion('{"count":"wrong"}', z.object({ count: z.number() }))
    ).toThrow('schema')
  })

  it('builds real JSON Schema and preserves caller messages', async () => {
    complete.mockResolvedValue({
      choices: [{ message: { content: '{"count":2}' } }]
    })
    const provider = createChatProvider({
      name: 'fixture',
      baseURL: 'https://example.test/v1',
      structured: 'json'
    })
    const messages = [{ role: 'user' as const, content: 'Count items' }]
    const result = await provider.fetch({
      apiKey: 'test',
      model: 'fixture',
      messages,
      structure: z.object({ count: z.number() })
    })
    expect(result).toEqual({ count: 2 })
    expect(messages).toHaveLength(1)
    const request = complete.mock.calls[0]![0]
    expect(request.response_format).toEqual({ type: 'json_object' })
    expect(request.messages[0].content).toContain('"type":"number"')
    expect(request.messages[0].content).not.toContain('_def')
  })

  it('uses chat schema requests for the local provider and rejects missing cloud credentials', async () => {
    complete.mockResolvedValue({
      choices: [{ message: { content: '{"value":"ok"}' } }]
    })
    const local = createChatProvider({
      name: 'ollama',
      baseURL: 'http://localhost:11434/v1',
      local: true,
      structured: 'schema'
    })
    await local.fetch({
      model: 'local',
      messages: [],
      structure: z.object({ value: z.string() })
    })
    expect(complete.mock.calls[0]![0].response_format.type).toBe('json_schema')
    expect(createClient.mock.calls[0]![0].apiKey).toBe('ollama')
    const cloud = createChatProvider({
      name: 'cloud',
      baseURL: 'https://example.test',
      structured: 'none'
    })
    await expect(cloud.fetch({ model: 'x', messages: [] })).rejects.toThrow(
      'API key'
    )
  })

  it('keeps provider registration separate from inherited object properties', () => {
    const provider = createChatProvider({
      name: 'fixture',
      baseURL: 'https://example.test',
      structured: 'none'
    })
    registerProvider('fixture', provider)
    expect(getProvider('fixture')?.name).toBe('fixture')
    expect(getProvider('constructor')).toBeUndefined()
    expect(() => registerProvider('other', provider)).toThrow('registration')
  })
})
