// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useLocationSearch, validLocations } from './search'

const api = vi.hoisted(() => ({
  enabled: true,
  searches: [] as string[],
  search: vi.fn()
}))
vi.mock('@monolith/api', () => ({
  useAPIEndpoint: () => 'https://fixture.test'
}))
vi.mock('@/utils/workspaceAPI', () => ({
  workspaceAPI: {
    checkAPIKeys: () => ({
      setHost: () => ({
        queryOptions: (options: object) => ({
          queryKey: ['fixture', 'capability'],
          queryFn: async () => api.enabled,
          ...options
        })
      })
    }),
    locations: {
      search: {
        setHost: () => ({
          input: ({ q }: { q: string }) => ({
            queryOptions: (options: object) => ({
              queryKey: ['fixture', 'locations', q],
              queryFn: () => {
                api.searches.push(q)
                return api.search(q)
              },
              ...options
            })
          })
        })
      }
    }
  }
}))
const place = {
  name: 'Baku',
  formattedAddress: 'Azerbaijan',
  location: { latitude: 40.4, longitude: 49.8 }
}
let host: HTMLDivElement,
  root: Root,
  client: QueryClient,
  state: ReturnType<typeof useLocationSearch>
function Read({ query, disabled }: { query: string; disabled?: boolean }) {
  state = useLocationSearch(query, disabled)
  return null
}
async function render(query: string, disabled = false) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Read query={query} disabled={disabled} />
      </QueryClientProvider>
    )
  )
}
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  api.enabled = true
  api.searches = []
  api.search.mockReset().mockResolvedValue([place])
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it('filters invalid provider coordinates and preserves the public location shape', () => {
  expect(
    validLocations([
      place,
      { ...place, location: { latitude: 92, longitude: 0 } },
      null,
      { ...place, name: '' }
    ])
  ).toEqual([place])
  expect(validLocations({})).toEqual([])
})
it('debounces requests and immediately hides old suggestions when the search changes', async () => {
  await render(' Baku ')
  await tick(360)
  // Query notifications are scheduled after React commits the debounced request.
  await tick(1)
  expect(api.searches).toEqual(['Baku'])
  expect(state.results).toEqual([place])
  await render('Paris')
  expect(state.results).toEqual([])
  await tick(100)
  await render('Berlin')
  await tick(360)
  expect(api.searches).toEqual(['Baku', 'Berlin'])
})
it('does not search when the provider is unconfigured or the field is disabled', async () => {
  api.enabled = false
  await render('Baku')
  await tick(400)
  expect(state.enabled).toBe(false)
  expect(api.searches).toEqual([])
  await render('Paris', true)
  await tick(400)
  expect(api.searches).toEqual([])
})
