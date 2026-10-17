import { strToU8, zipSync } from 'fflate'
import { compileSchema } from 'kiwi-schema'
import { describe, expect, it } from 'vitest'

import { figFixture, kiwi, message, penpotFixture } from '../../import-fixtures'
import { documentSchema } from '../../shared'
import {
  decodeKiwi,
  importNative,
  inflateChunk,
  readArchive
} from './nativeImport'

describe('Native file import', () => {
  it('reads Penpot archives into editable hierarchy and auto-layout', () => {
    const result = importNative(penpotFixture(), 'example.penpot')
    expect(result.title).toBe('Native Penpot')
    expect(result.document.pages[0]!.elements).toHaveLength(2)
    expect(result.document.pages[0]!.elements[0]!.layout?.direction).toBe(
      'horizontal'
    )
    expect(result.document.pages[0]!.elements[1]!.parent).toBe(
      result.document.pages[0]!.elements[0]!.id
    )
  })
  it('interprets embedded Kiwi schemas without evaluating imported code', () => {
    expect(
      decodeKiwi(kiwi, compileSchema(kiwi).encodeMessage(message))
    ).toEqual(message)

    for (const bytes of [
      figFixture(),
      zipSync({ 'canvas.fig': figFixture() })
    ]) {
      const result = importNative(bytes, 'example.fig')
      expect(result.document.pages[0]!.elements[0]).toMatchObject({
        kind: 'text',
        text: 'Editable Figma text',
        x: 50,
        y: 70
      })
      expect(documentSchema.safeParse(result.document).success).toBe(true)
    }
  })
  it('preserves absolute SVG paths from current Penpot exports, including winding rules', () => {
    const files = readArchive(penpotFixture())
    const path = [...files.keys()].find(p =>
      p.endsWith('/dddddddd-dddd-4ddd-dddd-dddddddddddd.json')
    )!
    const shape = JSON.parse(new TextDecoder().decode(files.get(path)))
    Object.assign(shape, {
      type: 'path',
      x: null,
      y: null,
      width: null,
      height: null,
      selrect: { x: 680, y: 300, width: 14, height: 12 },
      content: 'M680 300C680 302 694 312 694 300Z',
      svgAttrs: { fillRule: 'evenodd' }
    })
    files.set(path, strToU8(JSON.stringify(shape)))
    const imported = importNative(
      zipSync(Object.fromEntries(files)),
      'native.penpot'
    )
    const vector = imported.document.pages[0]!.elements.find(
      e => e.kind === 'path'
    )!
    expect(vector.pathData).toBe(shape.content)
    expect(vector.pathViewBox).toEqual(shape.selrect)
    expect(vector.fillRule).toBe('evenodd')
    expect(imported.warnings.some(w => w.code === 'paths')).toBe(false)
    vector.width *= 2
    expect(vector.pathViewBox!.width).toBe(14)
    expect(documentSchema.safeParse(imported.document).success).toBe(true)
  })
  it('supports Zstandard chunks and rejects oversized windows before allocation', () => {
    expect(
      new TextDecoder().decode(
        inflateChunk(
          new Uint8Array([
            0x28, 0xb5, 0x2f, 0xfd, 0x20, 5, 41, 0, 0, 104, 101, 108, 108, 111
          ])
        )
      )
    ).toBe('hello')
    expect(() =>
      inflateChunk(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0, 255, 0]))
    ).toThrow()
    expect(() =>
      inflateChunk(
        new Uint8Array([
          0x28, 0xb5, 0x2f, 0xfd, 0x20, 5, 41, 0, 0, 104, 101, 108, 108, 111,
          0x28, 0xb5, 0x2f, 0xfd, 0, 255, 0
        ])
      )
    ).toThrow('nativeLimit')
  })
  it('rejects traversal, malformed data and executable path/image content', () => {
    expect(() =>
      readArchive(zipSync({ '../evil.json': strToU8('{}') }))
    ).toThrow()
    expect(() =>
      importNative(strToU8('not a fig file'), 'broken.fig')
    ).toThrow()
    expect(() =>
      importNative(new Uint8Array([1, 11, 26, 134]), 'old.penpot')
    ).toThrow('legacyPenpot')
    const document = importNative(figFixture(), 'example.fig').document
    document.pages[0]!.elements[0]!.pathData = '<script>alert(1)</script>'
    expect(documentSchema.safeParse(document).success).toBe(false)
  })
})
