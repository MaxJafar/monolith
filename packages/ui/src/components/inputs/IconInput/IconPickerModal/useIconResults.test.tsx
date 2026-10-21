// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { type IconPage, fetchIconPage } from './catalog'
import { useIconResults } from './useIconResults'

vi.mock('./catalog', () => ({ fetchIconPage: vi.fn() }))
const fetcher = vi.mocked(fetchIconPage)
let node: HTMLDivElement, root: Root, state: ReturnType<typeof useIconResults>
function Probe({ query }: { query: string }) {
  state = useIconResults('lucide', query)
  return <output>{state.icons.join(',')}</output>
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  node = document.createElement('div')
  root = createRoot(node)
  fetcher.mockReset()
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
function deferred() {
  let resolve!: (value: IconPage) => void
  const promise = new Promise<IconPage>(done => {
    resolve = done
  })
  return { promise, resolve }
}
it('cancels superseded requests and ignores responses arriving out of order', async () => {
  const older = deferred(),
    newer = deferred()
  fetcher.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
  await act(async () => root.render(<Probe query="old" />))
  const oldSignal = fetcher.mock.calls[0][1]
  await act(async () => root.render(<Probe query="new" />))
  expect(oldSignal.aborted).toBe(true)
  await act(async () =>
    newer.resolve({ icons: ['lucide:new'], more: false, next: 1 })
  )
  await act(async () =>
    older.resolve({ icons: ['lucide:old'], more: false, next: 1 })
  )
  expect(state.icons).toEqual(['lucide:new'])
  expect(state.loading).toBe(false)
})
it('appends another page without duplicates or concurrent duplicate requests', async () => {
  const next = deferred()
  fetcher
    .mockResolvedValueOnce({ icons: ['lucide:a'], more: true, next: 192 })
    .mockReturnValueOnce(next.promise)
  await act(async () => root.render(<Probe query="folder" />))
  let loading!: Promise<void>
  await act(async () => {
    loading = state.loadMore()
    void state.loadMore()
  })
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[1][0].start).toBe(192)
  await act(async () => {
    next.resolve({ icons: ['lucide:a', 'lucide:b'], more: false, next: 194 })
    await loading
  })
  expect(state.icons).toEqual(['lucide:a', 'lucide:b'])
  expect(state.more).toBe(false)
})
it('shows a recoverable error and cancels the active request on unmount', async () => {
  fetcher
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ icons: ['lucide:cloud'], more: false, next: 1 })
  await act(async () => root.render(<Probe query="cloud" />))
  expect(state.error?.message).toBe('offline')
  expect(state.loading).toBe(false)
  await act(async () => state.retry())
  expect(state.error).toBeUndefined()
  expect(state.icons).toEqual(['lucide:cloud'])
  const signal = fetcher.mock.calls[1][1]
  await act(async () => root.render(null))
  expect(signal.aborted).toBe(true)
})
