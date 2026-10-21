// SPDX-License-Identifier: 0BSD
import { type RefObject, useEffect, useRef, useState } from 'react'

export function useContextTarget(
  target: RefObject<HTMLElement | null> | undefined,
  open: () => void
) {
  const [point, setPoint] = useState<{ x: number; y: number }>()
  const previousFocus = useRef<HTMLElement | null>(null)
  const notify = useRef(open)
  notify.current = open
  useEffect(() => {
    const element = target?.current
    if (!element) return
    function show(event: Event) {
      if (event.type === 'keydown') {
        const key = event as KeyboardEvent
        if (!(key.key === 'ContextMenu' || (key.key === 'F10' && key.shiftKey)))
          return
      }
      event.preventDefault()
      event.stopPropagation()
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : element!
      const bounds = element!.getBoundingClientRect()
      setPoint(
        event.type === 'contextmenu'
          ? {
              x: (event as MouseEvent).clientX,
              y: (event as MouseEvent).clientY
            }
          : { x: bounds.left + 24, y: bounds.bottom }
      )
      notify.current()
    }
    element.addEventListener('contextmenu', show)
    element.addEventListener('keydown', show)
    return () => {
      element.removeEventListener('contextmenu', show)
      element.removeEventListener('keydown', show)
    }
  })
  const restore = () => {
    const focus = previousFocus.current
    previousFocus.current = null
    setPoint(undefined)
    if (focus?.isConnected) focus.focus({ preventScroll: true })
  }
  return { point, restore }
}
