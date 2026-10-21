// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import LazyRouteLoader from './LazyRouteLoader'

const mock = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@monolith/federation', () => ({ loadRemoteModuleConfig: mock.load }))
vi.mock('@monolith/ui', () => ({
  ErrorScreen: ({ message }: any) => <div role="alert">{message}</div>
}))
vi.mock('@/core/utils/devModeImports', () => ({
  devModeImports: {},
  devModePkgs: []
}))
vi.mock('./RouteLoadingScreen', () => ({ default: () => <div>Loading</div> }))
vi.mock('../utils/routeBuilder', () => ({
  buildChildRoutes: ({ routes }: any) =>
    Object.entries(routes).map(([path, View]: any) => ({
      path,
      element: <View />
    }))
}))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.clearAllMocks()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => act(() => root.unmount()))
function item(name: string) {
  return { name, icon: 'test', routes: {}, rawModule: { name } } as any
}
function render(value: any) {
  return act(async () =>
    root.render(
      <MemoryRouter>
        <LazyRouteLoader item={value} loadingMessage="loading" />
      </MemoryRouter>
    )
  )
}
function deferred() {
  let resolve!: (value: any) => void
  const promise = new Promise<any>(yes => (resolve = yes))
  return { promise, resolve }
}
it('does not show an old addon after switching while loading', async () => {
  const a = deferred(),
    b = deferred()
  mock.load.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
  await render(item('first'))
  await act(async () =>
    a.resolve({ routes: { '/': () => <p>First addon</p> } })
  )
  expect(host.textContent).toBe('First addon')
  await render(item('second'))
  expect(host.textContent).toBe('Loading')
  await act(async () =>
    b.resolve({ routes: { '/': () => <p>Second addon</p> } })
  )
  expect(host.textContent).toBe('Second addon')
})
it('ignores a stale addon resolution', async () => {
  const a = deferred(),
    b = deferred()
  mock.load.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
  await render(item('first'))
  await render(item('second'))
  await act(async () => b.resolve({ routes: { '/': () => <p>Current</p> } }))
  await act(async () => a.resolve({ routes: { '/': () => <p>Stale</p> } }))
  expect(host.textContent).toBe('Current')
})
it('surfaces loader failures and clears them for the next addon', async () => {
  mock.load.mockRejectedValueOnce(new Error('Package unavailable'))
  await render(item('broken'))
  expect(host.querySelector('[role=alert]')?.textContent).toBe(
    'Package unavailable'
  )
  mock.load.mockResolvedValueOnce({ routes: { '/': () => <p>Recovered</p> } })
  await render(item('good'))
  expect(host.textContent).toBe('Recovered')
})
