import type {
  ComponentDefinition,
  Document,
  Element,
  Layout,
  Page,
  Snapshot
} from './shared'

const copy = <T>(value: T): T => structuredClone(value)
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)
const uid = () => crypto.randomUUID()

export const defaultLayout = (): Layout => ({
  direction: 'horizontal',
  gap: 16,
  padding: { top: 16, right: 16, bottom: 16, left: 16 },
  align: 'start',
  justify: 'start',
  wrap: false
})

/** Field-level three-way merge. Deletion wins over edits to an existing object. */
function mergeValue(
  current: unknown,
  base: unknown,
  next: unknown,
  guarded: boolean
): unknown {
  if (equal(base, next)) return copy(current)
  if (base === undefined && Array.isArray(next) && Array.isArray(current))
    base = []

  if (
    Array.isArray(base) &&
    Array.isArray(next) &&
    Array.isArray(current) &&
    [...base, ...next, ...current].every(
      item => item && typeof item.id === 'string'
    )
  ) {
    const b = new Map(base.map(item => [item.id, item])),
      n = new Map(next.map(item => [item.id, item])),
      c = new Map(current.map(item => [item.id, item]))
    const ordered = equal(
      base.map(item => item.id),
      next.map(item => item.id)
    )
      ? current
      : [...next, ...current.filter(item => !n.has(item.id))]

    return ordered
      .flatMap(item => {
        const id = item.id

        if (b.has(id) && !n.has(id))
          return guarded && !equal(c.get(id), b.get(id))
            ? [copy(c.get(id))]
            : []
        if (b.has(id) && !c.has(id)) return []
        if (!b.has(id) && n.has(id))
          return c.has(id) ? [copy(c.get(id))] : [copy(n.get(id))]

        return [
          mergeValue(c.get(id), b.get(id), n.get(id) ?? c.get(id), guarded)
        ]
      })
      .filter(Boolean)
  }

  if (
    base &&
    next &&
    current &&
    typeof base === 'object' &&
    typeof next === 'object' &&
    typeof current === 'object' &&
    !Array.isArray(base) &&
    !Array.isArray(next) &&
    !Array.isArray(current)
  ) {
    const c = current as Record<string, unknown>,
      b = base as Record<string, unknown>,
      n = next as Record<string, unknown>
    const result = copy(c)

    for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
      if (['__proto__', 'constructor'].includes(key)) continue

      if (!equal(b[key], n[key])) {
        const value = mergeValue(c[key], b[key], n[key], guarded)

        if (value === undefined) delete result[key]
        else result[key] = value
      }
    }

    return result
  }

  return guarded && !equal(current, base) ? copy(current) : copy(next)
}

export function mergeSnapshots(
  current: Snapshot,
  base: Snapshot,
  next: Snapshot,
  guarded = false
): Snapshot {
  const merged = mergeValue(current, base, next, guarded) as Snapshot

  if (!merged.document.pages.length)
    merged.document.pages = copy(current.document.pages.slice(0, 1))

  for (const page of merged.document.pages) {
    const byId = new Map(page.elements.map(e => [e.id, e]))
    page.elements = page.elements.filter(e => {
      const seen = new Set([e.id])

      let parent = e.parent

      while (parent) {
        const ancestor = byId.get(parent)

        if (!ancestor || ancestor.kind !== 'frame' || seen.has(parent))
          return false
        seen.add(parent)
        parent = ancestor.parent
      }

      return true
    })
    const retained = new Set(page.elements.map(e => e.id))
    page.connectors = page.connectors.filter(
      e => retained.has(e.source) && retained.has(e.target)
    )
    for (const e of page.elements)
      if (
        e.component &&
        !merged.document.components?.some(
          c =>
            c.id === e.component!.definition &&
            c.elements.some(part => part.id === e.component!.key)
        )
      )
        delete e.component
  }

  return { ...merged, document: layoutDocument(merged.document) }
}

export function descendants(page: Pick<Page, 'elements'>, ids: string[]) {
  const result = new Set(ids)

  let changed = true

  while (changed) {
    changed = false

    for (const e of page.elements)
      if (e.parent && result.has(e.parent) && !result.has(e.id)) {
        result.add(e.id)
        changed = true
      }
  }

  return result
}

