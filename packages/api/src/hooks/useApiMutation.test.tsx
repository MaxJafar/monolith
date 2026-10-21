// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EndpointClient } from '../proxy/endpointClient'
import type { UntypedEndpointType } from '../types/proxy'
import { setApiMutationErrorHandler, useApiMutation } from './useApiMutation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { exists: () => false },
    t: (_key: string, options: { action: string }) =>
      'Could not ' + options.action
  })
}))
let root: Root
let cache: QueryClient
let state: ReturnType<
  typeof useApiMutation<UntypedEndpointType<boolean, { title: string }>>
>
const entries = new EndpointClient<
  UntypedEndpointType<boolean, { title: string }>
>('https://example.invalid', 'records/save')
const categories = new EndpointClient('https://example.invalid', 'categories')
const failure = vi.fn()
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
  cache = new QueryClient()
  failure.mockReset()
  setApiMutationErrorHandler(failure)
})
afterEach(async () => {
  await act(async () => root.unmount())
  cache.clear()
  vi.unstubAllGlobals()
})
async function mount(options: Parameters<typeof useApiMutation>[1]) {
  function Probe() {
    state = useApiMutation(entries, options)
    return null
  }
  await act(async () =>
    root.render(
      <QueryClientProvider client={cache}>
        <Probe />
      </QueryClientProvider>
    )
  )
}

describe('mutation cache integration', () => {
  it('invalidates all supplied contract-derived keys before reporting success', async () => {
    entries.mutate = vi.fn(async () => true)
    cache.setQueryData(entries.key, ['one'])
    cache.setQueryData(categories.key, ['work'])
    const saved = vi.fn()
    await mount({
      action: 'save',
      queryKey: [entries.key, categories.key],
      onSuccess: saved
    })
    await act(async () => {
      expect(await state.mutateAsync({ title: 'New' })).toBe(true)
    })
    expect(cache.getQueryState(entries.key)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(categories.key)?.isInvalidated).toBe(true)
    expect(saved).toHaveBeenCalledTimes(1)
  })
  it('routes failures to the caller when present and otherwise to the translated notifier', async () => {
    const error = new Error('Server unavailable')
    entries.mutate = vi.fn(async () => {
      throw error
    })
    const local = vi.fn()
    await mount({ action: 'save', onError: local })
    await act(async () => {
      await expect(state.mutateAsync({ title: 'New' })).rejects.toBe(error)
    })
    expect(local).toHaveBeenCalledWith(error)
    expect(failure).not.toHaveBeenCalled()
    await mount({ action: 'save' })
    await act(async () => {
      await expect(state.mutateAsync({ title: 'New' })).rejects.toBe(error)
    })
    expect(failure).toHaveBeenCalledWith('Could not save')
  })
})
