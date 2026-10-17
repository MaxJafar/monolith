import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { createApiClient, globalProxyRegistry } from '@monolith/api'

import contract from '../../contract'

const workspaceAPI = createApiClient(contract)
globalProxyRegistry.set(contract, { remoteId: 'monolith--tech-lab' })
const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'

describe('Tech Lab owner-scoped reads', () => {
  it.each([
    ['snapshot', workspaceAPI.snapshot.key],
    ['history', workspaceAPI.history.key],
    ['telemetry', workspaceAPI.devices.telemetry.key]
  ])('isolates delayed owner responses for %s', async (_name, key) => {
    const cache = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    let resolve!: (value: string) => void

    const delayed = new Promise<string>(done => {
      resolve = done
    })
    const keyA = [...key, first]
    const keyB = [...key, second]
    const pending = cache.fetchQuery({ queryKey: keyA, queryFn: () => delayed })
    const observer = new QueryObserver(cache, {
      queryKey: keyB,
      queryFn: async () => 'Second owner inventory'
    })
    const unsubscribe = observer.subscribe(() => {})

    try {
      expect(observer.getCurrentResult().data).toBeUndefined()
      await observer.refetch()
      resolve('First owner inventory')
      await pending
      expect(observer.getCurrentResult().data).toBe('Second owner inventory')
      expect(cache.getQueryData(keyA)).toBe('First owner inventory')
    } finally {
      unsubscribe()
      cache.clear()
    }
  })
  it('retains contract-prefix invalidation with an owner and selected service appended', async () => {
    const cache = new QueryClient()
    const keys = [
      [...workspaceAPI.snapshot.key, first],
      [...workspaceAPI.history.key, second, first, 24],
      [...workspaceAPI.devices.telemetry.key, second, first]
    ]

    try {
      keys.forEach(key => cache.setQueryData(key, 'inventory'))
      await cache.invalidateQueries({
        queryKey: workspaceAPI.key,
        refetchType: 'none'
      })
      keys.forEach(key =>
        expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
      )
    } finally {
      cache.clear()
    }
  })
})
