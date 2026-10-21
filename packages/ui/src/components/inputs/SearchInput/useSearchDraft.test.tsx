// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useSearchDraft } from './useSearchDraft'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root, host: HTMLDivElement, state: ReturnType<typeof useSearchDraft>
const publish = vi.fn()
function Editor({
  value = '',
  disabled = false,
  callback = publish
}: {
  value?: string
  disabled?: boolean
  callback?: typeof publish
}) {
  state = useSearchDraft(value, callback, 250, disabled)
  return <output>{state.value}</output>
}
beforeEach(() => {
  vi.useFakeTimers()
  publish.mockClear()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
})
it('publishes only the latest draft after the debounce period', async () => {
  await act(async () => root.render(<Editor />))
  await act(async () => state.change('r'))
  await act(async () => vi.advanceTimersByTime(200))
  await act(async () => state.change('release'))
  await act(async () => vi.advanceTimersByTime(249))
  expect(publish).not.toHaveBeenCalled()
  expect(host.textContent).toBe('release')
  await act(async () => vi.advanceTimersByTime(1))
  expect(publish).toHaveBeenCalledExactlyOnceWith('release')
})
it('cancels pending typing on clear and on an external reset', async () => {
  await act(async () => root.render(<Editor />))
  await act(async () => state.change('stale'))
  await act(async () => state.change('', true))
  await act(async () => vi.advanceTimersByTime(500))
  expect(publish).toHaveBeenCalledExactlyOnceWith('')
  publish.mockClear()
  await act(async () => state.change('also stale'))
  await act(async () => root.render(<Editor value="saved query" />))
  await act(async () => vi.advanceTimersByTime(500))
  expect(host.textContent).toBe('saved query')
  expect(publish).not.toHaveBeenCalled()
})
it('does not send a queued query after the field becomes disabled or unmounts', async () => {
  await act(async () => root.render(<Editor />))
  await act(async () => state.change('private'))
  await act(async () => root.render(<Editor disabled />))
  await act(async () => vi.advanceTimersByTime(500))
  expect(publish).not.toHaveBeenCalled()
  await act(async () => root.render(<Editor />))
  await act(async () => state.change('pending'))
  await act(async () => root.render(null))
  await act(async () => vi.advanceTimersByTime(500))
  expect(publish).not.toHaveBeenCalled()
})
