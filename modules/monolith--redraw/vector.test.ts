import { describe, expect, it } from 'vitest'

import {
  duplicateDocument,
  makeDocument,
  makeElement
} from './client/src/model'
import { mergeSnapshots } from './design'
import { documentSchema } from './shared'
import {
  fitVector,
  moveNode,
  parsePath,
  splitSegment,
  toVector,
  vectorPath,
  vectorPoint,
  vectorWorld
} from './vector'

describe('Editable vector geometry', () => {
  it('normalizes relative curves, smooth commands, arcs and multiple closed contours', () => {
    const vector = parsePath(
      'M10 10 h40 v30 h-40z M60 10 q20 -10 30 0 t30 0 a10 10 0 0 1 10 10 c0 10 -10 10 -10 0 s-10 -10 -10 0'
    )
    expect(vector).toHaveLength(2)
    expect(vector[0]!.closed).toBe(true)
    expect(vector[0]!.nodes).toHaveLength(4)
    expect(vector[1]!.nodes.at(-1)).toMatchObject({ x: 110, y: 20 })
    expect(vector[1]!.nodes[1]!.in).not.toBeNull()
    const again = parsePath(vectorPath(vector))
    expect(again.map(c => c.nodes.map(({ id: _id, ...n }) => n))).toEqual(
      vector.map(c => c.nodes.map(({ id: _id, ...n }) => n))
    )
  })
  it('splits a cubic without changing its curve and keeps symmetric handles aligned', () => {
    const vector = parsePath('M0 0 C0 100 100 100 100 0')
    const result = splitSegment(vector, vector[0]!.id, vector[0]!.nodes[0]!.id)
    expect(result[0]!.nodes[1]).toMatchObject({
      x: 50,
      y: 75,
      in: { x: 25, y: 75 },
      out: { x: 75, y: 75 }
    })
    expect(vector[0]!.nodes).toHaveLength(2)
    const n = { ...result[0]!.nodes[1]!, mode: 'symmetric' as const }
    expect(moveNode(n, { x: 90, y: 55 }, 'out').in).toEqual({ x: 10, y: 95 })
    expect(moveNode(n, { x: 70, y: 80 }, 'anchor').in).toEqual({ x: 45, y: 80 })
  })
  it('preserves world geometry through rotation, scaling and reframing', () => {
    const element = toVector({
      ...makeElement('ellipse', { x: 120, y: 80 }, 'Oval'),
      width: 300,
      height: 100,
      rotation: 35
    })
    const point = { x: 70, y: 25 },
      world = vectorWorld(element, point)
    const local = vectorPoint(element, world)
    expect(local.x).toBeCloseTo(point.x)
    expect(local.y).toBeCloseTo(point.y)
    const reframed = fitVector(element),
      after = vectorWorld(reframed, point)
    expect(after.x).toBeCloseTo(world.x)
    expect(after.y).toBeCloseTo(world.y)
    expect(element.vector![0]!.closed).toBe(true)
  })
  it('rejects executable, malformed, oversized and out-of-bounds paths', () => {
    for (const path of [
      '<script/>',
      'M 0',
      'L 5 6',
      'M 1e9 0',
      'M0 0A5 5 0 3 1 10 10',
      `M0 0${'L1 1'.repeat(2001)}`
    ])
      expect(() => parsePath(path)).toThrow()
  })
  it('merges independent node edits and prototype changes without losing remote work', () => {
    const document = makeDocument('canvas', 'Canvas'),
      shape = toVector(makeElement('rectangle', { x: 0, y: 0 }, 'Rectangle'))
    document.pages[0]!.elements = [shape]
    const base = { title: 'Design', document },
      a = structuredClone(base),
      b = structuredClone(base)
    a.document.pages[0]!.elements[0]!.vector![0]!.nodes[0]!.x = 30
    b.document.pages[0]!.elements[0]!.vector![0]!.nodes[1]!.x = 80
    b.document.pages[0]!.elements[0]!.prototype = {
      trigger: 'click',
      action: 'back',
      target: null,
      transition: 'instant',
      duration: 0
    }
    const merged = mergeSnapshots(a, base, b)
    expect(
      merged.document.pages[0]!.elements[0]!.vector![0]!.nodes.map(
        n => n.x
      ).slice(0, 2)
    ).toEqual([30, 80])
    expect(merged.document.pages[0]!.elements[0]!.prototype?.action).toBe(
      'back'
    )
    expect(documentSchema.safeParse(merged.document).success).toBe(true)
  })
  it('remaps prototype destinations when duplicating a file', () => {
    const document = makeDocument('canvas', 'Canvas'),
      frame = makeElement('frame', { x: 0, y: 0 }, 'Target'),
      button = makeElement('rectangle', { x: 10, y: 10 }, 'Go')
    button.prototype = {
      trigger: 'click',
      action: 'navigate',
      target: frame.id,
      transition: 'dissolve',
      duration: 250
    }
    document.pages[0]!.elements = [frame, button]
    document.prototypeStart = frame.id
    const copied = duplicateDocument(document)
    expect(copied.prototypeStart).toBe(copied.pages[0]!.elements[0]!.id)
    expect(copied.pages[0]!.elements[1]!.prototype!.target).toBe(
      copied.prototypeStart
    )
    expect(copied.prototypeStart).not.toBe(frame.id)
  })
})
