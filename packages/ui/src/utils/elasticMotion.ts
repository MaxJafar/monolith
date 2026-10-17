import { clamp, kineticPose, spring, stepSpring } from './spring'

export { kineticPose } from './spring'

const active = new WeakMap<HTMLElement, Animation>()
const edges = new WeakMap<HTMLElement, { impulse: (amount: number) => void }>()

let endDragPreview: (() => void) | undefined
let motionPreference: MediaQueryList | undefined

/** Preserve native drop semantics without changing the source's layout. */
export function elasticDragPreview(
  event: DragEvent,
  title: string,
  source?: HTMLElement
) {
  if (!event.dataTransfer || reducedMotion()) return
  endDragPreview?.()
  const abort = new AbortController()
  const ghost = document.createElement('div')
  ghost.className = 'monolith-native-drag-preview'
  ghost.textContent = title

  if (source) {
    const card = source.cloneNode(true) as HTMLElement
    card.removeAttribute('id')
    card.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    card
      .querySelectorAll(
        '.monolith-nav-more,.monolith-nav-control,.monolith-nav-disclosure,.canvas-block-tools'
      )
      .forEach(node => node.remove())
    card.inert = true
    ghost.replaceChildren(card)
    ghost.style.width = `${source.getBoundingClientRect().width}px`
    ghost.style.padding = '0'
    ghost.style.maxHeight = 'none'
    card.style.width = '100%'
  }
  if (source)
    ghost.style.setProperty(
      '--accent-primary',
      getComputedStyle(source).getPropertyValue('--accent-primary')
    )
  ghost.setAttribute('aria-hidden', 'true')
  const empty = document.createElement('canvas')
  empty.width = empty.height = 1
  empty.style.cssText =
    'position:fixed;left:0;top:0;pointer-events:none;opacity:0.01'
  document.body.append(empty, ghost)
  event.dataTransfer.setDragImage(empty, 0, 0)
  let x = event.clientX,
    y = event.clientY,
    frame = 0

  const pose = kineticPose()
  const rect = source?.getBoundingClientRect()
  const offsetX = rect ? event.clientX - rect.left : -16
  const offsetY = rect ? event.clientY - rect.top : -12
  ghost.style.transformOrigin = `${offsetX}px ${offsetY}px`
  const draw = () => {
    const p = pose.sample(x, y, performance.now(), reducedMotion())
    ghost.style.transform = `translate3d(${p.x - offsetX}px, ${p.y - offsetY}px, 0) rotate(${p.angle}deg)`
    frame = requestAnimationFrame(draw)
  }
  const stop = () => {
    abort.abort()
    cancelAnimationFrame(frame)
    ghost.remove()
    empty.remove()
    endDragPreview = undefined
  }
  endDragPreview = stop
  document.addEventListener(
    'dragover',
    event => {
      x = event.clientX
      y = event.clientY
    },
    { signal: abort.signal, capture: true }
  )
  document.addEventListener('drop', stop, {
    signal: abort.signal,
    capture: true
  })
  document.addEventListener('dragend', stop, {
    signal: abort.signal,
    capture: true
  })
  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') stop()
    },
    { signal: abort.signal, capture: true }
  )
  window.addEventListener('blur', stop, { signal: abort.signal })
  draw()
  return stop
}

export function reducedMotion() {
  if (typeof matchMedia !== 'function') return false
  motionPreference ??= matchMedia('(prefers-reduced-motion: reduce)')
  return motionPreference.matches
}

/** A short, bounded settle. Never leave a transform on editable content. */
export function settleElement(element: HTMLElement | null, strength = 1) {
  if (!element || reducedMotion() || typeof element.animate !== 'function')
    return
  active.get(element)?.cancel()
  const amount = Math.min(1.5, Math.max(0, strength))
  const recoil = spring(1)
  const frames: Keyframe[] = []

  for (let i = 0; i < 40; i++) {
    const value = stepSpring(recoil, 0, 1 / 60, 360, 19) * amount
    frames.push({
      transform: `scale(${1 + 0.024 * value}, ${1 - 0.026 * value}) rotate(${-0.65 * value}deg)`
    })
  }
  frames.push({ transform: 'none' })
  const animation = element.animate(frames, { duration: 520, easing: 'linear' })
  active.set(element, animation)
  animation.onfinish = () => active.delete(element)
}

/** Keep native wheel momentum and scroll chaining; decorate only the boundary. */
export function elasticScrollEdge(viewport: HTMLElement, event: WheelEvent) {
  if (
    reducedMotion() ||
    event.ctrlKey ||
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
  )
    return
  const height = viewport.clientHeight
  const scrollHeight = viewport.scrollHeight
  if (scrollHeight <= height + 1) return
  const atStart = viewport.scrollTop <= 1 && event.deltaY < 0
  const atEnd =
    viewport.scrollTop + height >= scrollHeight - 1 && event.deltaY > 0
  if (!atStart && !atEnd) return

  let target = event.target instanceof Element ? event.target : null

  while (target && target !== viewport) {
    if (
      target.scrollHeight > target.clientHeight + 1 &&
      /(auto|scroll)/.test(getComputedStyle(target).overflowY)
    )
      return
    target = target.parentElement
  }
  const content = viewport.firstElementChild as HTMLElement | null

  if (!content) return

  const delta =
    event.deltaY *
    (event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? viewport.clientHeight
        : 1)
  const impulse = clamp(-delta * 2.5, -110, 110)
  const current = edges.get(viewport)

  if (current) {
    current.impulse(impulse)

    return
  }

  const value = spring()
  value.velocity = impulse
  let last = performance.now()

  const previous = content.style.translate
  const controller = {
    impulse: (amount: number) => {
      value.velocity = clamp(value.velocity + amount, -240, 240)
    }
  }
  edges.set(viewport, controller)
  const draw = (now: number) => {
    const y = clamp(stepSpring(value, 0, (now - last) / 1000, 220, 19), -18, 18)
    last = now
    value.position = y

    if (
      !content.isConnected ||
      reducedMotion() ||
      (Math.abs(y) < 0.02 && Math.abs(value.velocity) < 0.2)
    ) {
      content.style.translate = previous
      edges.delete(viewport)

      return
    }
    content.style.translate = `0 ${y}px`
    requestAnimationFrame(draw)
  }
  requestAnimationFrame(draw)
}

/** FLIP visual positions after a reorder; layout and hit-testing remain native. */
export function animateLayout(before: Map<HTMLElement, DOMRect>) {
  if (reducedMotion()) return

  for (const [element, rect] of before) {
    if (!element.isConnected || typeof element.animate !== 'function') continue

    const next = element.getBoundingClientRect()
    const dx = rect.left - next.left,
      dy = rect.top - next.top

    if (Math.abs(dx) + Math.abs(dy) < 1) continue
    element.animate(
      [
        { translate: `${dx}px ${dy}px` },
        { translate: `${-dx * 0.035}px ${-dy * 0.035}px`, offset: 0.72 },
        { translate: '0 0' }
      ],
      { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }
    )
  }
}
