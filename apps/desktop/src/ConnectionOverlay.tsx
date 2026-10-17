import { Stack, usePopoverExit } from '@monolith/ui'
import { type ReactNode, useEffect, useRef } from 'react'

export default function ConnectionOverlay({
  label,
  onClose,
  children
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  usePopoverExit(ref)
  useEffect(() => {
    const panel = ref.current
    const previous = document.activeElement
    panel?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        close.current()
      }
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel?.contains(event.target))
        close.current()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', outside)
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        (panel?.contains(document.activeElement) ||
          document.activeElement === document.body)
      )
        previous.focus({ preventScroll: true })
    }
  }, [])
  return (
    <Stack
      ref={ref}
      className="desktop-connection"
      gap="md"
      role="dialog"
      aria-label={label}
    >
      {children}
    </Stack>
  )
}
