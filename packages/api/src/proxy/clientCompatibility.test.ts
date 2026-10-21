// SPDX-License-Identifier: 0BSD
import { describe, expect, it } from 'vitest'

import { createApiClient } from './createApiClient'
import { globalProxyRegistry } from './registry'

const routes = {
  records: {
    list: {
      method: 'get',
      input: {
        query: {
          type: 'object',
          properties: { page: { type: 'number' }, text: { type: 'string' } },
          additionalProperties: false
        }
      },
      output: { OK: { type: 'array', items: { type: 'string' } } }
    }
  }
} as const

describe('add-on client compatibility', () => {
  it('keeps independently constructed queries and previous cache keys unchanged', () => {
    const api = createApiClient(routes)
    const first = api.records.list.input({ page: 1, text: 'a & b' })
    const second = api.records.list.input({ page: 2 })
    const priorKey = first.key
    first.input({ page: 3 })
    expect(priorKey).toEqual(['records', 'list', { page: 1, text: 'a & b' }])
    expect(first.key).toEqual(['records', 'list', { page: 3, text: 'a & b' }])
    expect(second.key).toEqual(['records', 'list', { page: 2 }])
  })
  it('updates existing endpoint references when the active server changes', () => {
    const contract = structuredClone(routes)
    const api = createApiClient(contract)
    globalProxyRegistry.set(contract, {
      remoteId: 'monolith--fixture',
      apiHost: 'https://first.invalid/api'
    })
    const endpoint = api.records.list.input({ text: 'a & b' })
    expect(endpoint.endpoint).toBe(
      'https://first.invalid/api/modules/monolith--fixture/records/list?text=a%20%26%20b'
    )
    expect(endpoint.key.slice(0, 4)).toEqual([
      'modules',
      'monolith--fixture',
      'records',
      'list'
    ])
    globalProxyRegistry.apiHost = 'https://second.invalid/api'
    expect(endpoint.endpoint).toContain('https://second.invalid/api/')
    expect(api.records.key).toEqual(['modules', 'monolith--fixture', 'records'])
  })
  it('offers runtime validation, separate raw cache keys and non-thenable proxies', async () => {
    const api = createApiClient(routes)
    expect(
      api.records.list.schema.query?.safeParse({ page: 'wrong' }).success
    ).toBe(false)
    expect(api.records.list.schema.query?.safeParse({ page: 4 }).success).toBe(
      true
    )
    const query = api.records.list.input({ page: 4 })
    expect(query.rawQueryOptions().queryKey).toEqual([...query.key, 'raw'])
    expect(query.queryOptions({ retry: 3 }).retry).toBe(3)
    expect(query.rawMutationOptions().mutationKey).toEqual([
      ...query.key,
      'raw'
    ])
    expect(await Promise.resolve(api)).toBe(api)
    expect(String(api.records)).toContain('records')
  })
})
