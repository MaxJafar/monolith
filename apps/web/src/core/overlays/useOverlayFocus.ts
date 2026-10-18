import { useEffect, useRef } from 'react'

/** Focus stays in the frontmost surface; nested pickers keep their own focus. */
export function useOverlayFocus(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)

  close.current = onClose
  useEffect(() => {
    const root = ref.current

    if (!root) return

    const previous = document.activeElement
    const controls = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,textarea,[tabindex="0"]'
        )
      ).filter(
        element =>
          element.getClientRects().length &&
          !element.hasAttribute('disabled') &&
          !element.closest('[inert]')
      )
    const isTop = () => root.closest('[data-modal-topmost="true"]') !== null

    let initialized = false

    const initialize = () => {
      if (isTop() && !initialized) {
        initialized = true
        ;(
          root.querySelector<HTMLElement>('[data-autofocus]') ??
          controls()[0] ??
          root
        ).focus({ preventScroll: true })
      }
    }
    const frame = requestAnimationFrame(initialize)
    const observer = new MutationObserver(initialize)
    const wrapper = root.closest('[data-modal-overlay]')

    if (wrapper)
      observer.observe(wrapper, {
        attributes: true,
        attributeFilter: ['data-modal-topmost']
      })

    function keydown(event: KeyboardEvent) {
      if (!isTop() || event.defaultPrevented || event.isComposing) return
      if (
        Array.from(
          document.querySelectorAll<HTMLElement>(
            '.monolith-floating-surface,[role="listbox"],[role="menu"]'
          )
        ).some(
          layer =>
            !root!.contains(layer) &&
            layer.getClientRects().length &&
            !layer.closest('[inert]')
        )
      )
        return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close.current()
      }

      if (event.key === 'Tab') {
        const list = controls(),
          first = list[0],
          last = list[list.length - 1]

        if (!list.length) {
          event.preventDefault()
          root?.focus()

          return
        }

        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    function focus(event: FocusEvent) {
      if (
        isTop() &&
        event.target instanceof Node &&
        !root!.contains(event.target) &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            '[role="menu"],[role="listbox"],.monolith-floating-surface'
          )
        )
      )
        (controls()[0] ?? root)?.focus()
    }
    document.addEventListener('keydown', keydown)
    document.addEventListener('focusin', focus)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focus)
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        !previous.closest('[inert]') &&
        (root.contains(document.activeElement) ||
          document.activeElement === document.body)
      )
        previous.focus({ preventScroll: true })
    }
  }, [])

  return ref
}
