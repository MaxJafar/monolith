/// <reference types="vite/client" />
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, useEffect } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useDatabaseCalendar from '../../../../modules/lifeforge--calendar/client/src/hooks/useDatabaseCalendar'

const fixture = vi.hoisted(() => ({
  groups: [] as unknown[],
  load: vi.fn(),
  proxy: vi.fn(),
  feed: vi.fn(),
  people: vi.fn()
}))
vi.mock('../../../../packages/federation/dist/index.js', () => ({
  useFederation: () => ({
    moduleGroups: fixture.groups,
    loading: false,
    error: null
  }),
  loadRemoteModuleConfig: fixture.load
}))
vi.mock('@lifeforge/api', () => ({
  contract: {},
  globalProxyRegistry: { set: vi.fn() },
  createForgeProxy: (contract: unknown) => {
    fixture.proxy(contract)
    const feed = {
      input: () => feed,
      queryOptions: () => ({
        queryKey: ['fixture-feed'],
        queryFn: fixture.feed
      })
    }

    return {
      calendarFeed: feed,
      people: {
        queryOptions: () => ({
          queryKey: ['fixture-people'],
          queryFn: fixture.people
        })
      }
    }
  }
}))

const raw = {
  id: 'zillion--databases',
  remoteId: 'database-remote',
  name: '@lifeforge/zillion--databases'
}
const contract = { calendarFeed: { method: 'get' }, people: { method: 'get' } }

let root: Root
let client: QueryClient
let container: HTMLDivElement
let current: ReturnType<typeof useDatabaseCalendar> | undefined

function Capture() {
  const state = useDatabaseCalendar()

  useEffect(() => {
    current = state
  }, [state])

  return null
}

async function render() {
  await act(async () =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Capture))
    )
  )
}

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 5))
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void

  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })

  return { promise, resolve, reject }
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  fixture.groups = [{ title: 'Workspace', items: [{ ...raw, rawModule: raw }] }]
  fixture.load.mockReset()
  fixture.proxy.mockReset()
  fixture.feed.mockReset()
  fixture.people.mockReset()
  fixture.feed.mockResolvedValue({ sources: [], items: [] })
  fixture.people.mockResolvedValue([])
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  current = undefined
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  container.remove()
})

describe('Calendar database federation on a cold direct URL', () => {
  it('loads metadata-only manifests, preserves contract identity, then enables feed and people', async () => {
    const pending = deferred<{ contract: typeof contract }>()
    fixture.load.mockReturnValue(pending.promise)
    await render()
    expect(fixture.load).toHaveBeenCalledWith(
      raw,
      expect.any(Object),
      expect.any(Object)
    )
    const [, imports, packages] = fixture.load.mock.calls[0]!
    expect(Object.keys(imports)).toEqual([
      '../../../../zillion--databases/client/manifest.ts'
    ])
    expect(Object.keys(packages)).toEqual([
      '../../../../zillion--databases/package.json'
    ])
    expect(packages['../../../../zillion--databases/package.json'].name).toBe(
      raw.name
    )
    expect(current).toMatchObject({
      installed: true,
      loading: true,
      available: false,
      manifestError: null
    })
    expect(fixture.feed).not.toHaveBeenCalled()
    await act(async () => pending.resolve({ contract }))
    await flush()
    expect(fixture.proxy).toHaveBeenCalledWith(contract)
    expect(current).toMatchObject({
      loading: false,
      available: true,
      manifestError: null
    })
    expect(fixture.feed).toHaveBeenCalledTimes(1)
    expect(fixture.people).toHaveBeenCalledTimes(1)
  })
  it('shows a failed manifest explicitly and retries without enabling a missing contract', async () => {
    fixture.load
      .mockRejectedValueOnce(new Error('Remote entry offline'))
      .mockResolvedValueOnce({ contract })
    await render()
    await flush()
    expect(current).toMatchObject({
      loading: false,
      available: false,
      manifestError: expect.any(Error)
    })
    expect(current?.manifestError?.message).toBe('Remote entry offline')
    expect(fixture.feed).not.toHaveBeenCalled()
    await act(async () => current!.retryManifest())
    await flush()
    expect(fixture.load).toHaveBeenCalledTimes(2)
    expect(current).toMatchObject({ available: true, manifestError: null })
  })
  it('ignores a late loader result after the installed remote is replaced', async () => {
    const old = deferred<{ contract: typeof contract }>(),
      next = deferred<{ contract: typeof contract }>()
    fixture.load
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise)
    await render()
    const replacement = { ...raw, remoteId: 'replacement-remote' }
    fixture.groups = [
      {
        title: 'Workspace',
        items: [{ ...replacement, rawModule: replacement }]
      }
    ]
    await render()
    const nextContract = {
      calendarFeed: { method: 'get' },
      people: { method: 'get' }
    }
    await act(async () => next.resolve({ contract: nextContract }))
    await flush()
    expect(fixture.proxy).toHaveBeenCalledWith(nextContract)
    const count = fixture.proxy.mock.calls.length
    await act(async () => old.resolve({ contract }))
    await flush()
    expect(fixture.proxy).toHaveBeenCalledTimes(count)
    expect(current?.available).toBe(true)
  })
  it('distinguishes an absent module from a loaded manifest without calendar capability', async () => {
    fixture.groups = []
    await render()
    expect(current).toMatchObject({
      installed: false,
      loading: false,
      available: false,
      manifestError: null
    })
    expect(fixture.load).not.toHaveBeenCalled()
    fixture.groups = [
      { title: 'Workspace', items: [{ ...raw, rawModule: raw }] }
    ]
    fixture.load.mockResolvedValue({ contract: {} })
    await render()
    await flush()
    expect(current).toMatchObject({
      installed: true,
      loading: false,
      available: false,
      manifestError: null
    })
    expect(fixture.feed).not.toHaveBeenCalled()
  })
})
