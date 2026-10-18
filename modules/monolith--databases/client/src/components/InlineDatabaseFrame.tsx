import {
  Box,
  kineticPose,
  reducedMotion,
  settleElement
} from '@monolith/ui'
import { type ReactNode, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export function InlineDatabaseFrame({
  children,
  height = 0,
  onHeightChange
}: {
  children: ReactNode
  height?: number
  onHeightChange?: (height: number) => void
}) {
  const { t } = useTranslation('common.inlineDatabase')
  const viewport = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; height: number; next: number } | null>(null)
  const raf = useRef(0)
  const pose = useRef(kineticPose())
  const clamp = (value: number) =>
    Math.round(Math.max(240, Math.min(1200, value)))
  const reset = (restoredHeight = height) => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    drag.current = null
    if (frame.current) {
      delete frame.current.dataset.resizing
      frame.current.style.transform = ''
    }
    if (viewport.current)
      viewport.current.style.minHeight = restoredHeight
        ? `${restoredHeight}px`
        : ''
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return (
    <Box ref={frame} className="monolith-inline-database" minWidth="0">
      <Box
        ref={viewport}
        className="monolith-inline-viewport"
        style={{ minHeight: height || undefined }}
      >
        {children}
      </Box>
      {onHeightChange && (
        <Box
          as="button"
          type="button"
          className="monolith-database-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('resize')}
          aria-valuemin={0}
          aria-valuemax={1200}
          aria-valuenow={height}
          title={t('resizeHelp')}
          onDoubleClick={() => {
            onHeightChange(0)
            settleElement(frame.current)
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              reset()
              return
            }
            if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 0
                : clamp(
                    (height || viewport.current?.clientHeight || 560) +
                      (event.key === 'ArrowUp' ? -40 : 40)
                  )
            onHeightChange(next)
            settleElement(frame.current, 0.5)
          }}
          onPointerDown={event => {
            if (event.button !== 0 || !viewport.current) return
            event.preventDefault()
            event.stopPropagation()
            frame.current
              ?.getAnimations()
              .forEach(animation => animation.cancel())
            const current = viewport.current.clientHeight
            drag.current = { y: event.clientY, height: current, next: current }
            pose.current.reset(0, current)
            event.currentTarget.setPointerCapture(event.pointerId)
            frame.current!.dataset.resizing = 'true'
          }}
          onPointerMove={event => {
            if (!drag.current) return
            drag.current.next = clamp(
              drag.current.height + event.clientY - drag.current.y
            )
            if (!raf.current)
              raf.current = requestAnimationFrame(function draw() {
                if (drag.current && viewport.current) {
                  const nextHeight = `${drag.current.next}px`
                  if (viewport.current.style.minHeight !== nextHeight)
                    viewport.current.style.minHeight = nextHeight
                  const p = pose.current.sample(
                    0,
                    drag.current.next,
                    performance.now(),
                    reducedMotion()
                  )
                  if (frame.current)
                    frame.current.style.transform = `scale(${p.sx}, ${p.sy})`
                  raf.current = requestAnimationFrame(draw)
                }
              })
          }}
          onPointerUp={event => {
            if (!drag.current) return
            const next = clamp(
              drag.current.height + event.clientY - drag.current.y
            )
            reset(next)
            event.currentTarget.releasePointerCapture(event.pointerId)
            onHeightChange(next)
            settleElement(frame.current)
          }}
          onPointerCancel={() => reset()}
          onLostPointerCapture={() => {
            if (drag.current) reset()
          }}
        >
          <span aria-hidden="true" />
        </Box>
      )}
    </Box>
  )
}
