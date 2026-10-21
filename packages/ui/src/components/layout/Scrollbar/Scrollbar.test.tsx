// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act, createElement, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Scrollbar, type ScrollbarHandle } from './index'
import { readScroll, scrollHandle } from './scrollPosition'

vi.mock('@/components/primitives', () => ({
  Flex: ({
    children,
    ref,
    onScroll,
    onWheel,
    className,
    tabIndex
  }: Record<string, any>) =>
    createElement(
      'div',
      { ref, onScroll, onWheel, className, tabIndex },
      children
    )
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => {
  vi.useRealTimers()
})

function dimensions(view: HTMLElement) {
  Object.defineProperties(view, {
    scrollHeight: { value: 900, configurable: true },
    clientHeight: { value: 200 },
    scrollWidth: { value: 600 },
    clientWidth: { value: 300 }
  })
}

describe('native scrolling compatibility', () => {
  it('reports bounded progress and navigates to the actual edge', () => {
    const view = document.createElement('div')
    dimensions(view)
    const handle = scrollHandle(() => view)
    handle.scrollToBottom()
    handle.scrollToRight()
    expect(handle.getValues()).toMatchObject({
      scrollTop: 700,
      scrollLeft: 300,
      top: 1,
      left: 1
    })
    view.scrollTop = -10
    view.scrollLeft = 900
    expect(readScroll(view)).toMatchObject({ top: 0, left: 1 })
    handle.scrollToTop()
    handle.scrollToLeft()
    expect(handle.getValues()).toMatchObject({ top: 0, left: 0 })
    expect(readScroll(null)).toMatchObject({ top: 0, left: 0, clientHeight: 0 })
  })

  it('groups scroll bursts, uses the latest stop callback and cancels after unmount', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const root = createRoot(host)
    const ref = createRef<ScrollbarHandle>()
    const start = vi.fn(),
      firstStop = vi.fn(),
      lastStop = vi.fn(),
      frame = vi.fn()
    const render = (stop: () => void) => (
      <Scrollbar
        ref={ref}
        onScrollStart={start}
        onScrollStop={stop}
        onScrollFrame={frame}
      >
        Content
      </Scrollbar>
    )
    await act(async () => root.render(render(firstStop)))
    const view = host.firstElementChild as HTMLElement
    dimensions(view)
    await act(async () => {
      view.scrollTop = 350
      view.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(80)
      view.dispatchEvent(new Event('scroll'))
    })
    expect(start).toHaveBeenCalledOnce()
    expect(frame).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 0.5 })
    )
    await act(async () => root.render(render(lastStop)))
    await act(async () => vi.advanceTimersByTime(120))
    expect(firstStop).not.toHaveBeenCalled()
    expect(lastStop).toHaveBeenCalledOnce()
    await act(async () => {
      view.dispatchEvent(new Event('scroll'))
      root.unmount()
      vi.advanceTimersByTime(120)
    })
    expect(lastStop).toHaveBeenCalledOnce()
    expect(ref.current).toBeNull()
  })

  it('reports content changes without requiring the viewport itself to resize', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const root = createRoot(host)
    const update = vi.fn()
    try {
      await act(async () =>
        root.render(
          <Scrollbar onUpdate={update}>
            <div>First</div>
          </Scrollbar>
        )
      )
      const view = host.firstElementChild as HTMLElement
      dimensions(view)
      await act(async () => vi.advanceTimersByTime(20))
      expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ scrollHeight: 900 })
      )
      Object.defineProperty(view, 'scrollHeight', { value: 1300 })
      await act(async () =>
        root.render(
          <Scrollbar onUpdate={update}>
            <div>More content</div>
          </Scrollbar>
        )
      )
      await act(async () => vi.advanceTimersByTime(20))
      expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ scrollHeight: 1300 })
      )
    } finally {
      await act(async () => root.unmount())
    }
  })
})
