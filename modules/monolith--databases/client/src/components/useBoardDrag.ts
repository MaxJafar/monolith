import { getInternalDragData } from '@monolith/ui'
import {
  type DragEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import type { CellValue } from '../../../shared'

export type BoardCell = { key: string; group: CellValue; section: CellValue }
export type BoardDrag = BoardCell & { id: string }
export type BoardDrop = BoardCell & { before: string | null; y: number }

export function useBoardDrag({
  disabled,
  onDrop
}: {
  disabled: boolean
  onDrop: (source: BoardDrag, target: BoardDrop) => void
}) {
  const board = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<BoardDrag | null>(null)
  const [target, setTarget] = useState<BoardDrop | null>(null)
  const source = useRef<BoardDrag | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const grabOffset = useRef<{ x: number; y: number } | null>(null)
  const cells = useRef(new Map<string, BoardCell>())
  const animations = useRef(new Map<HTMLElement, Animation>())
  const before = useRef<{
    rects: Map<string, DOMRect>
    moved?: DOMRect
    target?: string
  } | null>(null)

  function captureLayout(
    id?: string,
    fromKey?: string,
    toKey?: string,
    point?: { x: number; y: number }
  ) {
    const rects = new Map<string, DOMRect>()
    let moved: DOMRect | undefined
    board.current
      ?.querySelectorAll<HTMLElement>('[data-board-slot]')
      .forEach(element => {
        const rect = element.getBoundingClientRect()
        rects.set(element.dataset.boardSlot!, rect)
        if (
          element.dataset.boardRecord === id &&
          element.closest<HTMLElement>('[data-board-cell]')?.dataset
            .boardCell === fromKey
        )
          moved = rect
      })
    const targetKey = id && toKey ? JSON.stringify([toKey, id]) : undefined
    if (point && grabOffset.current && moved && targetKey) {
      // Settle from the pointer's release position, never jump back to the
      // source column after the floating preview is removed.
      moved = new DOMRect(
        point.x - grabOffset.current.x,
        point.y - grabOffset.current.y,
        moved.width,
        moved.height
      )
      rects.set(targetKey, moved)
    }
    animations.current.forEach(animation => animation.cancel())
    animations.current.clear()
    before.current = {
      rects,
      moved,
      target: targetKey
    }
  }

  useLayoutEffect(() => {
    const snapshot = before.current
    before.current = null
    if (!snapshot || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    board.current
      ?.querySelectorAll<HTMLElement>('[data-board-slot]')
      .forEach(element => {
        const old =
          snapshot.rects.get(element.dataset.boardSlot!) ??
          (snapshot.target === element.dataset.boardSlot
            ? snapshot.moved
            : undefined)
        if (!old || typeof element.animate !== 'function') return
        const current = element.getBoundingClientRect()
        const x = old.left - current.left,
          y = old.top - current.top
        if (Math.abs(x) + Math.abs(y) < 1) return
        const animation = element.animate(
          [{ translate: `${x}px ${y}px` }, { translate: '0 0' }],
          { duration: 230, easing: 'cubic-bezier(.2,.8,.2,1)' }
        )
        animations.current.set(element, animation)
        animation.onfinish = () => animations.current.delete(element)
      })
  })

  function cancel() {
    source.current = null
    pointer.current = null
    grabOffset.current = null
    setDragging(null)
    setTarget(null)
  }

  function locate(column: HTMLElement, cell: BoardCell, y: number): BoardDrop {
    const cards = [
      ...column.querySelectorAll<HTMLElement>(':scope > [data-board-slot]')
    ].filter(element => element.dataset.boardRecord !== source.current?.id)
    const next = cards.find(element => {
      const rect = element.getBoundingClientRect()
      return y < rect.top + rect.height / 2
    })
    const rect = column.getBoundingClientRect()
    const line = next
      ? next.getBoundingClientRect().top - 4
      : cards.length
        ? cards[cards.length - 1]!.getBoundingClientRect().bottom + 4
        : rect.top + 8
    return {
      ...cell,
      before: next?.dataset.boardRecord ?? null,
      y: Math.max(6, line - rect.top)
    }
  }

  function show(next: BoardDrop) {
    setTarget(current =>
      current?.key === next.key &&
      current.before === next.before &&
      Math.abs(current.y - next.y) < 1
        ? current
        : next
    )
  }

  function over(event: DragEvent<HTMLElement>, cell: BoardCell) {
    if (!source.current || disabled) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    pointer.current = { x: event.clientX, y: event.clientY }
    cells.current.set(cell.key, cell)
    show(locate(event.currentTarget, cell, event.clientY))
  }

  useEffect(() => {
    if (disabled) {
      cancel()
      return
    }
    if (!dragging) return
    const controller = new AbortController()
    const options = { signal: controller.signal, capture: true }
    const stop = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel()
    }
    document.addEventListener('keydown', stop, options)
    window.addEventListener('blur', cancel, options)
    document.addEventListener('dragend', cancel, options)
    const trackPointer = (event: globalThis.DragEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY }
      if (
        !(event.target instanceof Node) ||
        !board.current?.contains(event.target)
      )
        setTarget(null)
    }
    document.addEventListener('dragover', trackPointer, options)
    document.addEventListener('dragenter', trackPointer, options)
    let frame = 0
    let last = performance.now()
    const scroll = (now: number) => {
      const elapsed = Math.min(32, now - last)
      last = now
      const point = pointer.current,
        root = board.current
      if (point && root) {
        const bounds = root.getBoundingClientRect()
        const speed = (position: number, start: number, end: number) =>
          position < start || position > end
            ? 0
            : position < start + 44
              ? -(1 - (position - start) / 44)
              : position > end - 44
                ? 1 - (end - position) / 44
                : 0
        if (
          point.y >= Math.max(0, bounds.top) &&
          point.y <= Math.min(innerHeight, bounds.bottom)
        )
          root.scrollLeft +=
            speed(
              point.x,
              Math.max(0, bounds.left),
              Math.min(innerWidth, bounds.right)
            ) *
            elapsed *
            0.65
        let parent =
          point.x >= bounds.left && point.x <= bounds.right
            ? root.parentElement
            : null
        while (parent) {
          if (
            parent.scrollHeight > parent.clientHeight + 1 &&
            /(auto|scroll)/.test(getComputedStyle(parent).overflowY)
          ) {
            const rect = parent.getBoundingClientRect()
            parent.scrollTop +=
              speed(
                point.y,
                Math.max(0, rect.top),
                Math.min(innerHeight, rect.bottom)
              ) *
              elapsed *
              0.65
            break
          }
          parent = parent.parentElement
        }
        const column = document
          .elementFromPoint(point.x, point.y)
          ?.closest<HTMLElement>('[data-board-cell]')
        const cell = column && cells.current.get(column.dataset.boardCell!)
        if (column && cell && root.contains(column))
          show(locate(column, cell, point.y))
      }
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)
    return () => {
      controller.abort()
      cancelAnimationFrame(frame)
    }
  }, [dragging, disabled])

  useEffect(
    () => () => {
      animations.current.forEach(animation => animation.cancel())
    },
    []
  )

  return {
    board,
    dragging,
    target,
    captureLayout,
    cancel,
    start(origin: BoardDrag, point?: { x: number; y: number }) {
      if (disabled) return
      source.current = origin
      const slot = [
        ...(board.current?.querySelectorAll<HTMLElement>('[data-board-slot]') ??
          [])
      ].find(
        element =>
          element.dataset.boardSlot === JSON.stringify([origin.key, origin.id])
      )
      const rect = slot?.getBoundingClientRect()
      grabOffset.current =
        point && rect ? { x: point.x - rect.left, y: point.y - rect.top } : null
      cells.current.clear()
      setDragging(origin)
      setTarget(null)
    },
    over,
    leave(event: DragEvent<HTMLElement>) {
      const next =
        event.relatedTarget instanceof Node
          ? event.relatedTarget
          : document.elementFromPoint(event.clientX, event.clientY)
      if (!next || !event.currentTarget.contains(next)) setTarget(null)
    },
    drop(event: DragEvent<HTMLElement>, cell: BoardCell) {
      const origin = source.current
      if (
        !origin ||
        disabled ||
        getInternalDragData(
          event.nativeEvent,
          'application/x-monolith-record'
        ) !== origin.id
      )
        return
      event.preventDefault()
      event.stopPropagation()
      const destination = locate(event.currentTarget, cell, event.clientY)
      captureLayout(origin.id, origin.key, destination.key, {
        x: event.clientX,
        y: event.clientY
      })
      cancel()
      onDrop(origin, destination)
    }
  }
}
