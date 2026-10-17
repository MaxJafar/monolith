import { useModuleTranslation } from '@monolith/localization'
import {
  elasticDragPreview,
  getInternalDragData,
  setInternalDragData
} from '@monolith/ui'
import {
  type DragEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { useDatabases } from '@/DatabaseProvider'
import {
  type BoardGroup,
  boardColumnWidth,
  boardGroupKey,
  insertBoardGroup,
  orderedBoardGroups
} from '@/utils/board'

import type { SavedView, ViewConfig } from '../../../shared'
import { serializeView } from './useViewAutosave'

type Layout = NonNullable<ViewConfig['board_layout']>
const emptyLayout: Layout = { order: {}, columns: {}, collapsed_sections: [] }
const dragType = 'application/x-monolith-board-column'

export function useBoardLayout({
  view,
  fieldId,
  groups,
  board,
  disabled
}: {
  view?: SavedView
  fieldId: string
  groups: BoardGroup[]
  board: RefObject<HTMLDivElement | null>
  disabled: boolean
}) {
  const { api, run, retry } = useDatabases()
  const { t } = useModuleTranslation()
  const [pending, setPending] = useState<Layout | null>(null)
  const [liveWidth, setLiveWidth] = useState<{
    key: string
    width: number
  } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [target, setTarget] = useState<{
    before: string | null
    x: number
  } | null>(null)
  const [motion, setMotion] = useState<'collapse' | 'reorder' | null>(null)
  const [failed, setFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const layout = pending ?? view?.config.board_layout ?? emptyLayout
  const ordered = orderedBoardGroups(groups, fieldId, layout.order[fieldId])
  const keys = ordered.map(group => boardGroupKey(fieldId, group.value))
  const saving = useRef(false)
  const source = useRef<string | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const resize = useRef<{
    key: string
    x: number
    width: number
    next: number
  } | null>(null)
  const stopPreview = useRef<(() => void) | undefined>(undefined)
  const before = useRef(new Map<HTMLElement, DOMRect>())
  const animations = useRef<Animation[]>([])
  const motionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const restoreFocus = useRef<HTMLElement | null>(null)
  const focusGroup = useRef<string | null>(null)
  const resizeEvents = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const width = (key: string) =>
    liveWidth?.key === key
      ? liveWidth.width
      : boardColumnWidth(layout.columns[key]?.width)
  const closed = (key: string) => !!layout.columns[key]?.collapsed

  function capture() {
    before.current = new Map(
      Array.from(
        board.current?.querySelectorAll<HTMLElement>('[data-board-layout]') ??
          []
      ).map(element => [element, element.getBoundingClientRect()])
    )
    animations.current.forEach(animation => animation.cancel())
    animations.current = []
  }
  function animate(kind: 'collapse' | 'reorder') {
    clearTimeout(motionTimer.current)
    setMotion(kind)
    motionTimer.current = setTimeout(() => setMotion(null), 240)
  }
  useLayoutEffect(() => {
    if (!disabled && focusGroup.current) {
      const key = focusGroup.current
      const control = Array.from(
        board.current?.querySelectorAll<HTMLButtonElement>(
          '[data-board-group-toggle]'
        ) ?? []
      ).find(
        element =>
          element.dataset.boardGroupToggle === key &&
          !element.closest('[inert]')
      )
      control?.focus({ preventScroll: true })
      focusGroup.current = null
    }
    if (!disabled && restoreFocus.current) {
      if (
        document.activeElement === document.body ||
        document.activeElement === restoreFocus.current
      )
        restoreFocus.current.focus()
      restoreFocus.current = null
    }
    const rects = before.current
    before.current = new Map()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    for (const [element, old] of rects) {
      if (!element.isConnected) continue
      const rect = element.getBoundingClientRect()
      const x = old.left - rect.left
      if (Math.abs(x) < 1 || !rect.width) continue
      animations.current.push(
        element.animate([{ translate: `${x}px 0` }, { translate: '0 0' }], {
          duration: 230,
          easing: 'cubic-bezier(.2,.8,.2,1)'
        })
      )
    }
  })

  async function save(change: (current: Layout) => Layout) {
    if (disabled || saving.current || !view) return
    saving.current = true
    setFailed(false)
    setAnnouncement('')
    setPending(change(layout))
    const result = await run(() =>
      serializeView(view.id, async () => {
        const current = (await api.snapshot.query()).views.find(
          item => item.id === view.id
        )
        if (!current || current.config.locked)
          throw Error('View is unavailable')
        return api.updateView.input({ id: view.id }).mutate({
          ...current,
          config: {
            ...current.config,
            board_layout: change(current.config.board_layout ?? emptyLayout)
          }
        })
      })
    )
    saving.current = false
    if (!mounted.current) return
    if (!result) {
      capture()
      retry()
    }
    setPending(null)
    setFailed(!result)
    setAnnouncement(t(result ? 'boardLayoutSaved' : 'boardLayoutFailed'))
  }

  function reorder(key: string, beforeKey: string | null) {
    if (disabled || beforeKey === key) return
    const order = insertBoardGroup(
      keys,
      layout.order[fieldId] ?? [],
      key,
      beforeKey
    )
    if (JSON.stringify(order) === JSON.stringify(layout.order[fieldId] ?? keys))
      return
    capture()
    animate('reorder')
    void save(current => ({
      ...current,
      order: {
        ...current.order,
        [fieldId]: insertBoardGroup(
          keys,
          current.order[fieldId] ?? [],
          key,
          beforeKey
        )
      }
    }))
  }
  function cancel() {
    resizeEvents.current?.abort()
    resizeEvents.current = null
    stopPreview.current?.()
    stopPreview.current = undefined
    source.current = null
    pointer.current = null
    resize.current = null
    setDragging(null)
    setTarget(null)
    setLiveWidth(null)
  }
  function locate(x: number, y: number) {
    const root = board.current
    if (!source.current || !root) return
    const bounds = root.getBoundingClientRect()
    if (
      x < bounds.left ||
      x > bounds.right ||
      y < bounds.top ||
      y > bounds.bottom
    ) {
      setTarget(null)
      return
    }
    const headings = Array.from(
      root.querySelectorAll<HTMLElement>('[data-board-column-key]')
    ).filter(
      element =>
        element.dataset.boardColumnKey !== source.current &&
        element.getBoundingClientRect().width > 0
    )
    const next = headings.find(
      element =>
        x < element.getBoundingClientRect().left + element.clientWidth / 2
    )
    const last = headings[headings.length - 1]
    const edge =
      next?.getBoundingClientRect().left ??
      last?.getBoundingClientRect().right ??
      bounds.left
    const nextTarget = {
      before: next?.dataset.boardColumnKey ?? null,
      x: Math.max(1, edge - bounds.left + root.scrollLeft - (next ? 6 : 0))
    }
    setTarget(current =>
      current?.before === nextTarget.before && current.x === nextTarget.x
        ? current
        : nextTarget
    )
  }
  const locateRef = useRef(locate)
  locateRef.current = locate
  useEffect(() => {
    if (disabled) cancel()
  }, [disabled, fieldId])
  useEffect(() => {
    if (!dragging && !liveWidth) return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    window.addEventListener('blur', cancel, options)
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          cancel()
        }
      },
      { ...options, capture: true }
    )
    document.addEventListener('dragend', cancel, options)
    const trackPointer = (event: globalThis.DragEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY }
      locateRef.current(event.clientX, event.clientY)
    }
    document.addEventListener('dragover', trackPointer, {
      ...options,
      capture: true
    })
    document.addEventListener('dragenter', trackPointer, {
      ...options,
      capture: true
    })
    let frame = 0,
      previous = performance.now()
    function scroll(now: number) {
      const root = board.current,
        point = pointer.current
      if (root && point && source.current) {
        const bounds = root.getBoundingClientRect()
        if (
          point.y >= bounds.top &&
          point.y <= bounds.bottom &&
          point.x >= bounds.left &&
          point.x <= bounds.right
        ) {
          const speed =
            point.x < bounds.left + 44
              ? -Math.min(1, (bounds.left + 44 - point.x) / 44)
              : point.x > bounds.right - 44
                ? Math.min(1, (point.x - bounds.right + 44) / 44)
                : 0
          if (speed) {
            root.scrollLeft += speed * Math.min(now - previous, 32) * 0.65
            locateRef.current(point.x, point.y)
          }
        }
      }
      previous = now
      frame = requestAnimationFrame(scroll)
    }
    if (dragging) frame = requestAnimationFrame(scroll)
    return () => {
      controller.abort()
      cancelAnimationFrame(frame)
    }
  }, [dragging, !!liveWidth, board])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      resizeEvents.current?.abort()
      stopPreview.current?.()
      clearTimeout(motionTimer.current)
      animations.current.forEach(animation => animation.cancel())
    }
  }, [])

  function setWidth(key: string, next: number) {
    if (next === boardColumnWidth(layout.columns[key]?.width)) return
    void save(current => ({
      ...current,
      columns: {
        ...current.columns,
        [key]: { ...current.columns[key], width: boardColumnWidth(next) }
      }
    }))
  }
  return {
    groups: ordered,
    width,
    closed,
    dragging,
    target,
    resizing: !!liveWidth,
    motion,
    failed,
    announcement,
    cancel,
    toggleColumn(key: string) {
      if (disabled) return
      focusGroup.current = key
      animate('collapse')
      const collapsed = !closed(key)
      void save(current => ({
        ...current,
        columns: {
          ...current.columns,
          [key]: { ...current.columns[key], collapsed }
        }
      }))
    },
    sectionClosed: (key: string) => layout.collapsed_sections.includes(key),
    toggleSection(key: string) {
      const collapsed = !layout.collapsed_sections.includes(key)
      void save(current => ({
        ...current,
        collapsed_sections: collapsed
          ? [...new Set([...current.collapsed_sections, key])]
          : current.collapsed_sections.filter(value => value !== key)
      }))
    },
    shift(key: string, direction: number, element: HTMLElement) {
      const visible = keys.filter(key => !closed(key)),
        index = visible.indexOf(key)
      if (
        index < 0 ||
        (direction < 0 ? index === 0 : index === visible.length - 1)
      )
        return
      restoreFocus.current = element
      reorder(
        key,
        direction < 0 ? visible[index - 1]! : (visible[index + 2] ?? null)
      )
    },
    start(event: DragEvent<HTMLElement>, key: string, label: string) {
      if (disabled) {
        event.preventDefault()
        return
      }
      event.stopPropagation()
      source.current = key
      setInternalDragData(event.nativeEvent, dragType, key)
      event.dataTransfer.effectAllowed = 'move'
      const heading = event.currentTarget.closest<HTMLElement>(
        '[data-board-column-key]'
      )
      stopPreview.current = elasticDragPreview(
        event.nativeEvent,
        label,
        heading ?? event.currentTarget
      )
      setDragging(key)
    },
    over(event: DragEvent<HTMLElement>) {
      if (!source.current) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      pointer.current = { x: event.clientX, y: event.clientY }
      locate(event.clientX, event.clientY)
    },
    drop(event: DragEvent<HTMLElement>) {
      const key = source.current
      if (!key) return
      event.preventDefault()
      event.stopPropagation()
      const valid = getInternalDragData(event.nativeEvent, dragType) === key
      cancel()
      if (valid && target) reorder(key, target.before)
    },
    resizeProps(key: string) {
      return {
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          if (event.button !== 0 || disabled) return
          event.preventDefault()
          event.stopPropagation()
          resize.current = {
            key,
            x: event.clientX,
            width: width(key),
            next: width(key)
          }
          setLiveWidth({ key, width: width(key) })
          const handle = event.currentTarget
          const pointerId = event.pointerId
          handle.setPointerCapture(pointerId)
          resizeEvents.current?.abort()
          const controller = new AbortController()
          resizeEvents.current = controller
          const options = { signal: controller.signal, capture: true }
          // Track outside the editor's event delegation so embedded boards keep
          // resizing even when the document intercepts pointer movement.
          document.addEventListener(
            'pointermove',
            move => {
              const active = resize.current
              if (!active || move.pointerId !== pointerId) return
              active.next = boardColumnWidth(
                active.width + move.clientX - active.x
              )
              setLiveWidth({ key, width: active.next })
            },
            options
          )
          document.addEventListener(
            'pointerup',
            up => {
              const active = resize.current
              if (!active || up.pointerId !== pointerId) return
              const next = boardColumnWidth(
                active.width + up.clientX - active.x
              )
              resize.current = null
              controller.abort()
              resizeEvents.current = null
              setLiveWidth(null)
              if (handle.hasPointerCapture(pointerId))
                handle.releasePointerCapture(pointerId)
              setWidth(key, next)
            },
            options
          )
          document.addEventListener('pointercancel', cancel, options)
        },
        onPointerCancel: cancel,
        onLostPointerCapture() {
          if (resize.current) cancel()
        }
      }
    },
    resizeKey(key: string, next: number, element: HTMLElement) {
      restoreFocus.current = element
      setWidth(key, next)
    }
  }
}
