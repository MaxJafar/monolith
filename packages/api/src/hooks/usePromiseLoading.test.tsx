// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { usePromiseLoading } from './usePromiseLoading'

let root: Root
let state: ReturnType<typeof usePromiseLoading<[string]>>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
it('keeps pending state through overlapping saves and allows recovery after rejection', async () => {
  const jobs = new Map<
    string,
    { resolve(): void; reject(error: Error): void }
  >()
  const failed = vi.fn()
  const save = (name: string) =>
    new Promise<void>((resolve, reject) => {
      jobs.set(name, { resolve, reject })
    })
  function Probe() {
    state = usePromiseLoading(save, failed)
    return null
  }
  await act(async () => root.render(<Probe />))
  let one!: Promise<void>, two!: Promise<void>
  await act(async () => {
    one = state[1]('one')
    two = state[1]('two')
  })
  expect(state[0]).toBe(true)
  await act(async () => {
    jobs.get('one')!.resolve()
    await one
  })
  expect(state[0]).toBe(true)
  const error = new Error('Save failed')
  await act(async () => {
    jobs.get('two')!.reject(error)
    await two
  })
  expect(state[0]).toBe(false)
  expect(failed).toHaveBeenCalledWith(error)
})
