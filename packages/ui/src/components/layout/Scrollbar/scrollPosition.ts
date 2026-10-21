// SPDX-License-Identifier: 0BSD
export interface ScrollValues {
  left: number
  top: number
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
}

export interface ScrollbarHandle {
  getValues(): ScrollValues
  getScrollLeft(): number
  getScrollTop(): number
  getScrollWidth(): number
  getScrollHeight(): number
  getClientWidth(): number
  getClientHeight(): number
  scrollLeft(value?: number): void
  scrollTop(value?: number): void
  scrollToLeft(): void
  scrollToRight(): void
  scrollToTop(): void
  scrollToBottom(): void
}

function fraction(position: number, extent: number, viewport: number) {
  const distance = extent - viewport
  return distance > 0 ? Math.max(0, Math.min(1, position / distance)) : 0
}

/** Keep reported progress within the viewport even during native overscroll. */
export function readScroll(view: HTMLElement | null): ScrollValues {
  const values = {
    scrollLeft: view?.scrollLeft ?? 0,
    scrollTop: view?.scrollTop ?? 0,
    scrollWidth: view?.scrollWidth ?? 0,
    scrollHeight: view?.scrollHeight ?? 0,
    clientWidth: view?.clientWidth ?? 0,
    clientHeight: view?.clientHeight ?? 0
  }
  return {
    ...values,
    left: fraction(values.scrollLeft, values.scrollWidth, values.clientWidth),
    top: fraction(values.scrollTop, values.scrollHeight, values.clientHeight)
  }
}

export function scrollHandle(
  current: () => HTMLElement | null
): ScrollbarHandle {
  const move = (axis: 'scrollTop' | 'scrollLeft', value: number) => {
    const view = current()
    if (view) view[axis] = Number.isFinite(value) ? value : 0
  }
  return {
    getValues: () => readScroll(current()),
    getClientHeight: () => readScroll(current()).clientHeight,
    getClientWidth: () => readScroll(current()).clientWidth,
    getScrollHeight: () => readScroll(current()).scrollHeight,
    getScrollWidth: () => readScroll(current()).scrollWidth,
    getScrollTop: () => readScroll(current()).scrollTop,
    getScrollLeft: () => readScroll(current()).scrollLeft,
    scrollLeft: (value = 0) => move('scrollLeft', value),
    scrollTop: (value = 0) => move('scrollTop', value),
    scrollToLeft: () => move('scrollLeft', 0),
    scrollToTop: () => move('scrollTop', 0),
    scrollToRight: () => {
      const { scrollWidth, clientWidth } = readScroll(current())
      move('scrollLeft', Math.max(0, scrollWidth - clientWidth))
    },
    scrollToBottom: () => {
      const { scrollHeight, clientHeight } = readScroll(current())
      move('scrollTop', Math.max(0, scrollHeight - clientHeight))
    }
  }
}
