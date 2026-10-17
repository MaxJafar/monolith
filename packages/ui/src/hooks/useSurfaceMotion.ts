import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { blockSnapshot } from '@/utils/blockDrag'
import { reducedMotion } from '@/utils/elasticMotion'

/** Keep real page contents mounted until their exit finishes, including editors. */
export function useAnimatedClose(onClose: () => void) {
  const callback = useRef(onClose)
  callback.current = onClose
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [closing, setClosing] = useState(false)
  useLayoutEffect(() => () => clearTimeout(timer.current), [])
  const close = useCallback(() => {
    if (timer.current) return
    if (reducedMotion()) return callback.current()
    setClosing(true)
    timer.current = setTimeout(() => callback.current(), 160)
  }, [])
  return { closing, close }
}

/** Conditional popovers can finish a short, inert exit after their owner closes. */
export function usePopoverExit(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    return () => {
      if (!element.isConnected || reducedMotion() || !element.animate) return
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const snapshot = blockSnapshot(element)
      const ghost = snapshot.element
      ghost.removeAttribute('role')
      ghost.className = 'monolith-surface-exit'
      Object.assign(ghost.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        zIndex: '9999',
        transformOrigin: 'top left',
        pointerEvents: 'none'
      })
      document.body.append(ghost)
      snapshot.restoreScroll()
      const animation = ghost.animate(
        [
          {
            opacity: 1,
            transform: 'translate(0, 0) scale(1)',
            clipPath: 'inset(0 0 0 0 round 5px)'
          },
          {
            opacity: 0,
            transform: 'translate(-2px, -2px) scale(.985)',
            clipPath: 'inset(0 5% 8% 0 round 5px)'
          }
        ],
        { duration: 110, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }
      )
      const remove = () => ghost.remove()
      animation.finished.then(remove, remove)
      setTimeout(remove, 180)
    }
  }, [ref])
}
