import type { BlockSnapshot } from '@blocksuite/store'

import { blockSnapshot } from '@/utils/blockDrag'
import {
  kineticPose,
  reducedMotion,
  settleElement
} from '@/utils/elasticMotion'

import type { DocumentAdapter } from './adapter'

const clipboardType = 'application/x-monolith-blocks+json'
const excluded = new Set([
  'affine:page',
  'affine:surface',
  'affine:note',
  'monolith:column'
])

export type InteractionLabels = {
  selectBlock: string
  movingBlocks: (count: number) => string
  error: (error: unknown) => void
  menu?: (position: { x: number; y: number }) => void
}

export function bindDocumentInteractions(
  adapter: DocumentAdapter,
  labels: InteractionLabels
) {
  const { host, store } = adapter
  const abort = new AbortController()
  const { signal } = abort
  let updateFrame = 0
  let dragFrame = 0
  let settleFrame = 0
  const pose = kineticPose()
  let lastX = 0
  let lastY = 0
  let drag:
    | {
        id: string
        x: number
        y: number
        startX: number
        startY: number
        active: boolean
        mode: 'move' | 'select'
        menu: boolean
        offsetX?: number
        offsetY?: number
      }
    | undefined
  let target: { parent: string; sibling?: string; before: boolean } | undefined
  const indicator = document.createElement('div')
  indicator.className = 'monolith-document-drop monolith-block-drop'
  indicator.hidden = true
  const preview = document.createElement('div')
  preview.className = 'monolith-block-drag-preview'
  preview.hidden = true
  preview.setAttribute('aria-hidden', 'true')
  document.body.append(indicator, preview)

  let elementsDirty = true
  let blockElements: HTMLElement[] = []
  const elements = () => {
    if (!elementsDirty) return blockElements
    elementsDirty = false
    const owners = new Map<string, HTMLElement>()
    for (const element of host.querySelectorAll<HTMLElement>(
      '[data-block-id]'
    )) {
      const id = element.dataset.blockId!
      if (
        !owners.has(id) &&
        !excluded.has(store.getModelById(id)?.flavour ?? 'affine:page')
      )
        owners.set(id, element)
    }
    blockElements = [...owners.values()]
    return blockElements
  }
  const syncBackgrounds = () => {
    for (const element of elements()) {
      const color = (
        store.getModelById(element.dataset.blockId!)?.props as Record<
          string,
          unknown
        >
      )?.['monolith:background']
      const value =
        typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : ''
      element.dataset.monolithBackground = value ? 'true' : 'false'
      element.style.setProperty(
        '--monolith-block-background',
        value ? `color-mix(in srgb, ${value} 28%, var(--bg-primary))` : ''
      )
    }
  }
  const syncSelection = () => {
    const selected = new Set(adapter.selected)
    for (const element of elements()) {
      const value = String(selected.has(element.dataset.blockId!))
      if (element.dataset.monolithSelected !== value)
        element.dataset.monolithSelected = value
    }
  }
  const syncGrips = () => {
    updateFrame = 0
    const owners = new Set(elements())
    const seen = new Set<string>()
    for (const control of host.querySelectorAll<HTMLElement>(
      '.monolith-document-grip, .monolith-document-gutter'
    )) {
      const parent = control.parentElement
      const key = `${parent?.dataset.blockId}:${control.className}`
      if (!parent || !owners.has(parent) || seen.has(key)) control.remove()
      else seen.add(key)
    }
    for (const element of owners) {
      const existing = element.querySelector<HTMLButtonElement>(
        ':scope > .monolith-document-grip'
      )
      if (store.readonly) {
        existing?.remove()
        element.querySelector(':scope > .monolith-document-gutter')?.remove()
        continue
      }
      if (existing) continue
      const grip = document.createElement('button')
      grip.type = 'button'
      grip.className = 'monolith-document-grip'
      grip.contentEditable = 'false'
      grip.dataset.gripId = element.dataset.blockId
      grip.setAttribute('aria-label', labels.selectBlock)
      grip.title = labels.selectBlock
      grip.textContent = '⠿'
      const gutter = document.createElement('span')
      gutter.className = 'monolith-document-gutter'
      gutter.contentEditable = 'false'
      gutter.dataset.selectId = element.dataset.blockId
      gutter.setAttribute('aria-hidden', 'true')
      element.append(grip, gutter)
    }
    syncSelection()
    syncBackgrounds()
  }
  const scheduleGrips = () => {
    if (!updateFrame) updateFrame = requestAnimationFrame(syncGrips)
  }
  const observer = new MutationObserver(records => {
    if (
      records.some(record =>
        Array.from([...record.addedNodes, ...record.removedNodes]).some(
          node =>
            node instanceof Element &&
            !node.matches('.monolith-document-grip, .monolith-document-gutter')
        )
      )
    ) {
      elementsDirty = true
      scheduleGrips()
    }
  })
  observer.observe(host, { childList: true, subtree: true })
  const selection = adapter.std.selection.slots.changed.subscribe(syncSelection)
  const readonly = store.readonly$.subscribe(scheduleGrips)
  scheduleGrips()
  store.spaceDoc.on('update', syncBackgrounds)

  const finish = (commit = false) => {
    if (!drag) return
    const ids = adapter.selected
    const positions = new Map(
      elements().map(element => [
        element.dataset.blockId!,
        element.getBoundingClientRect()
      ])
    )
    const moving = commit && drag?.active && drag.mode === 'move' && target
    if (moving && target)
      adapter.move(ids, target.parent, target.sibling, target.before)
    for (const element of elements()) delete element.dataset.monolithDragging
    if (moving && !reducedMotion()) {
      cancelAnimationFrame(settleFrame)
      settleFrame = requestAnimationFrame(() => {
        settleFrame = requestAnimationFrame(() => {
          if (signal.aborted) return
          for (const element of elements()) {
            if (ids.includes(element.dataset.blockId!)) {
              settleElement(element)
              continue
            }
            const previous = positions.get(element.dataset.blockId!)
            const next = element.getBoundingClientRect()
            if (
              !previous ||
              next.bottom < 0 ||
              next.top > innerHeight ||
              typeof element.animate !== 'function'
            )
              continue
            const dy = previous.top - next.top
            if (Math.abs(dy) > 1 && Math.abs(dy) < innerHeight)
              element.animate(
                [{ translate: `0 ${dy}px` }, { translate: '0 0' }],
                { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }
              )
          }
        })
      })
    }
    drag = undefined
    target = undefined
    indicator.hidden = preview.hidden = true
    cancelAnimationFrame(dragFrame)
  }
  const scrollParent = () => {
    let element: HTMLElement | null = host
    while (element) {
      if (
        /(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight
      )
        return element
      element = element.parentElement
    }
    return document.scrollingElement as HTMLElement
  }
  const frame = () => {
    if (!drag?.active) return
    const scroller = scrollParent()
    const rect =
      scroller === document.scrollingElement
        ? { top: 0, bottom: innerHeight }
        : scroller.getBoundingClientRect()
    const delta =
      drag.y < rect.top + 64
        ? -Math.min(18, (rect.top + 64 - drag.y) / 3)
        : drag.y > rect.bottom - 64
          ? Math.min(18, (drag.y - rect.bottom + 64) / 3)
          : 0
    if (delta) scroller.scrollTop += delta
    const column = document
      .elementFromPoint(drag.x, drag.y)
      ?.closest<HTMLElement>('monolith-column, affine-callout')
    target = undefined
    indicator.hidden = true
    const candidates = elements()
      .filter(
        element => !column || (element !== column && column.contains(element))
      )
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(item => item.rect.bottom > 0 && item.rect.top < innerHeight)
    const nearest = candidates.sort((a, b) => {
      const distance = (r: DOMRect) =>
        Math.max(r.left - drag!.x, 0, drag!.x - r.right) * 3 +
        Math.abs(drag!.y - (r.top + Math.min(r.height, 36) / 2))
      return distance(a.rect) - distance(b.rect)
    })[0]
    if (nearest && drag.mode === 'select') {
      adapter.selectFromGutter(nearest.element.dataset.blockId!, true, false)
    } else if (nearest) {
      const model = store.getModelById(nearest.element.dataset.blockId!)!
      const parent = store.getParent(model)
      const before = drag.y < nearest.rect.top + nearest.rect.height / 2
      if (parent && adapter.canMove(adapter.selected, parent.id, model.id)) {
        target = { parent: parent.id, sibling: model.id, before }
        indicator.hidden = false
        Object.assign(indicator.style, {
          left: `${nearest.rect.left}px`,
          top: `${before ? nearest.rect.top : nearest.rect.bottom}px`,
          width: `${nearest.rect.width}px`
        })
      } else {
        target = undefined
        indicator.hidden = true
      }
    }
    if (drag.mode === 'move') {
      // Empty columns have no nearest child, but remain valid drop targets.
      const columnModel = column && store.getModelById(column.dataset.blockId!)
      if (
        column &&
        columnModel &&
        !columnModel.children.length &&
        adapter.canMove(adapter.selected, columnModel.id)
      ) {
        const box = column.getBoundingClientRect()
        target = { parent: columnModel.id, before: true }
        indicator.hidden = false
        Object.assign(indicator.style, {
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`
        })
      }
      preview.hidden = false
      const p = pose.sample(drag.x, drag.y, performance.now(), reducedMotion())
      lastX = drag.x
      lastY = drag.y
      Object.assign(preview.style, {
        transform: `translate3d(${p.x - (drag.offsetX ?? 0)}px, ${p.y - (drag.offsetY ?? 0)}px, 0) rotate(${p.angle}deg)`
      })
    }
    dragFrame = requestAnimationFrame(frame)
  }

  host.addEventListener(
    'contextmenu',
    event => {
      if (store.readonly || !labels.menu || !(event.target instanceof Element))
        return
      if (event.target.closest('[data-monolith-embed], input, textarea')) return
      // Preserve the native text context menu when a text range is selected.
      if (window.getSelection()?.toString()) return
      const block = event.target.closest<HTMLElement>('[data-block-id]')
      if (!block || !elements().includes(block)) return
      event.preventDefault()
      event.stopPropagation()
      if (!adapter.selected.includes(block.dataset.blockId!))
        adapter.selectFromGutter(block.dataset.blockId!, false, false)
      labels.menu({ x: event.clientX, y: event.clientY })
    },
    { signal }
  )
  host.addEventListener(
    'pointerdown',
    event => {
      if (
        event.button !== 0 ||
        store.readonly ||
        !(event.target instanceof Element)
      )
        return
      const grip = event.target.closest<HTMLElement>('[data-grip-id]')
      const gutter = event.target.closest<HTMLElement>('[data-select-id]')
      if (!grip && !gutter) {
        if (
          !event.target.closest('[data-monolith-embed]') &&
          adapter.selected.length
        )
          adapter.select([])
        return
      }
      const id = grip?.dataset.gripId ?? gutter?.dataset.selectId
      if (!id) return
      event.preventDefault()
      event.stopPropagation()
      if (
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        !adapter.selected.includes(id)
      )
        adapter.selectFromGutter(
          id,
          event.shiftKey,
          event.ctrlKey || event.metaKey
        )
      drag = {
        id,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        menu: !event.shiftKey && !event.ctrlKey && !event.metaKey,
        mode: grip ? 'move' : 'select'
      }
      host.focus({ preventScroll: true })
    },
    { capture: true, signal }
  )
  window.addEventListener(
    'pointermove',
    event => {
      if (!drag) return
      drag.x = event.clientX
      drag.y = event.clientY
      if (
        !drag.active &&
        Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5
      ) {
        drag.active = true
        lastX = drag.x
        lastY = drag.y
        pose.reset(lastX, lastY)
        if (drag.mode === 'move') {
          preview.replaceChildren()
          const snapshots: ReturnType<typeof blockSnapshot>[] = []
          let width = 0
          for (const model of adapter.roots()) {
            const source = elements().find(
              element => element.dataset.blockId === model.id
            )
            if (!source) continue
            const rect = source.getBoundingClientRect()
            if (!snapshots.length) {
              drag.offsetX = drag.startX - rect.left
              drag.offsetY = drag.startY - rect.top
              preview.style.transformOrigin = `${drag.offsetX}px ${drag.offsetY}px`
              indicator.style.setProperty(
                '--selection-color',
                getComputedStyle(source).getPropertyValue('--selection-color')
              )
            }
            const snapshot = blockSnapshot(source)
            snapshots.push(snapshot)
            preview.append(snapshot.element)
            width = Math.max(width, rect.width)
            source.dataset.monolithDragging = 'true'
          }
          preview.style.width = `${width}px`
          preview.hidden = false
          snapshots.forEach(snapshot => snapshot.restoreScroll())
        }
        frame()
      }
    },
    { signal }
  )
  window.addEventListener(
    'pointerup',
    event => {
      if (drag?.active) {
        drag.x = event.clientX
        drag.y = event.clientY
        cancelAnimationFrame(dragFrame)
        frame()
      }
      const position =
        drag && !drag.active && drag.mode === 'move' && drag.menu
          ? { x: drag.x, y: drag.y }
          : undefined
      finish(true)
      if (position && !store.readonly) labels.menu?.(position)
    },
    { signal }
  )
  host.addEventListener(
    'contextmenu',
    event => {
      const grip =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-grip-id]')
          : null
      if (!grip || store.readonly || !labels.menu) return
      event.preventDefault()
      event.stopPropagation()
      adapter.selectFromGutter(grip.dataset.gripId!, false, false)
      labels.menu({ x: event.clientX, y: event.clientY })
    },
    { signal }
  )
  host.addEventListener(
    'click',
    event => {
      const grip =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-grip-id]')
          : null
      if (!grip || event.detail !== 0 || store.readonly || !labels.menu) return
      event.preventDefault()
      adapter.selectFromGutter(grip.dataset.gripId!, false, false)
      const rect = grip.getBoundingClientRect()
      labels.menu({ x: rect.right, y: rect.bottom })
    },
    { signal }
  )
  window.addEventListener('pointercancel', () => finish(), { signal })
  window.addEventListener('blur', () => finish(), { signal })

  host.addEventListener(
    'keydown',
    event => {
      if (
        event.isComposing ||
        (event.target instanceof Element &&
          event.target.closest('[data-monolith-embed]'))
      )
        return
      const mod = event.ctrlKey || event.metaKey
      if (event.key === 'Escape') {
        finish()
        adapter.select([])
        return
      }
      const key = event.key.toLowerCase()
      if (store.readonly) {
        if (
          ['Delete', 'Backspace', 'Enter'].includes(event.key) ||
          (mod && ['z', 'y', 'd', 'x', 'v'].includes(key)) ||
          (mod && event.altKey)
        ) {
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }
      if (!adapter.selected.length) return
      if (mod && (key === 'z' || key === 'y')) {
        event.preventDefault()
        event.stopPropagation()
        if (event.shiftKey || key === 'y') store.redo()
        else store.undo()
      } else if (mod && key === 'd') {
        event.preventDefault()
        event.stopPropagation()
        void adapter.duplicate().catch(labels.error)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        event.stopPropagation()
        adapter.delete()
      } else if (
        mod &&
        event.altKey &&
        ['ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault()
        event.stopPropagation()
        adapter.moveByKeyboard(event.key === 'ArrowUp' ? -1 : 1)
      }
    },
    { capture: true, signal }
  )
  host.addEventListener(
    'copy',
    event => {
      if (
        !adapter.selected.length ||
        (event.target instanceof Element &&
          event.target.closest('[data-monolith-embed]'))
      )
        return
      const blocks = adapter.copy()
      event.clipboardData?.setData(clipboardType, JSON.stringify(blocks))
      event.clipboardData?.setData(
        'text/plain',
        adapter
          .roots()
          .map(model => String((model.props as { text?: unknown }).text ?? ''))
          .join('\n')
      )
      event.preventDefault()
      event.stopPropagation()
    },
    { capture: true, signal }
  )
  host.addEventListener(
    'paste',
    event => {
      if (
        store.readonly ||
        (event.target instanceof Element &&
          event.target.closest('[data-monolith-embed]'))
      )
        return
      const raw = event.clipboardData?.getData(clipboardType)
      const last = adapter.roots().at(-1)
      const parent = last && store.getParent(last)
      if (!raw || !parent || !last || raw.length > 5_000_000) return
      event.preventDefault()
      event.stopPropagation()
      try {
        const blocks: BlockSnapshot[] = JSON.parse(raw)
        if (!Array.isArray(blocks)) return
        void adapter
          .paste(blocks, parent.id, parent.children.indexOf(last) + 1)
          .catch(labels.error)
      } catch (error) {
        labels.error(error)
      }
    },
    { capture: true, signal }
  )

  return () => {
    abort.abort()
    observer.disconnect()
    store.spaceDoc.off('update', syncBackgrounds)
    selection.unsubscribe()
    readonly()
    finish()
    cancelAnimationFrame(updateFrame)
    cancelAnimationFrame(settleFrame)
    indicator.remove()
    preview.remove()
    for (const element of host.querySelectorAll(
      '.monolith-document-grip, .monolith-document-gutter'
    ))
      element.remove()
  }
}
