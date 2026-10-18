import { descendants } from '../../design'
import {
  type Connector,
  type Document,
  type Element,
  type Mode,
  type Page,
  documentSchema
} from '../../shared'

export type Point = { x: number; y: number }

export type Viewport = Point & { zoom: number }

export type Tool =
  'select' | 'hand' | 'connect' | 'pen' | 'comment' | Element['kind']

export const uid = () => crypto.randomUUID()

export const clone = <T>(value: T): T => structuredClone(value)

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const palette = [
  '#c4b5fd',
  '#93c5fd',
  '#86efac',
  '#fde68a',
  '#fda4af',
  '#ffffff',
  '#1e293b'
]

export function makeElement(
  kind: Element['kind'],
  position: Point,
  name: string
): Element {
  return {
    id: uid(),
    kind,
    name,
    ...position,
    width: kind === 'frame' ? 800 : kind === 'text' ? 280 : 200,
    height:
      kind === 'frame'
        ? 600
        : kind === 'text'
          ? 64
          : kind === 'node'
            ? 88
            : 160,
    rotation: 0,
    fill:
      kind === 'sticky' ? '#fde68a' : kind === 'frame' ? '#ffffff' : '#c4b5fd',
    stroke: '#475569',
    strokeWidth: kind === 'frame' || kind === 'text' ? 0 : 1,
    opacity: 1,
    radius: kind === 'sticky' ? 2 : 12,
    text: ['sticky', 'node', 'text'].includes(kind) ? name : '',
    fontSize: kind === 'text' ? 28 : 18,
    fontWeight: '400',
    textColor: '#1e293b',
    align: 'center',
    locked: false,
    hidden: false,
    group: null,
    points: [],
    image: ''
  }
}

export function makePage(mode: Mode, name: string): Page {
  return {
    id: uid(),
    name,
    mode,
    background: '#f4f4f5',
    elements: [],
    connectors: []
  }
}

export function makeDocument(mode: Mode, name: string): Document {
  return { version: 1, pages: [makePage(mode, name)] }
}

export function pageBounds(elements: Element[]) {
  if (!elements.length) return { x: 0, y: 0, width: 1000, height: 700 }

  const boxes = elements.map(elementBounds)
  const x = Math.min(...boxes.map(e => e.x)),
    y = Math.min(...boxes.map(e => e.y))

  return {
    x,
    y,
    width: Math.max(...boxes.map(e => e.x + e.width)) - x,
    height: Math.max(...boxes.map(e => e.y + e.height)) - y
  }
}

export function elementBounds(e: Element) {
  const angle = (e.rotation * Math.PI) / 180
  const width =
    Math.abs(e.width * Math.cos(angle)) + Math.abs(e.height * Math.sin(angle))
  const height =
    Math.abs(e.width * Math.sin(angle)) + Math.abs(e.height * Math.cos(angle))

  return {
    x: e.x + (e.width - width) / 2,
    y: e.y + (e.height - height) / 2,
    width,
    height
  }
}

export function toWorld(point: Point, view: Viewport): Point {
  return {
    x: (point.x - view.x) / view.zoom,
    y: (point.y - view.y) / view.zoom
  }
}

export function zoomAt(view: Viewport, point: Point, zoom: number): Viewport {
  const world = toWorld(point, view),
    next = clamp(zoom, 0.1, 4)

  return {
    x: point.x - world.x * next,
    y: point.y - world.y * next,
    zoom: next
  }
}

