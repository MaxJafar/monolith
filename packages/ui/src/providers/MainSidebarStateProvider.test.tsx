// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  MainSidebarStateProvider,
  useMainSidebarState
} from './MainSidebarStateProvider'

let host: HTMLDivElement,
  root: Root,
  state: ReturnType<typeof useMainSidebarState>
function Read() {
  state = useMainSidebarState()
  return null
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('innerWidth', 1400)
  localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
async function mount() {
  await act(async () =>
    root.render(
      <MainSidebarStateProvider>
        <Read />
      </MainSidebarStateProvider>
    )
  )
}
async function resize(width: number) {
  await act(async () => {
    vi.stubGlobal('innerWidth', width)
    window.dispatchEvent(new Event('resize'))
  })
}
it('restores desktop preference and keeps mobile toggles separate', async () => {
  await mount()
  expect(state.sidebarExpanded).toBe(true)
  await resize(600)
  expect(state.sidebarExpanded).toBe(false)
  await act(async () => state.toggleSidebar())
  expect(state.sidebarExpanded).toBe(true)
  expect(localStorage.getItem('monolith.sidebar')).toBe('expanded')
  await resize(1400)
  expect(state.sidebarExpanded).toBe(true)
  await act(async () => state.toggleSidebar())
  await resize(600)
  await act(async () => state.toggleSidebar())
  await resize(1400)
  expect(state.sidebarExpanded).toBe(false)
  expect(localStorage.getItem('monolith.sidebar')).toBe('collapsed')
})
it('honors saved collapse and the keyboard command without interrupting composition', async () => {
  localStorage.setItem('monolith.sidebar', 'collapsed')
  await mount()
  expect(state.sidebarExpanded).toBe(false)
  await act(async () =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '\\',
        ctrlKey: true,
        isComposing: true
      })
    )
  )
  expect(state.sidebarExpanded).toBe(false)
  const command = new KeyboardEvent('keydown', {
    key: '\\',
    ctrlKey: true,
    cancelable: true
  })
  await act(async () => window.dispatchEvent(command))
  expect(command.defaultPrevented).toBe(true)
  expect(state.sidebarExpanded).toBe(true)
  await act(async () => root.render(null))
  const after = new KeyboardEvent('keydown', {
    key: '\\',
    ctrlKey: true,
    cancelable: true
  })
  window.dispatchEvent(after)
  expect(after.defaultPrevented).toBe(false)
})
it('still renders when device storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('blocked')
  })
  await mount()
  await act(async () => state.toggleSidebar())
  expect(state.sidebarExpanded).toBe(false)
})
