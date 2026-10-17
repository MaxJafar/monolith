import { Box } from '@monolith/ui'
import { type RefObject, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useSidebarPreferences } from './SidebarPreferences'

export default function SidebarResize({
  sidebar
}: {
  sidebar: RefObject<HTMLElement | null>
}) {
  const { preferences, update } = useSidebarPreferences()
  const { t } = useTranslation('common.workspaceUI')
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => () => cancel.current?.(), [])

  return (
    <Box
      aria-label={t('resizeSidebar')}
      aria-orientation="vertical"
      aria-valuemax={420}
      aria-valuemin={220}
      aria-valuenow={preferences.width}
      className="monolith-sidebar-resize"
      role="separator"
      tabIndex={0}
      onDoubleClick={() => update({ width: 264 })}
      onKeyDown={event => {
        const amount = event.shiftKey ? 32 : 8

        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          update({
            width:
              event.key === 'Home'
                ? 220
                : event.key === 'End'
                  ? 420
                  : preferences.width +
                    (event.key === 'ArrowRight' ? amount : -amount)
          })
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || !sidebar.current) return
        event.preventDefault()
        cancel.current?.()
        const root = sidebar.current,
          handle = event.currentTarget as HTMLElement,
          pointer = event.pointerId,
          start = event.clientX,
          original = preferences.width

        let width = original,
          frame = 0,
          finished = false

        const abort = new AbortController()
        root.setAttribute('data-resizing', 'true')
        handle.focus({ preventScroll: true })
        handle.setPointerCapture(pointer)
        const finish = (commit: boolean) => {
          if (finished) return
          finished = true
          abort.abort()
          cancelAnimationFrame(frame)
          root.style.setProperty(
            '--sidebar-width',
            `${commit ? width : original}px`
          )
          root.removeAttribute('data-resizing')
          if (handle.hasPointerCapture(pointer))
            handle.releasePointerCapture(pointer)

          if (commit) update({ width })
          cancel.current = null
        }
        const options = { signal: abort.signal }
        handle.addEventListener(
          'pointermove',
          e => {
            if (e.pointerId !== pointer) return
            width = Math.round(
              Math.max(220, Math.min(420, original + e.clientX - start))
            )
            if (!frame)
              frame = requestAnimationFrame(() => {
                root.style.setProperty('--sidebar-width', `${width}px`)
                frame = 0
              })
          },
          options
        )
        handle.addEventListener(
          'pointerup',
          e => {
            if (e.pointerId === pointer) finish(true)
          },
          options
        )
        handle.addEventListener('pointercancel', () => finish(false), options)
        handle.addEventListener(
          'lostpointercapture',
          () => finish(false),
          options
        )
        window.addEventListener('blur', () => finish(false), options)
        window.addEventListener(
          'keydown',
          e => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              finish(false)
            }
          },
          { ...options, capture: true }
        )
        cancel.current = () => finish(false)
      }}
    />
  )
}
