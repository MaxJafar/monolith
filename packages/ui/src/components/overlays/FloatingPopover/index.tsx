import {
  type PointerEventHandler,
  type ReactNode,
  useLayoutEffect,
  useRef
} from 'react'
import { createPortal } from 'react-dom'

import { Box } from '@/components/primitives'
import { usePopoverExit } from '@/hooks/useSurfaceMotion'
import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import './popover.css'
import { type PopoverAnchor, positionPopover } from './position'

const surfaces = new Set<HTMLElement>()
const focusable =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'

export type FloatingPopoverProps = {
  anchor: PopoverAnchor | null
  label: string
  children: ReactNode
  onClose: () => void
  width?: number
  side?: 'bottom' | 'right'
  align?: 'start' | 'end'
  className?: string
  /** Slash menus keep the text caret in the editor. */
  autoFocus?: boolean
  role?: 'dialog' | 'listbox'
  /** Hover cards keep themselves open while the pointer rests on them. */
  onPointerEnter?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
}

/** A non-modal surface: no backdrop, no document reflow, one Escape per layer. */
export function FloatingPopover({
  anchor,
  label,
  children,
  onClose,
  width = 320,
  side = 'bottom',
  align = 'start',
  className = '',
  autoFocus = true,
  role = 'dialog',
  onPointerEnter,
  onPointerLeave
}: FloatingPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  usePopoverExit(ref)
  const close = useRef(onClose)
  close.current = onClose
  const currentAnchor = useRef(anchor)
  currentAnchor.current = anchor
  const anchorElement = anchor instanceof Element ? anchor : null
  const open = !!anchor
  const reposition = useRef<(() => void) | null>(null)
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !open) return
    const previous = document.activeElement
    // WebKit does not focus a button on pointer click. Restore the actual trigger.
    const returnFocus =
      autoFocus &&
      anchorElement instanceof HTMLElement &&
      anchorElement.matches('button,a[href],[tabindex]')
        ? anchorElement
        : previous
    surfaces.add(element)
    let frame = 0
    const position = () => {
      frame = 0
      const target = currentAnchor.current
      if (!target) return
      const viewport = window.visualViewport
      const width = viewport?.width ?? document.documentElement.clientWidth
      const height = viewport?.height ?? window.innerHeight
      element.style.maxWidth = `${Math.max(0, width - 24)}px`
      element.style.maxHeight = `${Math.max(0, height - 24)}px`
      const rect = { width: element.offsetWidth, height: element.offsetHeight }
      const point = positionPopover(
        target.getBoundingClientRect(),
        rect,
        {
          width,
          height,
          left: viewport?.offsetLeft ?? 0,
          top: viewport?.offsetTop ?? 0
        },
        side,
        align
      )
      element.style.left = `${point.x}px`
      element.style.top = `${point.y}px`
      element.style.visibility = 'visible'
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(position)
    }
    reposition.current = schedule
    position()
    // Wait for the menu that launched this surface to restore its own focus.
    const focusFrame = requestAnimationFrame(() => {
      if (autoFocus && !element.contains(document.activeElement))
        (
          element.querySelector<HTMLElement>(
            '[autofocus]:not(:disabled), [data-autofocus]:not(:disabled)'
          ) ??
          Array.from(element.querySelectorAll<HTMLElement>(focusable)).find(
            item => item.getClientRects().length && !item.closest('[inert]')
          ) ??
          element
        ).focus({ preventScroll: true })
    })
    const topmost = () => Array.from(surfaces).at(-1) === element
    const ownsLayer = (layer: Element | null) => {
      if (!layer || element.contains(layer)) return false
      const labels = (layer.getAttribute('aria-labelledby') ?? '').split(/\s+/)
      return (
        labels.some(
          id => id && element.contains(document.getElementById(id))
        ) ||
        Array.from(element.querySelectorAll('[aria-controls]')).some(control =>
          (control.getAttribute('aria-controls') ?? '')
            .split(/\s+/)
            .includes(layer.id)
        )
      )
    }
    const outside = (event: PointerEvent) => {
      if (!topmost() || !(event.target instanceof Node)) return
      if (
        element.contains(event.target) ||
        anchorElement?.contains(event.target)
      )
        return
      // A select or context menu may be portalled above this dialog.
      if (
        event.target instanceof Element &&
        (event.target.closest('[data-radix-popper-content-wrapper]') ||
          ownsLayer(event.target.closest('[role="listbox"],[role="menu"]')))
      )
        return
      close.current()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!topmost() || event.defaultPrevented) return
      if (event.key === 'Escape') {
        if (
          document.querySelector('[data-radix-popper-content-wrapper]') ||
          Array.from(
            document.querySelectorAll('[role="listbox"],[role="menu"]')
          ).some(ownsLayer)
        )
          return
        event.preventDefault()
        event.stopImmediatePropagation()
        close.current()
      } else if (
        event.key === 'Tab' &&
        autoFocus &&
        element.contains(document.activeElement)
      ) {
        const items = Array.from(
          element.querySelectorAll<HTMLElement>(focusable)
        ).filter(
          item => item.getClientRects().length && !item.closest('[inert]')
        )
        if (!items.length) {
          event.preventDefault()
          return
        }
        const first = items[0]!,
          last = items.at(-1)!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    if (anchorElement) resize.observe(anchorElement)
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    document.addEventListener('scroll', schedule, true)
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', keyboard)
    return () => {
      const shouldRestore = element.contains(document.activeElement)
      surfaces.delete(element)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(focusFrame)
      resize.disconnect()
      reposition.current = null
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      document.removeEventListener('scroll', schedule, true)
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', keyboard)
      if (
        shouldRestore &&
        returnFocus instanceof HTMLElement &&
        returnFocus.isConnected &&
        !returnFocus.closest('[inert]')
      )
        returnFocus.focus({ preventScroll: true })
    }
  }, [open, anchorElement, side, align, autoFocus])

  // Virtual caret anchors may be recreated on every render. Update geometry
  // without tearing down the layer or moving keyboard focus back to its trigger.
  useLayoutEffect(() => {
    reposition.current?.()
  })

  if (!anchor) return null
  return createPortal(
    <Box
      ref={ref}
      role={role}
      tabIndex={-1}
      aria-label={label}
      className={`monolith-floating-surface ${className}`}
      position="fixed"
      p="sm"
      r="sm"
      overflow="auto"
      zIndex="9000"
      style={{
        ...appearanceVariables(appearance, derivedTheme),
        width,
        visibility: 'hidden'
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </Box>,
    document.getElementById('app') ?? document.body
  )
}
