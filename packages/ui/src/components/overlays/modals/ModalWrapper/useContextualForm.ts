import { type RefObject, useLayoutEffect, useRef } from 'react'

import { positionPopover } from '../../FloatingPopover/position'

const focusable =
  'input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), a[href], [tabindex="0"]'

/** Standard create/edit forms share the same anchored, non-modal presentation. */
export function useContextualForm(
  surface: RefObject<HTMLDivElement | null>,
  {
    anchor,
    invoker,
    onClose,
    isOpen,
    isTopmost
  }: {
    anchor?: DOMRect
    invoker?: HTMLElement
    onClose?: () => void
    isOpen: boolean
    isTopmost: boolean
  }
) {
  const current = useRef({ onClose, isOpen, isTopmost })
  current.current = { onClose, isOpen, isTopmost }
  const reposition = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    const element = surface.current
    const overlay = element?.closest<HTMLElement>('[data-modal-overlay]')
    if (!element || !overlay) return
    let frame = 0,
      focusFrame = 0,
      focused = false
    const form = () =>
      element.querySelector<HTMLElement>('.monolith-form-dialog')
    const position = () => {
      frame = 0
      const content = form()
      if (!content) return
      overlay.dataset.contextual = 'true'
      element.dataset.contextual = 'true'
      const viewport = window.visualViewport
      const width = viewport?.width ?? document.documentElement.clientWidth
      const height = viewport?.height ?? window.innerHeight
      const left = viewport?.offsetLeft ?? 0,
        top = viewport?.offsetTop ?? 0
      const rect = invoker?.isConnected
        ? invoker.getBoundingClientRect()
        : anchor
      const point =
        rect?.width && rect.height
          ? positionPopover(
              rect,
              { width: element.offsetWidth, height: element.offsetHeight },
              { width, height, left, top },
              'bottom',
              'start'
            )
          : {
              x: left + Math.max(12, (width - element.offsetWidth) / 2),
              y: top + Math.max(12, (height - element.offsetHeight) / 3)
            }
      element.style.left = `${point.x}px`
      element.style.top = `${point.y}px`
      if (!focused && current.current.isOpen && current.current.isTopmost) {
        focused = true
        focusFrame = requestAnimationFrame(() => {
          if (element.contains(document.activeElement)) return
          const inputs = Array.from(
            content.querySelectorAll<HTMLElement>(focusable)
          ).filter(
            item => item.getClientRects().length && !item.closest('[inert]')
          )
          const input = inputs.find(item =>
            item.matches('input,textarea,[role="combobox"]')
          )
          ;(input ?? inputs[0] ?? content).focus({ preventScroll: true })
        })
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(position)
    }
    reposition.current = position
    position()
    const childLayer = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '.monolith-floating-surface:not([data-closing]), [data-radix-popper-content-wrapper], [role="listbox"], [role="menu"]'
        )
      ).some(
        layer =>
          !element.contains(layer) &&
          layer.getClientRects().length &&
          !layer.closest('[inert]')
      )
    const ready = () =>
      current.current.isOpen &&
      current.current.isTopmost &&
      form()?.getAttribute('aria-busy') !== 'true'
    const outside = (event: PointerEvent) => {
      const content = form()
      if (
        !content ||
        !ready() ||
        childLayer() ||
        content.dataset.dirty === 'true'
      )
        return
      if (
        event.target instanceof Node &&
        !element.contains(event.target) &&
        !invoker?.contains(event.target)
      )
        current.current.onClose?.()
    }
    const keyboard = (event: KeyboardEvent) => {
      const content = form()
      if (
        !content ||
        !ready() ||
        childLayer() ||
        event.defaultPrevented ||
        event.isComposing
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        current.current.onClose?.()
      } else if (
        event.key === 'Tab' &&
        element.contains(document.activeElement)
      ) {
        const items = Array.from(
          content.querySelectorAll<HTMLElement>(focusable)
        ).filter(
          item => item.getClientRects().length && !item.closest('[inert]')
        )
        const edge = event.shiftKey ? items[0] : items.at(-1)
        if (!edge || document.activeElement === edge) {
          event.preventDefault()
          ;(event.shiftKey ? items.at(-1) : items[0])?.focus()
        }
      }
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    // A form can arrive after its data finishes loading; keep the same DOM shell.
    const mutation = new MutationObserver(schedule)
    mutation.observe(element, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    document.addEventListener('scroll', schedule, true)
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', keyboard)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(focusFrame)
      resize.disconnect()
      mutation.disconnect()
      reposition.current = null
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      document.removeEventListener('scroll', schedule, true)
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', keyboard)
      if (
        form() &&
        invoker?.isConnected &&
        !invoker.closest('[inert]') &&
        (element.contains(document.activeElement) ||
          document.activeElement === document.body)
      )
        invoker.focus({ preventScroll: true })
    }
  }, [anchor, invoker, surface])
  useLayoutEffect(() => {
    reposition.current?.()
  })
}