export function fitView(
  elements: Element[],
  width: number,
  height: number
): Viewport {
  const bounds = pageBounds(elements.filter(e => !e.hidden))
  const zoom = clamp(
    Math.min(
      (width - 120) / Math.max(1, bounds.width),
      (height - 120) / Math.max(1, bounds.height)
    ),
    0.1,
    1.5
  )

  return {
    x: (width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (height - bounds.height * zoom) / 2 - bounds.y * zoom,
    zoom
  }
}

export function selectionIds(page: Page, id: string): string[] {
  const element = page.elements.find(e => e.id === id)

  return element?.group
    ? page.elements
        .filter(e => e.group === element.group && !e.locked && !e.hidden)
        .map(e => e.id)
    : [id]
}

export function removeElements(page: Page, selected: string[]): Page {
  const ids = descendants(
    page,
    page.elements
      .filter(e => selected.includes(e.id) && !e.locked)
      .map(e => e.id)
  )

  return {
    ...page,
    elements: page.elements.filter(e => !ids.has(e.id)),
    connectors: page.connectors.filter(
      e => !ids.has(e.source) && !ids.has(e.target) && !selected.includes(e.id)
    )
  }
}

export function duplicateElements(page: Page, selected: string[]) {
  const map = new Map<string, string>(),
    groups = new Map<string, string>()
  const selectedIds = descendants(page, selected)
  const elements = page.elements
    .filter(e => selectedIds.has(e.id) && !e.locked)
    .map(e => {
      const id = uid()
      map.set(e.id, id)
      if (e.group && !groups.has(e.group)) groups.set(e.group, uid())

      return {
        ...clone(e),
        id,
        x: e.x + 32,
        y: e.y + 32,
        group: e.group ? groups.get(e.group)! : null
      }
    })

  for (const element of elements) {
    element.parent = map.get(element.parent ?? '') ?? element.parent ?? null
    if (element.prototype?.target)
      element.prototype.target =
        map.get(element.prototype.target) ?? element.prototype.target

    if (element.component) {
      const instance = element.component.instance

      if (!groups.has(instance)) groups.set(instance, uid())
      element.component.instance = groups.get(instance)!
    }
  }

  const connectors = page.connectors
    .filter(e => map.has(e.source) && map.has(e.target))
    .map(e => ({
      ...e,
      id: uid(),
      source: map.get(e.source)!,
      target: map.get(e.target)!
    }))

  return {
    page: {
      ...page,
      elements: [...page.elements, ...elements],
      connectors: [...page.connectors, ...connectors]
    },
    selected: elements.map(e => e.id)
  }
}

export function addConnection(
  page: Page,
  source: string,
  target: string
): Page {
  if (
    source === target ||
    ![source, target].every(id => page.elements.some(e => e.id === id)) ||
    page.connectors.some(e => e.source === source && e.target === target)
  )
    return page

  return {
    ...page,
    connectors: [
      ...page.connectors,
      {
        id: uid(),
        source,
        target,
        label: '',
        color: '#64748b',
        style: 'curve',
        arrow: true
      }
    ]
  }
}

export function edgeGeometry(edge: Connector, elements: Element[]) {
  const source = elements.find(e => e.id === edge.source),
    target = elements.find(e => e.id === edge.target)

  if (!source || !target || source.hidden || target.hidden) return null

  const a = { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    b = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const anchor = (e: Element, from: Point, to: Point): Point => {
    const dx = to.x - from.x,
      dy = to.y - from.y
    const scale = Math.min(
      e.width / 2 / Math.max(Math.abs(dx), 0.001),
      e.height / 2 / Math.max(Math.abs(dy), 0.001)
    )

    return { x: from.x + dx * scale, y: from.y + dy * scale }
  }
  const start = anchor(source, a, b),
    end = anchor(target, b, a)
  const mid = (start.x + end.x) / 2

  return {
    path:
      edge.style === 'straight'
        ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
        : `M ${start.x} ${start.y} C ${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`,
    x: mid,
    y: (start.y + end.y) / 2
  }
}

export function autoLayout(page: Page): Page {
  const movable = page.elements.filter(
    e => !e.locked && !e.hidden && e.kind !== 'frame'
  )
  const ids = new Set(movable.map(e => e.id)),
    children = new Map<string, string[]>(),
    incoming = new Set<string>()

  for (const edge of page.connectors)
    if (ids.has(edge.source) && ids.has(edge.target)) {
      children.set(edge.source, [
        ...(children.get(edge.source) ?? []),
        edge.target
      ])
      incoming.add(edge.target)
    }

  const roots = movable.filter(e => !incoming.has(e.id)).map(e => e.id)
  const visited = new Set<string>(),
    levels = new Map<number, string[]>()

  for (const root of [...roots, ...ids]) {
    if (visited.has(root)) continue

    const queue: [string, number][] = [[root, 0]]

    for (let index = 0; index < queue.length; index++) {
      const [id, level] = queue[index]!

      if (visited.has(id)) continue
      visited.add(id)
      levels.set(level, [...(levels.get(level) ?? []), id])
      for (const child of children.get(id) ?? [])
        if (!visited.has(child)) queue.push([child, level + 1])
    }
  }

  const positions = new Map<string, Point>()

  let x = 100

  for (const [, group] of [...levels].sort(([a], [b]) => a - b)) {
    let y = 100

    for (const id of group) {
      positions.set(id, { x, y })
      y += movable.find(e => e.id === id)!.height + 64
    }
    x +=
      Math.max(...group.map(id => movable.find(e => e.id === id)!.width)) + 140
  }

  return {
    ...page,
    elements: page.elements.map(e => ({ ...e, ...positions.get(e.id) }))
  }
}

export function importDocument(value: unknown): Document {
  return documentSchema.parse(value)
}

export function duplicateDocument(document: Document): Document {
  const result = clone(document)
  const ids = new Map<string, string>()
  const remap = (id: string) => {
    if (!ids.has(id)) ids.set(id, uid())

    return ids.get(id)!
  }

  for (const page of [...result.pages, ...(result.components ?? [])]) {
    page.id = remap(page.id)
    page.elements = page.elements.map(e => {
      return {
        ...e,
        id: remap(e.id),
        parent: e.parent ? remap(e.parent) : null,
        group: e.group ? remap(e.group) : null,
        ...(e.prototype
          ? {
              prototype: {
                ...e.prototype,
                target: e.prototype.target ? remap(e.prototype.target) : null
              }
            }
          : {}),
        ...(e.component
          ? {
              component: {
                ...e.component,
                definition: remap(e.component.definition),
                instance: remap(e.component.instance),
                key: remap(e.component.key)
              }
            }
          : {})
      }
    })
    page.connectors = page.connectors.map(e => ({
      ...e,
      id: remap(e.id),
      source: remap(e.source),
      target: remap(e.target)
    }))
  }

  if (result.prototypeStart)
    result.prototypeStart = remap(result.prototypeStart)

  return result
}
