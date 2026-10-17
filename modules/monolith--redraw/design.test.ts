import { describe, expect, it } from 'vitest'

import {
  clone,
  duplicateDocument,
  duplicateElements,
  makeDocument,
  makeElement,
  removeElements
} from './client/src/model'
import {
  applyDefinition,
  componentFromSelection,
  defaultLayout,
  instantiate,
  layoutPage,
  mergeSnapshots
} from './design'
import { type Snapshot, documentSchema } from './shared'

const fixture = (): Snapshot => {
  const document = makeDocument('canvas', 'Canvas')
  document.pages[0]!.elements.push(
    makeElement('rectangle', { x: 10, y: 20 }, 'A'),
    makeElement('text', { x: 300, y: 20 }, 'B')
  )

  return { title: 'Project', document }
}
describe('Shared editing', () => {
  it('merges independent properties, insertions and local unsent edits', () => {
    const base = fixture(),
      a = clone(base),
      b = clone(base)
    a.document.pages[0]!.elements[0]!.x = 100
    b.document.pages[0]!.elements[0]!.fill = '#ff0000'
    b.document.pages[0]!.elements.push(
      makeElement('ellipse', { x: 0, y: 0 }, 'New')
    )
    const merged = mergeSnapshots(a, base, b)
    expect(merged.document.pages[0]!.elements[0]).toMatchObject({
      x: 100,
      fill: '#ff0000'
    })
    expect(merged.document.pages[0]!.elements).toHaveLength(3)
    expect(documentSchema.safeParse(merged.document).success).toBe(true)
  })
  it('preserves a remote edit when undoing a local operation', () => {
    const before = fixture(),
      after = clone(before)
    after.document.pages[0]!.elements[0]!.x = 70
    const remote = clone(after)
    remote.document.pages[0]!.elements[1]!.text = 'Their edit'
    const undone = mergeSnapshots(remote, after, before, true)
    expect(undone.document.pages[0]!.elements[0]!.x).toBe(10)
    expect(undone.document.pages[0]!.elements[1]!.text).toBe('Their edit')
    remote.document.pages[0]!.elements[0]!.x = 99
    expect(
      mergeSnapshots(remote, after, before, true).document.pages[0]!
        .elements[0]!.x
    ).toBe(99)
  })
  it('does not resurrect objects deleted by another editor', () => {
    const base = fixture(),
      local = clone(base),
      remote = clone(base)
    local.document.pages[0]!.elements[0]!.text = 'Draft'
    remote.document.pages[0]!.elements.shift()
    expect(
      mergeSnapshots(remote, base, local).document.pages[0]!.elements
    ).toHaveLength(1)
  })
  it('combines concurrent creation of component libraries on older documents', () => {
    const base = fixture(),
      a = clone(base),
      b = clone(base),
      page = base.document.pages[0]!
    a.document.components = [
      componentFromSelection(page, [page.elements[0]!.id], 'A')!
    ]
    b.document.components = [
      componentFromSelection(page, [page.elements[1]!.id], 'B')!
    ]
    expect(mergeSnapshots(a, base, b).document.components).toHaveLength(2)
  })
  it('removes transitive orphans after concurrent deletion of an ancestor', () => {
    const base = fixture(),
      page = base.document.pages[0]!
    const outer = makeElement('frame', { x: 0, y: 0 }, 'Outer')
    const inner = makeElement('frame', { x: 0, y: 0 }, 'Inner')
    inner.parent = outer.id
    page.elements[0]!.parent = inner.id
    page.elements.push(inner, outer)
    const remote = clone(base),
      local = clone(base)
    remote.document.pages[0]!.elements =
      remote.document.pages[0]!.elements.filter(e => e.id !== outer.id)
    local.document.pages[0]!.elements[0]!.text = 'Concurrent edit'
    const result = mergeSnapshots(remote, base, local)
    expect(result.document.pages[0]!.elements.map(e => e.name)).toEqual(['B'])
    expect(documentSchema.safeParse(result.document).success).toBe(true)
  })
})

