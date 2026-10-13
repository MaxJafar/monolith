import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { createForgeProxy, globalProxyRegistry } from '@lifeforge/api'

import { contract } from '../../contract'

const ownerA = '00000000-0000-4000-8000-000000000001'
const ownerB = '00000000-0000-4000-8000-000000000002'
const forgeAPI = createForgeProxy(contract)

globalProxyRegistry.set(contract, { remoteId: 'zillion--gym' })

function deferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>(done => {
    resolve = done
  })

  return { promise, resolve }
}

describe('owner-scoped Gym query cache', () => {
  it.each([
    ['snapshot', forgeAPI.snapshot.key],
    ['coach', forgeAPI.coach.key],
    ['push status', forgeAPI.pushStatus.key]
  ])(
    'keeps a delayed %s response separate after switching owners',
    async (_name, endpointKey) => {
      const cache = new QueryClient({
        defaultOptions: { queries: { retry: false } }
      })
      const keyA = [...endpointKey, ownerA]
      const keyB = [...endpointKey, ownerB]
      const delayed = deferred<string>()
      const pendingA = cache.fetchQuery({
        queryKey: keyA,
        queryFn: () => delayed.promise
      })
      const observerB = new QueryObserver(cache, {
        queryKey: keyB,
        queryFn: async () => 'Private owner B data',
        enabled: false
      })
      const unsubscribe = observerB.subscribe(() => {})

      try {
        expect(observerB.getCurrentResult().data).toBeUndefined()
        await observerB.refetch()
        expect(observerB.getCurrentResult().data).toBe('Private owner B data')

        // A request can complete even after its old component has unmounted.
        delayed.resolve('Private owner A data')
        await pendingA

        expect(cache.getQueryData(keyA)).toBe('Private owner A data')
        expect(cache.getQueryData(keyB)).toBe('Private owner B data')
        expect(observerB.getCurrentResult().data).toBe('Private owner B data')
      } finally {
        unsubscribe()
        cache.clear()
      }
    }
  )

  it('does not expose cached coaching data to a different owner', () => {
    const cache = new QueryClient()
    const keyA = [...forgeAPI.coach.key, ownerA]
    const keyB = [...forgeAPI.coach.key, ownerB]

    try {
      cache.setQueryData(keyA, { privateNotes: 'Owner A coaching feedback' })
      const observerB = new QueryObserver(cache, {
        queryKey: keyB,
        enabled: false
      })

      expect(observerB.getCurrentResult().data).toBeUndefined()
      expect(cache.getQueryData(keyB)).toBeUndefined()
      expect(cache.getQueryData(keyA)).toEqual({
        privateNotes: 'Owner A coaching feedback'
      })
    } finally {
      cache.clear()
    }
  })

  it('retains contract-prefix invalidation for all owner-scoped routes', async () => {
    const cache = new QueryClient()
    const keys = [
      [...forgeAPI.snapshot.key, ownerA],
      [...forgeAPI.snapshot.key, ownerB],
      [...forgeAPI.coach.key, ownerB],
      [...forgeAPI.pushStatus.key, ownerB]
    ]

    try {
      for (const key of keys) cache.setQueryData(key, 'Saved private data')
      await cache.invalidateQueries({
        queryKey: forgeAPI.key,
        refetchType: 'none'
      })

      for (const key of keys)
        expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
    } finally {
      cache.clear()
    }
  })
})
