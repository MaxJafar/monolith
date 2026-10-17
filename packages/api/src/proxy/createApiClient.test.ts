import { describe, expect, it } from 'vitest'

import { createApiClient } from './createApiClient'
import { globalProxyRegistry } from './registry'

const endpoint = {
  method: 'post',
  encrypted: false,
  input: {},
  output: {}
} as const
describe('contract routes that share endpoint helper names', () => {
  it('resolves the RAG query route before the query helper', () => {
    const contract = { search: { query: endpoint } }
    globalProxyRegistry.set(contract, {
      remoteId: '',
      apiHost: 'https://example.invalid'
    })
    const api = createApiClient(contract)
    expect(typeof api.search.query.mutate).toBe('function')
    expect(api.search.query.key).toEqual(['search', 'query'])
    expect(api.search.query.endpoint).toMatch(/search\/query$/)
  })
  it('keeps helper functions on actual endpoints and group query keys', () => {
    const api = createApiClient({ docs: { list: endpoint } })
    expect(typeof api.docs.list.query).toBe('function')
    expect(typeof api.docs.list.input).toBe('function')
    expect(api.docs.key).toEqual(['docs'])
    expect(api.docs.list.input(undefined).key).toEqual(['docs', 'list', {}])
  })
  it('allows nested route names such as mutate without shadowing leaf mutations', () => {
    const api = createApiClient({ tools: { mutate: endpoint } })
    expect(api.tools.mutate.key).toEqual(['tools', 'mutate'])
    expect(typeof api.tools.mutate.mutate).toBe('function')
  })
})
