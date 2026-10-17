import { animateLayout, kineticPose, reducedMotion } from './elasticMotion'

/** A painted DOM snapshot: custom elements must not remount another editor. */
export function blockSnapshot(source: HTMLElement) {
  const scrolls: Array<[Element, number, number]> = []
  function copy(node: Node): Node {
    if (!(node instanceof Element)) return node.cloneNode(false)
    const tag = node.localName
    const target =
      node.namespaceURI === 'http://www.w3.org/2000/svg'
        ? document.createElementNS(node.namespaceURI, tag)
        : document.createElement(tag.includes('-') ? 'div' : tag)
    for (const { name, value } of node.attributes) {
      if (
        !/^(id|data-|on|contenteditable|tabindex|autofocus|draggable|aria-)/.test(
          name
        )
      )
        target.setAttribute(name, value)
    }
    const style = getComputedStyle(node)
    target.setAttribute(
      'style',
      Array.from(style)
        .map(key => `${key}:${style.getPropertyValue(key)};`)
        .join('')
    )
    if (target instanceof HTMLElement) {
      target.style.animation = 'none'
      target.style.transition = 'none'
      target.style.caretColor = 'transparent'
      target.style.pointerEvents = 'none'
    }
    if (
      node instanceof HTMLInputElement &&
      target instanceof HTMLInputElement
    ) {
      target.value = node.value
      target.checked = node.checked
    }
    if (
      node instanceof HTMLTextAreaElement &&
      target instanceof HTMLTextAreaElement
    )
      target.value = node.value
    if (
      node instanceof HTMLCanvasElement &&
      target instanceof HTMLCanvasElement
    ) {
      target.width = node.width
      target.height = node.height
      target.getContext('2d')?.drawImage(node, 0, 0)
    }
    for (const child of (node.shadowRoot ?? node).childNodes) {
      if (
        child instanceof Element &&
        child.matches(
          'script, style, .canvas-block-tools, .monolith-document-grip, .monolith-document-gutter, .monolith-block-grips'
        )
      )
        continue
      target.append(copy(child))
    }
    if (node.scrollTop || node.scrollLeft)
      scrolls.push([target, node.scrollLeft, node.scrollTop])
    return target
  }
  const result = copy(source) as HTMLElement
  const rect = source.getBoundingClientRect()
  Object.assign(result.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    minWidth: '0',
    maxWidth: 'none',
    margin: '0',
    position: 'relative',
    left: 'auto',
    top: 'auto',
    transform: 'none',
    opacity: '1',
    flexShrink: '0',
    boxSizing: 'border-box'
  })
  result.inert = true
  result.setAttribute('aria-hidden', 'true')
  return {
    element: result,
    restoreScroll: () =>
      scrolls.forEach(([node, x, y]) => {
        node.scrollLeft = x
        node.scrollTop = y
      })
  }
}

type Target = { id: string; element: HTMLElement }

/** Pointer-driven block lift; layout stays intact and only the final drop commits. */
export function startBlockDrag(
  event: PointerEvent,
  source: HTMLElement,
  options: {
    targets: () => Target[]
    commit: (id: string, before: boolean) => void
    click?: () => void
  }
) {
  if (event.button !== 0) return () => {}
  event.preventDefault()
  event.stopPropagation()
  const abort = new AbortController(),
    { signal } = abort
  const original = source.getBoundingClientRect()
  const offsetX = event.clientX - original.left,
    offsetY = event.clientY - original.top
  const pose = kineticPose()
  let x = event.clientX,
    y = event.clientY,
    active = false,
    frame = 0
  let ghost: HTMLElement | undefined, indicator: HTMLElement | undefined
  let target: (Target & { before: boolean }) | undefined
  const cleanup = () => {
    abort.abort()
    cancelAnimationFrame(frame)
    ghost?.remove()
    indicator?.remove()
    delete source.dataset.dragging
  }
  const draw = () => {
    if (!source.isConnected) return cleanup()
    let scroller = source.parentElement
    while (
      scroller &&
      !(
        scroller.scrollHeight > scroller.clientHeight &&
        /(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
      )
    )
      scroller = scroller.parentElement
    if (scroller) {
      const box = scroller.getBoundingClientRect()
      scroller.scrollTop +=
        y < box.top + 48
          ? -Math.min(16, (box.top + 48 - y) / 3)
          : y > box.bottom - 48
            ? Math.min(16, (y - box.bottom + 48) / 3)
            : 0
    }
    let distance = Infinity
    target = undefined
    for (const candidate of options.targets()) {
      if (candidate.element === source || source.contains(candidate.element))
        continue
      const rect = candidate.element.getBoundingClientRect()
      const before = y < rect.top + rect.height / 2
      const d =
        Math.abs(y - (before ? rect.top : rect.bottom)) +
        Math.max(rect.left - x, 0, x - rect.right) * 2
      if (d < distance) {
        distance = d
        target = { ...candidate, before }
      }
    }
    if (indicator) {
      indicator.hidden = !target
      if (target) {
        const box = target.element.getBoundingClientRect()
        Object.assign(indicator.style, {
          left: `${box.left}px`,
          top: `${(target.before ? box.top : box.bottom) - 1}px`,
          width: `${box.width}px`
        })
      }
    }
    const p = pose.sample(x, y, performance.now(), reducedMotion())
    if (ghost)
      ghost.style.transform = `translate3d(${p.x - offsetX}px, ${p.y - offsetY}px, 0) rotate(${p.angle}deg)`
    frame = requestAnimationFrame(draw)
  }
  window.addEventListener(
    'pointermove',
    next => {
      if (next.pointerId !== event.pointerId) return
      x = next.clientX
      y = next.clientY
      if (!active && Math.hypot(x - event.clientX, y - event.clientY) > 5) {
        active = true
        const snapshot = blockSnapshot(source)
        ghost = document.createElement('div')
        ghost.className = 'monolith-block-drag-preview'
        ghost.style.width = `${original.width}px`
        ghost.style.transformOrigin = `${offsetX}px ${offsetY}px`
        ghost.append(snapshot.element)
        indicator = document.createElement('div')
        indicator.className = 'monolith-block-drop'
        const accent =
          getComputedStyle(source).getPropertyValue('--selection-color')
        indicator.style.setProperty('--selection-color', accent)
        document.body.append(ghost, indicator)
        snapshot.restoreScroll()
        source.dataset.dragging = 'true'
        pose.reset(x, y)
        draw()
      }
    },
    { signal }
  )
  window.addEventListener(
    'pointerup',
    next => {
      if (next.pointerId !== event.pointerId) return
      if (active) {
        x = next.clientX
        y = next.clientY
        cancelAnimationFrame(frame)
        draw()
      }
      const destination = target
      const positions = new Map(
        options
          .targets()
          .map(({ element }) => [element, element.getBoundingClientRect()])
      )
      cleanup()
      if (active && destination) {
        options.commit(destination.id, destination.before)
        requestAnimationFrame(() => animateLayout(positions))
      } else if (!active) options.click?.()
    },
    { signal }
  )
  window.addEventListener('pointercancel', cleanup, { signal })
  window.addEventListener('blur', cleanup, { signal })
  window.addEventListener(
    'keydown',
    next => {
      if (next.key === 'Escape') {
        next.preventDefault()
        cleanup()
      }
    },
    { signal, capture: true }
  )
  return cleanup
}
