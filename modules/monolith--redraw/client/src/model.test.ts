import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { documentSchema } from '../../shared'
import {
  addConnection,
  autoLayout,
  duplicateDocument,
  duplicateElements,
  edgeGeometry,
  elementBounds,
  makeDocument,
  makeElement,
  makePage,
  removeElements,
  toWorld,
  zoomAt
} from './model'
import { createTemplate, templates } from './templates'

describe('Redraw document integrity', () => {
  const graph = () => {
    let page = makePage('blackboard', 'Ideas')

    const a = makeElement('node', { x: 0, y: 0 }, 'A'),
      b = makeElement('node', { x: 400, y: 0 }, 'B')
    page.elements = [a, b]
    page = addConnection(page, a.id, b.id)

    return { page, a, b }
  }
  it('deleting a node removes its connections while preserving locked objects', () => {
    const { page, a, b } = graph()
    b.locked = true
    const result = removeElements(page, [a.id, b.id])
    expect(result.elements.map(e => e.id)).toEqual([b.id])
    expect(result.connectors).toEqual([])
    expect(page.elements).toHaveLength(2)
  })
  it('duplicates a connected group with independent object, group and edge identities', () => {
    const { page, a, b } = graph()
    a.group = b.group = crypto.randomUUID()
    const result = duplicateElements(page, [a.id, b.id])
    expect(result.page.elements).toHaveLength(4)
    const [copyA, copyB] = result.page.elements.slice(2)
    expect(copyA!.group).toBe(copyB!.group)
    expect(copyA!.group).not.toBe(a.group)
    expect(result.page.connectors[1]).toMatchObject({
      source: copyA!.id,
      target: copyB!.id
    })
    expect(copyA!.x).toBe(32)
  })
  it('cannot create dangling, reflexive or duplicate connections', () => {
    const { page, a, b } = graph()
    expect(addConnection(page, a.id, a.id)).toBe(page)
    expect(addConnection(page, a.id, crypto.randomUUID())).toBe(page)
    expect(addConnection(page, a.id, b.id)).toBe(page)
  })
  it('terminates layout for cyclic mind maps and preserves locked positions', () => {
    const { page, a, b } = graph()
    a.locked = true
    const cycle = addConnection(page, b.id, a.id)
    const result = autoLayout(cycle)
    expect(result.elements.find(e => e.id === a.id)).toMatchObject({
      x: 0,
      y: 0
    })
    expect(
      result.elements.every(e => Number.isFinite(e.x) && Number.isFinite(e.y))
    ).toBe(true)
  })
  it('keeps the cursor anchored while zooming and clamps excessive zoom', () => {
    const view = { x: 120, y: -50, zoom: 0.8 },
      cursor = { x: 300, y: 240 }
    const point = toWorld(cursor, view),
      next = zoomAt(view, cursor, 90)
    expect(next.zoom).toBe(4)
    expect(toWorld(cursor, next)).toEqual(point)
  })
  it('includes rotated bounds and connects object boundaries rather than centers', () => {
    const { page, a, b } = graph()
    expect(edgeGeometry(page.connectors[0]!, page.elements)?.path).toContain(
      'M 200 44'
    )
    a.rotation = 90
    expect(elementBounds(a).width).toBeCloseTo(a.height)
    b.hidden = true
    expect(edgeGeometry(page.connectors[0]!, page.elements)).toBeNull()
  })
  it('round-trips templates through the versioned schema without external resources', () => {
    for (const template of templates) {
      const doc = createTemplate(template.id, template.mode, key => key)
      expect(documentSchema.parse(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
      const copy = duplicateDocument(doc)
      expect(documentSchema.safeParse(copy).success).toBe(true)
      expect(copy.pages[0]!.id).not.toBe(doc.pages[0]!.id)
    }
  })
  it('rejects malformed imports, cross-page connectors, duplicate IDs and executable images', () => {
    const { page, a } = graph(),
      doc = { version: 1, pages: [page] }
    const badVersion = { ...doc, version: 2 }
    expect(documentSchema.safeParse(badVersion).success).toBe(false)
    const malformed = structuredClone(doc)
    malformed.pages[0]!.elements[0]!.width = Infinity
    expect(documentSchema.safeParse(malformed).success).toBe(false)
    a.image = 'data:image/svg+xml;base64,PHN2Zy8+'
    expect(documentSchema.safeParse(doc).success).toBe(false)
    a.image = ''
    page.connectors[0]!.target = crypto.randomUUID()
    expect(documentSchema.safeParse(doc).success).toBe(false)
    page.connectors = []
    page.elements.push(structuredClone(a))
    expect(documentSchema.safeParse(doc).success).toBe(false)
  })
  it('requires at least one page and validates all locale keys', () => {
    expect(documentSchema.safeParse({ version: 1, pages: [] }).success).toBe(
      false
    )
    expect(
      documentSchema.safeParse(makeDocument('canvas', 'Canvas')).success
    ).toBe(true)
    const keys = (object: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(object)
        .flatMap(([key, value]) =>
          typeof value === 'object' && value
            ? keys(value as Record<string, unknown>, prefix + key + '.')
            : [prefix + key]
        )
        .sort()
    const locales = ['en', 'ms', 'zh-CN', 'zh-TW'].map(locale =>
      JSON.parse(
        readFileSync(
          new URL(`../../locales/${locale}.json`, import.meta.url),
          'utf8'
        )
      )
    )

    for (const locale of locales.slice(1))
      expect(keys(locale)).toEqual(keys(locales[0]))
  })
})