export function layoutPage(source: Page): Page {
  const page = copy(source)
  const children = (id: string) =>
    page.elements.filter(e => e.parent === id && !e.hidden)
  const translate = (element: Element, x: number, y: number) => {
    const dx = x - element.x,
      dy = y - element.y
    const moving = descendants(page, [element.id])

    for (const child of page.elements)
      if (moving.has(child.id)) {
        child.x += dx
        child.y += dy
      }
  }
  const arrange = (frame: Element, depth: number) => {
    if (depth > 32) return

    const items = children(frame.id)

    for (const child of items)
      if (child.kind === 'frame') arrange(child, depth + 1)

    const l = frame.layout

    if (!l || !items.length) return

    const horizontal = l.direction === 'horizontal',
      main = horizontal ? 'width' : 'height',
      cross = horizontal ? 'height' : 'width'
    const before = horizontal ? l.padding.left : l.padding.top,
      after = horizontal ? l.padding.right : l.padding.bottom
    const crossBefore = horizontal ? l.padding.top : l.padding.left,
      crossAfter = horizontal ? l.padding.bottom : l.padding.right
    const mode = horizontal ? 'widthMode' : 'heightMode',
      crossMode = horizontal ? 'heightMode' : 'widthMode'

    if (frame[mode] === 'hug')
      frame[main] = Math.min(
        20000,
        Math.max(
          1,
          items.reduce((sum, e) => sum + e[main], 0) +
            l.gap * (items.length - 1) +
            before +
            after
        )
      )

    const available = Math.max(1, frame[main] - before - after),
      lines: Element[][] = [[]]

    for (const item of items) {
      let line = lines[lines.length - 1]!

      if (
        l.wrap &&
        frame[mode] !== 'hug' &&
        line.length &&
        line.reduce((sum, e) => sum + e[main] + l.gap, 0) + item[main] >
          available
      ) {
        line = []
        lines.push(line)
      }
      line.push(item)
    }

    const crossSizes = lines.map(line => Math.max(...line.map(e => e[cross])))

    if (frame[crossMode] === 'hug')
      frame[cross] = Math.min(
        20000,
        Math.max(
          1,
          crossSizes.reduce((a, b) => a + b, 0) +
            l.gap * (lines.length - 1) +
            crossBefore +
            crossAfter
        )
      )
    let crossPosition = crossBefore

    for (const [index, line] of lines.entries()) {
      const fills = line.filter(e => e[mode] === 'fill'),
        fixed = line
          .filter(e => e[mode] !== 'fill')
          .reduce((sum, e) => sum + e[main], 0)
      const share = Math.max(
        1,
        (available - fixed - l.gap * (line.length - 1)) /
          Math.max(1, fills.length)
      )

      for (const item of fills) item[main] = share

      const used =
          line.reduce((sum, e) => sum + e[main], 0) + l.gap * (line.length - 1),
        free = Math.max(0, available - used)
      const gap =
        l.justify === 'space-between' && line.length > 1
          ? l.gap + free / (line.length - 1)
          : l.gap

      let position =
        before +
        (l.justify === 'center' ? free / 2 : l.justify === 'end' ? free : 0)

      const crossSize =
        lines.length === 1
          ? Math.max(1, frame[cross] - crossBefore - crossAfter)
          : crossSizes[index]!

      for (const item of line) {
        if (l.align === 'stretch' || item[crossMode] === 'fill')
          item[cross] = crossSize

        const offset =
          l.align === 'center'
            ? (crossSize - item[cross]) / 2
            : l.align === 'end'
              ? crossSize - item[cross]
              : 0
        translate(
          item,
          frame.x + (horizontal ? position : crossPosition + offset),
          frame.y + (horizontal ? crossPosition + offset : position)
        )
        if (item.kind === 'frame') arrange(item, depth + 1)
        position += item[main] + gap
      }
      crossPosition += crossSizes[index]! + l.gap
    }
  }

  for (const e of page.elements)
    if (e.kind === 'frame' && !e.parent) arrange(e, 0)

  return page
}

export function layoutDocument(document: Document): Document {
  return { ...document, pages: document.pages.map(layoutPage) }
}

