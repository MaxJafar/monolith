// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useConfirmation } from './useConfirmation'

let root: Root
let api: ReturnType<typeof useConfirmation>
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
async function mount(accept: () => Promise<void>, close: () => void) {
  function Probe() {
    api = useConfirmation(accept, close, 'Request failed')
    return <output>{api.failure}</output>
  }
  await act(async () => root.render(<Probe />))
}
it('locks repeated submissions and dismissal until the pending request completes', async () => {
  let finish!: () => void
  const close = vi.fn()
  const accept = vi.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  await mount(accept, close)
  let request!: Promise<void>
  await act(async () => {
    request = api.submit(true)
    void api.submit(true)
  })
  expect(accept).toHaveBeenCalledTimes(1)
  expect(api.pending).toBe(true)
  expect(api.canDismiss()).toBe(false)
  await act(async () => {
    finish()
    await request
  })
  expect(close).toHaveBeenCalledTimes(1)
  expect(api.pending).toBe(false)
})
it('keeps failure visible, allows a retry, and rejects an unconfirmed action', async () => {
  const close = vi.fn()
  const accept = vi
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(undefined)
  await mount(accept, close)
  await act(async () => {
    await api.submit(false)
  })
  expect(accept).not.toHaveBeenCalled()
  await act(async () => {
    await api.submit(true)
  })
  expect(close).not.toHaveBeenCalled()
  expect(host.textContent).toBe('Offline')
  expect(api.canDismiss()).toBe(true)
  await act(async () => {
    await api.submit(true)
  })
  expect(close).toHaveBeenCalledTimes(1)
  expect(api.failure).toBe('')
})
it('does not close an unmounted dialog when its request resolves', async () => {
  let finish!: () => void
  const close = vi.fn()
  await mount(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      }),
    close
  )
  let request!: Promise<void>
  await act(async () => {
    request = api.submit(true)
  })
  await act(async () => root.render(null))
  await act(async () => {
    finish()
    await request
  })
  expect(close).not.toHaveBeenCalled()
})
