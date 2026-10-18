// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useOverlayFocus } from './useOverlayFocus'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root, trigger: HTMLButtonElement
const close = vi.fn()
function Settings() {
  const ref = useOverlayFocus(close)
  return (
    <div data-modal-overlay data-modal-topmost="true">
      <div ref={ref}>
        <button>Setting</button>
      </div>
    </div>
  )
}
beforeEach(async () => {
  close.mockClear()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0)
  )
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(20, 20, 100, 30)
  ] as unknown as DOMRectList)
  host = document.createElement('div')
  trigger = document.createElement('button')
  document.body.append(trigger, host)
  trigger.focus()
  root = createRoot(host)
  await act(async () => root.render(<Settings />))
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('lets a portalled editor receive focus and handle its own Escape', async () => {
  const menu = document.createElement('div')
  menu.className = 'monolith-floating-surface'
  const input = document.createElement('input')
  menu.append(input)
  document.body.append(menu)
  input.focus()
  expect(document.activeElement).toBe(input)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(close).not.toHaveBeenCalled()
})
it('does not steal focus from a newly opened editor when the old window finishes closing', async () => {
  const menu = document.createElement('div')
  menu.className = 'monolith-floating-surface'
  const input = document.createElement('input')
  menu.append(input)
  document.body.append(menu)
  input.focus()
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(input)
})
it('returns focus to the trigger when closing its own active surface', async () => {
  host.querySelector('button')!.focus()
  await act(async () => root.render(null))
  expect(document.activeElement).toBe(trigger)
})
