import type { CanvasBlock } from '@monolith/blocks'

import { blockSnapshot } from '@/utils/blockDrag'
import {
  animateLayout,
  kineticPose,
  reducedMotion,
  settleElement
} from '@/utils/elasticMotion'

import { resizeWidget } from './widgetModel'

/** Pointer capture works identically for mouse, touch and pen in WebKit/WebView2. */
export function widgetGesture(
  event: PointerEvent,
  handle: HTMLElement,
  tile: HTMLElement,
  grid: HTMLElement,
  block: CanvasBlock,
  mode: 'move' | 'resize',
  commit: (result: { before?: string | null; block?: CanvasBlock }) => void
) {
  const abort = new AbortController(),
    { signal } = abort
  const rect = tile.getBoundingClientRect(),
    pose = kineticPose()
  const gridWidth = grid.clientWidth
  const narrow = innerWidth <= 760
  const offsetX = event.clientX - rect.left,
    offsetY = event.clientY - rect.top
  let appliedHeight = '',
    appliedColumn = '',
    lastFrame = performance.now()
  let dropTarget: HTMLElement | undefined, dropPosition: string | undefined

  let x = event.clientX,
    y = event.clientY,
    frame = 0,
    active = false,
    before: string | null | undefined
  let next = block

  const oldHeight = tile.style.height,
    oldColumn = tile.style.gridColumn
  const preview = document.createElement('div')
  preview.className = 'monolith-block-drag-preview'
  preview.setAttribute('aria-hidden', 'true')
  preview.style.width = `${rect.width}px`
  preview.style.transformOrigin = `${offsetX}px ${offsetY}px`
  let scroll: HTMLElement | null = grid.parentElement
  while (
    scroll &&
    !(
      /(auto|scroll)/.test(getComputedStyle(scroll).overflowY) &&
      scroll.scrollHeight > scroll.clientHeight
    )
  )
    scroll = scroll.parentElement

  const tiles = () =>
    Array.from(grid.querySelectorAll<HTMLElement>(':scope > [data-widget-id]'))
  const stop = (save = false) => {
    if (signal.aborted) return
    abort.abort()
    cancelAnimationFrame(frame)
    preview.remove()
    tile.style.height = oldHeight
    tile.style.gridColumn = oldColumn
    tile.style.transform = ''
    delete tile.dataset.gesture
    for (const other of tiles()) delete other.dataset.drop
    if (handle.hasPointerCapture(event.pointerId))
      handle.releasePointerCapture(event.pointerId)

    if (save && active) {
      const positions = new Map(
        tiles().map(element => [element, element.getBoundingClientRect()])
      )

      if (mode === 'resize') commit({ block: next })
      else if (before !== undefined) commit({ before })
      requestAnimationFrame(() => {
        animateLayout(positions)
        settleElement(tile, 1.15)
      })
    }
  }
  const draw = () => {
    const now = performance.now()
    const elapsed = Math.min(32, now - lastFrame) / (1000 / 60)
    lastFrame = now
    if (!tile.isConnected || !grid.isConnected) {
      stop()

      return
    }

    if (!active && Math.hypot(x - event.clientX, y - event.clientY) > 4) {
      active = true
      tile.dataset.gesture = mode
      pose.reset(x, y)
      if (mode === 'move') {
        const snapshot = blockSnapshot(tile)
        preview.append(snapshot.element)
        document.body.append(preview)
        snapshot.restoreScroll()
      }
    }

    if (active) {
      const p = pose.sample(x, y, now, reducedMotion())

      if (mode === 'resize') {
        next = resizeWidget(
          block,
          rect.width + x - event.clientX,
          rect.height + y - event.clientY,
          gridWidth
        )
        if (narrow) next.width = block.width
        const height = `${next.height}px`
        const column = `span ${next.width === 'full' ? 12 : next.width === 'half' ? 6 : 4}`
        if (height !== appliedHeight) {
          tile.style.height = height
          appliedHeight = height
        }
        if (!narrow && column !== appliedColumn) {
          tile.style.gridColumn = column
          appliedColumn = column
        }
        tile.style.transform = `rotate(${p.angle * 0.13}deg) scale(${1 + (p.sx - 1) * 0.5}, ${1 + (p.sy - 1) * 0.5})`
      } else {
        const candidates = tiles().filter(other => other !== tile)
        const bounds = new Map(
          candidates.map(other => [other, other.getBoundingClientRect()])
        )
        const scrollBounds = scroll?.getBoundingClientRect()
        const under = candidates.find(other => {
          const r = bounds.get(other)!

          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
        })

        preview.style.transform = `translate3d(${p.x - offsetX}px, ${p.y - offsetY}px, 0) rotate(${p.angle}deg)`
        before = undefined
        let position: string | undefined
        if (under) {
          const r = bounds.get(under)!,
            index = candidates.indexOf(under)
          const after = y > r.top + r.height * 0.65
          before = after
            ? (candidates[index + 1]?.dataset.widgetId ?? null)
            : under.dataset.widgetId
          position = after ? 'after' : 'before'
        } else if (
          candidates.length &&
          y > bounds.get(candidates[candidates.length - 1]!)!.bottom
        )
          before = null
        if (dropTarget !== under || dropPosition !== position) {
          if (dropTarget) delete dropTarget.dataset.drop
          if (under && position) under.dataset.drop = position
          dropTarget = under
          dropPosition = position
        }

        if (scroll && scrollBounds) {
          const r = scrollBounds

          if (y < r.top + 60)
            scroll.scrollTop -= Math.min(16, (r.top + 60 - y) / 4) * elapsed
          if (y > r.bottom - 60)
            scroll.scrollTop += Math.min(16, (y - r.bottom + 60) / 4) * elapsed
        }
      }
    }
    frame = requestAnimationFrame(draw)
  }
  handle.setPointerCapture(event.pointerId)
  window.addEventListener(
    'pointermove',
    e => {
      if (e.pointerId === event.pointerId) {
        x = e.clientX
        y = e.clientY
      }
    },
    { signal }
  )
  window.addEventListener(
    'pointerup',
    e => {
      if (e.pointerId !== event.pointerId) return
      // A fast release can arrive before the next animation frame.
      x = e.clientX
      y = e.clientY
      cancelAnimationFrame(frame)
      draw()
      stop(true)
    },
    { signal }
  )
  window.addEventListener('pointercancel', () => stop(), { signal })
  handle.addEventListener('lostpointercapture', () => stop(), { signal })
  window.addEventListener('blur', () => stop(), { signal })
  window.addEventListener(
    'keydown',
    e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        stop()
      }
    },
    { signal, capture: true }
  )
  frame = requestAnimationFrame(draw)

  return () => stop()
}
