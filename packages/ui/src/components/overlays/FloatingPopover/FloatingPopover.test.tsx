// @vitest-environment jsdom
import { type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { FloatingPopover } from './index'

vi.mock('@/components/primitives', () => ({
  Box: ({
    children,
    ...props
  }: {
    children?: ReactNode
    [key: string]: unknown
  }) =>
    createElement(
      'div',
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|ref$|role$|tabIndex$|className$|style$)/.test(key)
        )
      ),
      children
    )
}))
vi.mock('@/hooks/useSurfaceMotion', () => ({ usePopoverExit: () => {} }))
vi.mock('@/providers/AppearanceProvider', () => ({
  useAppearance: () => ({}),
  appearanceVariables: () => ({})
}))
vi.mock('@/providers/PersonalizationProvider', () => ({
  usePersonalization: () => ({ derivedTheme: 'light' })
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root, trigger: HTMLButtonElement
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0)
  )
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  host = document.createElement('div')
  document.body.append(host)
  trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  trigger.remove()
  vi.unstubAllGlobals()
})

it('returns to the clicked anchor when the browser did not focus it', async () => {
  const previous = document.createElement('input')
  document.body.append(previous)
  previous.focus()
  await act(async () =>
    root.render(
      <FloatingPopover anchor={trigger} label="Colors" onClose={() => {}}>
        <input data-autofocus aria-label="Color" />
      </FloatingPopover>
    )
  )
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 5))
  })
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(trigger)
  previous.remove()
})

it('keeps caret focus through virtual-anchor rerenders and restores the original trigger', async () => {
  async function render() {
    await act(async () => {
      root.render(
        <FloatingPopover
          anchor={{ getBoundingClientRect: () => new DOMRect(30, 30, 20, 20) }}
          label="Picker"
          onClose={() => {}}
        >
          <button>Close</button>
          <input aria-label="Name" data-autofocus />
        </FloatingPopover>
      )
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
    })
  }
  await render()
  const input = document.querySelector('input')!
  expect(document.activeElement).toBe(input)
  input.value = 'Studio'
  input.setSelectionRange(3, 3)
  const restore = vi.spyOn(trigger, 'focus')
  await render()
  expect(document.activeElement).toBe(input)
  expect(input.selectionStart).toBe(3)
  expect(restore).not.toHaveBeenCalled()
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(trigger)
})
