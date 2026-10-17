// @vitest-environment jsdom
import { act, useRef } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useContextualForm } from './useContextualForm'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root, trigger: HTMLButtonElement
const close = vi.fn()
function Form({
  dirty = false,
  busy = false,
  open = true,
  top = true,
  loaded = true
}: {
  dirty?: boolean
  busy?: boolean
  open?: boolean
  top?: boolean
  loaded?: boolean
}) {
  const surface = useRef<HTMLDivElement>(null)
  useContextualForm(surface, {
    invoker: trigger,
    isOpen: open,
    isTopmost: top,
    onClose: close
  })
  return (
    <div data-modal-overlay data-open={open}>
      <div ref={surface}>
        {loaded && (
          <div
            className="monolith-form-dialog"
            role="dialog"
            data-dirty={dirty}
            aria-busy={busy}
          >
            <button>Close</button>
            <input aria-label="Name" defaultValue="Draft" />
            <button>Save</button>
          </div>
        )}
      </div>
    </div>
  )
}
async function render(props = {}) {
  await act(async () => root.render(<Form {...props} />))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
}
beforeEach(() => {
  close.mockClear()
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
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(20, 20, 300, 180)
  ] as unknown as DOMRectList)
  host = document.createElement('div')
  trigger = document.createElement('button')
  trigger.getBoundingClientRect = () => new DOMRect(900, 700, 30, 30)
  document.body.append(host, trigger)
  trigger.focus()
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('waits for opening, focuses the input and preserves its draft across rerenders', async () => {
  await render({ open: false })
  expect(document.activeElement).toBe(trigger)
  await render()
  const input = host.querySelector('input')!
  expect(document.activeElement).toBe(input)
  input.value = 'In progress'
  input.setSelectionRange(3, 3)
  await render({ dirty: true })
  expect(input.value).toBe('In progress')
  expect(input.selectionStart).toBe(3)
  expect(host.querySelector('[data-contextual="true"]')).not.toBeNull()
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(trigger)
})
it('dismisses a clean form outside but protects dirty or busy drafts', async () => {
  await render({ dirty: true })
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(close).not.toHaveBeenCalled()
  await render({ busy: true })
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  )
  expect(close).not.toHaveBeenCalled()
  await render()
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(close).toHaveBeenCalledTimes(1)
})
it('leaves Escape to nested menus and closes only the active layer', async () => {
  await render()
  const child = document.createElement('div')
  child.className = 'monolith-floating-surface'
  document.body.append(child)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(close).not.toHaveBeenCalled()
  child.remove()
  await render({ top: false })
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(close).not.toHaveBeenCalled()
  await render()
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(close).toHaveBeenCalledTimes(1)
})
it('positions forms that arrive asynchronously without rebuilding their shell', async () => {
  await render({ loaded: false })
  const shell = host.firstElementChild
  expect(host.querySelector('[data-contextual]')).toBeNull()
  await render()
  expect(host.firstElementChild).toBe(shell)
  expect(shell?.getAttribute('data-contextual')).toBe('true')
})
