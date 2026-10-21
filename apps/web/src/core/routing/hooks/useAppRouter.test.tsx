// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useAppRouter } from './useAppRouter'

const mock = vi.hoisted(() => ({
  auth: null as any,
  modules: null as any,
  create: vi.fn(),
  configure: vi.fn()
}))
vi.mock('@monolith/api', () => ({ useAuth: () => mock.auth }))
vi.mock('@monolith/federation', () => ({ useFederation: () => mock.modules }))
vi.mock('react-router', () => ({ createBrowserRouter: mock.create }))
vi.mock('../utils/routerFactory', () => ({
  createRouterConfig: mock.configure,
  createAuthLoadingConfig: () => [{ path: 'loading' }],
  createAuthRouterConfig: () => [{ path: 'auth' }]
}))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, current: ReturnType<typeof useAppRouter>
function Probe() {
  current = useAppRouter()
  return null
}
async function render() {
  await act(async () => root.render(<Probe />))
}
function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise(yes => (resolve = yes))
  return { resolve, promise }
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.auth = { auth: true, authLoading: false, userData: { id: 'one' } }
  mock.modules = { moduleGroups: [{ items: [] }], loading: false, error: null }
  mock.configure.mockResolvedValue([{ path: 'app' }])
  mock.create.mockImplementation(routes => ({ routes, dispose: vi.fn() }))
  root = createRoot(document.createElement('div'))
})
afterEach(() => act(() => root.unmount()))
it('discards navigation configuration from a previous account', async () => {
  const first = deferred(),
    second = deferred()
  mock.configure
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  await render()
  mock.auth = { ...mock.auth, userData: { id: 'two' } }
  await render()
  await act(async () => second.resolve([{ path: 'two' }]))
  expect(current.routerKey).toContain('two')
  const active = current.router
  await act(async () => first.resolve([{ path: 'one' }]))
  expect(current.router).toBe(active)
  expect(mock.create).toHaveBeenCalledTimes(1)
})
it('disposes old routers and changes the mounting key after inventory refresh', async () => {
  await render()
  const old = current.router!,
    key = current.routerKey
  mock.modules = {
    ...mock.modules,
    moduleGroups: [{ items: [{ name: 'added' }] }]
  }
  await render()
  expect(old.dispose).toHaveBeenCalledOnce()
  expect(current.routerKey).not.toBe(key)
  expect(current.router).not.toBe(old)
})
it('renders sign-in independently of addon discovery while signed out', async () => {
  mock.auth = { auth: false, authLoading: false, userData: null }
  mock.modules = { moduleGroups: [], loading: true, error: null }
  await render()
  expect(current.routerKey).toContain('auth:anonymous')
  expect(mock.configure).not.toHaveBeenCalled()
})
it('reports configuration and addon discovery failures', async () => {
  mock.configure.mockRejectedValueOnce(new Error('Navigation failed'))
  await render()
  expect(current.error).toBe('Navigation failed')
  mock.auth = { ...mock.auth, userData: { id: 'other' } }
  mock.modules = {
    moduleGroups: [],
    loading: false,
    error: new Error('Addon catalog unavailable')
  }
  await render()
  expect(current.error).toBe('Addon catalog unavailable')
})
