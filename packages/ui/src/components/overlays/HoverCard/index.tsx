import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { FloatingPopover } from '../FloatingPopover'
import './hoverCard.css'

/** Hover and keyboard-focus intent for a preview card. Touch taps are left to
 * the trigger's own click behavior. */
export function useHoverCard<Preview>({
  openDelay = 260,
  closeDelay = 140
}: { openDelay?: number; closeDelay?: number } = {}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [preview, setPreview] = useState<Preview>()
  const opening = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined)
  const open = useRef(false)
  // Moving between neighbouring triggers keeps the card open instead of
  // restarting the delay, like tooltips in a toolbar.
  const lastClosed = useRef(0)

  useEffect(
    () => () => {
      clearTimeout(opening.current)
      clearTimeout(closing.current)
    },
    []
  )

  const show = useCallback(
    (target: HTMLElement, value: Preview, immediate: boolean) => {
      clearTimeout(opening.current)
      clearTimeout(closing.current)
      const reveal = () => {
        open.current = true
        setPreview(value)
        setAnchor(target)
      }

      if (immediate || open.current || Date.now() - lastClosed.current < 320)
        reveal()
      else opening.current = setTimeout(reveal, openDelay)
    },
    [openDelay]
  )

  const close = useCallback(() => {
    clearTimeout(opening.current)
    clearTimeout(closing.current)
    if (open.current) lastClosed.current = Date.now()
    open.current = false
    setAnchor(null)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(opening.current)
    clearTimeout(closing.current)
    closing.current = setTimeout(close, closeDelay)
  }, [close, closeDelay])

  return {
    anchor,
    preview,
    close,
    /** Spread onto an element that previews `value`. */
    trigger: (value: Preview) => ({
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch')
          show(event.currentTarget, value, false)
      },
      onPointerLeave: hide,
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(':focus-visible'))
          show(event.currentTarget, value, true)
      },
      onBlur: hide
    }),
    surface: {
      onPointerEnter: () => clearTimeout(closing.current),
      onPointerLeave: hide
    }
  }
}

export type HoverCardState<Preview> = ReturnType<typeof useHoverCard<Preview>>

/** A non-modal preview anchored to the hovered or focused trigger. It keeps
 * focus on the trigger, follows the pointer between triggers, and animates its
 * content when the previewed item changes. */
export function HoverCard<Preview>({
  card,
  label,
  width = 280,
  className = '',
  contentKey,
  children
}: {
  card: HoverCardState<Preview>
  label: string
  width?: number
  className?: string
  /** Changing the key replays the content entrance. */
  contentKey?: string
  children: ReactNode
}) {
  return (
    <FloatingPopover
      anchor={card.anchor}
      autoFocus={false}
      className={`monolith-hover-card ${className}`}
      label={label}
      width={width}
      onClose={card.close}
      onPointerEnter={card.surface.onPointerEnter}
      onPointerLeave={card.surface.onPointerLeave}
    >
      <div key={contentKey} className="monolith-hover-card-content">
        {children}
      </div>
    </FloatingPopover>
  )
}
