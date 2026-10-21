// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useConnectionProbe } from './useConnectionProbe'

let root: Root
let state: ReturnType<typeof useConnectionProbe<string>>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
it('abandons stale server results, aborts their reads and resets state for a retry', async () => {
  const requests = new Map<
    string,
    {
      signal: AbortSignal
      resolve(value: string): void
      reject(error: Error): void
    }
  >()
  const read = (host: string, signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      requests.set(host, { signal, resolve, reject })
    })
  function Probe({ host, attempt = 0 }: { host: string; attempt?: number }) {
    state = useConnectionProbe(host, read, attempt)
    return null
  }
  await act(async () => root.render(<Probe host="first" />))
  await act(async () => root.render(<Probe host="second" />))
  expect(requests.get('first')!.signal.aborted).toBe(true)
  await act(async () => {
    requests.get('first')!.resolve('old server')
  })
  expect(state.state).toBe('pending')
  await act(async () => {
    requests.get('second')!.reject(new Error('Offline'))
  })
  expect(state.state).toBe('failed')
  await act(async () => root.render(<Probe host="second" attempt={1} />))
  expect(state.state).toBe('pending')
  await act(async () => {
    requests.get('second')!.resolve('production')
  })
  expect(state).toEqual({ state: 'ready', value: 'production' })
})