describe('Nested auto-layout', () => {
  it('arranges with padding, spacing, hug dimensions and responds to content changes', () => {
    const page = fixture().document.pages[0]!,
      frame = makeElement('frame', { x: 20, y: 40 }, 'Frame')
    frame.layout = defaultLayout()
    frame.widthMode = 'hug'
    frame.heightMode = 'hug'
    page.elements.forEach(e => {
      e.parent = frame.id
      e.width = 100
      e.height = 40
    })
    page.elements.push(frame)
    const result = layoutPage(page)
    expect(result.elements[0]).toMatchObject({ x: 36, y: 56 })
    expect(result.elements[1]).toMatchObject({ x: 152, y: 56 })
    expect(result.elements[2]).toMatchObject({ width: 248, height: 72 })
    result.elements[0]!.width = 200
    expect(layoutPage(result).elements[1]!.x).toBe(252)
  })
  it('supports fill, wrapping, nested frame movement and frame duplication', () => {
    const page = fixture().document.pages[0]!,
      frame = makeElement('frame', { x: 0, y: 0 }, 'Frame')
    frame.width = 400
    frame.height = 150
    frame.layout = defaultLayout()
    page.elements.forEach(e => {
      e.parent = frame.id
      e.width = 100
      e.height = 40
    })
    page.elements[1]!.widthMode = 'fill'
    page.elements.push(frame)
    const result = layoutPage(page)
    expect(result.elements[1]!.width).toBe(252)
    result.elements[1]!.widthMode = 'fixed'
    frame.layout.wrap = true
    result.elements[2]!.layout!.wrap = true
    result.elements[2]!.width = 160
    expect(layoutPage(result).elements[1]!.y).toBeGreaterThan(
      result.elements[0]!.y
    )
    const duplicated = duplicateElements(page, [frame.id]).page
    expect(
      documentSchema.safeParse({ version: 1, pages: [duplicated] }).success
    ).toBe(true)
    expect(duplicated.elements).toHaveLength(6)
    expect(removeElements(page, [frame.id]).elements).toHaveLength(0)
  })
  it('rejects cyclic frame hierarchies', () => {
    const document = fixture().document,
      page = document.pages[0]!
    const frame = makeElement('frame', { x: 0, y: 0 }, 'Frame')
    frame.parent = frame.id
    page.elements.push(frame)
    expect(documentSchema.safeParse(document).success).toBe(false)
  })
  it('reflows nested fill containers and keeps repeated layout stable', () => {
    const page = fixture().document.pages[0]!
    const outer = makeElement('frame', { x: 100, y: 100 }, 'Outer')
    outer.width = 600
    outer.height = 300
    outer.layout = defaultLayout()
    const inner = makeElement('frame', { x: 0, y: 0 }, 'Inner')
    inner.parent = outer.id
    inner.widthMode = 'fill'
    inner.heightMode = 'fill'
    inner.layout = { ...defaultLayout(), direction: 'vertical' }
    page.elements.forEach(e => {
      e.parent = inner.id
      e.widthMode = 'fill'
      e.height = 40
    })
    page.elements.push(inner, outer)
    const result = layoutPage(page)
    expect(result.elements[0]).toMatchObject({ x: 132, y: 132, width: 536 })
    expect(result.elements[1]).toMatchObject({ x: 132, y: 188, width: 536 })
    expect(layoutPage(result)).toEqual(result)
  })
})

describe('Reusable components', () => {
  it('propagates connector changes and removes deleted component parts', () => {
    const document = fixture().document,
      page = document.pages[0]!
    const definition = componentFromSelection(
      page,
      page.elements.map(e => e.id),
      'Connected card'
    )!
    definition.connectors.push({
      id: crypto.randomUUID(),
      source: definition.elements[0]!.id,
      target: definition.elements[1]!.id,
      color: '#334455',
      label: 'Before',
      style: 'curve',
      arrow: true
    })
    document.components = [definition]
    const instance = instantiate(definition, 500, 200)
    page.elements.push(...instance.elements)
    page.connectors.push(...instance.connectors)
    const updated = clone(definition)
    updated.connectors[0]!.label = 'After'
    const result = applyDefinition(document, updated)
    expect(result.pages[0]!.connectors[0]).toMatchObject({
      id: instance.connectors[0]!.id,
      label: 'After'
    })
    updated.elements.pop()
    updated.connectors = []
    const removed = applyDefinition(result, updated)
    expect(removed.pages[0]!.connectors).toHaveLength(0)
    expect(documentSchema.safeParse(removed).success).toBe(true)
  })
  it('updates instances across pages while preserving overrides and positioning', () => {
    const document = fixture().document,
      page = document.pages[0]!
    const definition = componentFromSelection(
      page,
      page.elements.map(e => e.id),
      'Card'
    )!
    document.components = [definition]
    const a = instantiate(definition, 500, 200),
      b = instantiate(definition, 900, 200)
    a.elements[0]!.fill = '#00ff00'
    a.elements[0]!.component.overrides = ['fill']
    page.elements.push(...a.elements, ...b.elements)
    const updated = clone(definition)
    updated.elements[0]!.fill = '#ff0000'
    const result = applyDefinition(document, updated)
    expect(
      result.pages[0]!.elements.find(e => e.id === a.elements[0]!.id)
    ).toMatchObject({ fill: '#00ff00', x: 500 })
    expect(
      result.pages[0]!.elements.find(e => e.id === b.elements[0]!.id)
    ).toMatchObject({ fill: '#ff0000', x: 900 })
    expect(documentSchema.safeParse(result).success).toBe(true)
    expect(documentSchema.safeParse(duplicateDocument(result)).success).toBe(
      true
    )
    const malicious = clone(result)
    malicious.pages[0]!.elements.find(e => e.component)!.component!.overrides =
      ['constructor']
    expect(documentSchema.safeParse(malicious).success).toBe(false)
  })
})
