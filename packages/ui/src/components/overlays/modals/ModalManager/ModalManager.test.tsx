// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ModalInstance } from '@/providers/ModalProvider'

import { ModalManager } from './index'

const store = vi.hoisted(() => ({
  stack: [] as ModalInstance[],
  close: vi.fn(),
  remove: vi.fn()
}))
vi.mock('@/providers', () => ({ useModalStore: () => store }))
vi.mock('@monolith/federation', () => ({
  ModuleMetadataProvider: ({ children }: { children: ReactNode }) => children
}))
vi.mock('../ModalWrapper', () => ({
  ModalWrapper: ({
    children,
    isOpen,
    isTopmost
  }: {
    children: ReactNode
    isOpen: boolean
    isTopmost: boolean
  }) => (
    <div data-open={isOpen} data-active={isTopmost}>
      {children}
    </div>
  )
}))
let container: HTMLDivElement, root: Root
function entry(id: string, isClosing = false): ModalInstance {
  return { id, isClosing, component: () => null, data: {} }
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.useFakeTimers()
  store.stack = []
  store.close.mockReset()
  store.remove.mockReset()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it('opens immediately, including when another layer is still exiting', async () => {
  store.stack = [entry('old', true), entry('new')]
  await act(async () => root.render(<ModalManager />))
  const layers = container.querySelectorAll('[data-open]')
  expect(layers[0].getAttribute('data-active')).toBe('false')
  expect(layers[1].getAttribute('data-active')).toBe('true')
  expect(layers[1].getAttribute('data-open')).toBe('true')
  expect(store.remove).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTimeAsync(350))
  expect(store.remove).toHaveBeenCalledExactlyOnceWith('old')
})
it('returns input to the previous active layer while the top layer exits', async () => {
  store.stack = [entry('first'), entry('second')]
  await act(async () => root.render(<ModalManager />))
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1)
  store.stack = [entry('first'), entry('second', true)]
  await act(async () => root.render(<ModalManager />))
  expect(
    container.querySelector('[data-active="true"]')?.getAttribute('data-open')
  ).toBe('true')
  await act(async () => root.render(null))
  await act(async () => vi.advanceTimersByTimeAsync(350))
  expect(store.remove).not.toHaveBeenCalled()
})