export function componentFromSelection(
  page: Page,
  selected: string[],
  name: string
): ComponentDefinition | null {
  const ids = descendants(page, selected),
    elements = copy(page.elements.filter(e => ids.has(e.id)))

  if (!elements.length || elements.length > 500) return null

  const x = Math.min(...elements.map(e => e.x)),
    y = Math.min(...elements.map(e => e.y)),
    map = new Map(elements.map(e => [e.id, uid()]))

  for (const e of elements) {
    e.id = map.get(e.id)!
    e.parent = map.get(e.parent ?? '') ?? null
    e.x -= x
    e.y -= y
    e.group = null
    delete e.component
  }

  return {
    id: uid(),
    name,
    elements,
    connectors: page.connectors
      .filter(c => ids.has(c.source) && ids.has(c.target))
      .map(c => ({
        ...c,
        id: uid(),
        source: map.get(c.source)!,
        target: map.get(c.target)!
      }))
  }
}

export function instantiate(
  definition: ComponentDefinition,
  x: number,
  y: number
) {
  const instance = uid(),
    map = new Map(definition.elements.map(e => [e.id, uid()]))

  return {
    elements: definition.elements.map(e => ({
      ...copy(e),
      id: map.get(e.id)!,
      parent: map.get(e.parent ?? '') ?? null,
      x: e.x + x,
      y: e.y + y,
      group: instance,
      component: {
        definition: definition.id,
        instance,
        key: e.id,
        overrides: []
      }
    })),
    connectors: definition.connectors.map(c => ({
      ...c,
      id: uid(),
      source: map.get(c.source)!,
      target: map.get(c.target)!
    }))
  }
}

export function applyDefinition(
  document: Document,
  definition: ComponentDefinition,
  resetInstance?: string
): Document {
  const pages = document.pages.map(page => {
    let elements = copy(page.elements)
    let connectors = copy(page.connectors)

    const instances = new Set(
      elements
        .filter(e => e.component?.definition === definition.id)
        .map(e => e.component!.instance)
    )

    for (const instance of instances) {
      const parts = elements.filter(e => e.component?.instance === instance)
      const oldDefinition = document.components?.find(
        c => c.id === definition.id
      )
      const anchor =
        parts.find(e => !e.parent || !parts.some(p => p.id === e.parent)) ??
        parts[0]!
      const oldAnchor = oldDefinition?.elements.find(
        e => e.id === anchor.component!.key
      )
      const x = anchor.x - (oldAnchor?.x ?? 0),
        y = anchor.y - (oldAnchor?.y ?? 0)
      const map = new Map(
        definition.elements.map(e => [
          e.id,
          parts.find(p => p.component?.key === e.id)?.id ?? uid()
        ])
      )
      const replacements = definition.elements.map(template => {
        const old = parts.find(p => p.component?.key === template.id)
        const overrides =
          instance === resetInstance ? [] : (old?.component?.overrides ?? [])
        const result: Element = {
          ...copy(template),
          id: map.get(template.id)!,
          x: x + template.x,
          y: y + template.y,
          parent:
            map.get(template.parent ?? '') ??
            (old?.parent && !parts.some(p => p.id === old.parent)
              ? old.parent
              : null),
          group: instance,
          component: {
            definition: definition.id,
            instance,
            key: template.id,
            overrides
          }
        }

        for (const key of overrides)
          if (old && !['id', 'parent', 'group', 'component'].includes(key))
            (result as unknown as Record<string, unknown>)[key] = copy(
              (old as unknown as Record<string, unknown>)[key]
            )

        return result
      })
      const first = elements.findIndex(e => e.component?.instance === instance)
      const partIds = new Set(parts.map(e => e.id))
      const internal = connectors.filter(
        c => partIds.has(c.source) && partIds.has(c.target)
      )
      connectors = connectors.filter(
        c => !partIds.has(c.source) || !partIds.has(c.target)
      )
      connectors.push(
        ...definition.connectors.map(c => {
          const source = map.get(c.source)!,
            target = map.get(c.target)!
          const previous = internal.find(
            edge => edge.source === source && edge.target === target
          )

          return { ...copy(c), id: previous?.id ?? uid(), source, target }
        })
      )
      elements = elements.filter(e => e.component?.instance !== instance)
      elements.splice(first, 0, ...replacements)
    }

    const ids = new Set(elements.map(e => e.id))

    return {
      ...page,
      elements,
      connectors: connectors.filter(c => ids.has(c.source) && ids.has(c.target))
    }
  })

  return layoutDocument({
    ...document,
    components: [
      ...(document.components ?? []).filter(c => c.id !== definition.id),
      definition
    ],
    pages
  })
}
