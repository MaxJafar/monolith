import { deflateSync, strToU8, zipSync } from 'fflate'
import { compileSchema, encodeBinarySchema, parseSchema } from 'kiwi-schema'

export function penpotFixture() {
  const file = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    page = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    frame = 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    rect = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'
  const shape = {
    id: frame,
    name: 'Imported frame',
    type: 'frame',
    x: 20,
    y: 30,
    width: 500,
    height: 200,
    parentId: '00000000-0000-0000-0000-000000000000',
    shapes: [rect],
    fills: [{ fillColor: '#ffffff' }],
    layout: 'flex',
    layoutFlexDir: 'row',
    layoutGap: { columnGap: 12 }
  }

  return zipSync({
    'manifest.json': strToU8(
      JSON.stringify({
        type: 'penpot/export-files',
        version: 1,
        files: [{ id: file, name: 'Native Penpot' }]
      })
    ),
    [`files/${file}/pages/${page}.json`]: strToU8(
      JSON.stringify({ id: page, name: 'Native page', index: 0 })
    ),
    [`files/${file}/pages/${page}/${frame}.json`]: strToU8(
      JSON.stringify(shape)
    ),
    [`files/${file}/pages/${page}/${rect}.json`]: strToU8(
      JSON.stringify({
        id: rect,
        name: 'Imported rectangle',
        type: 'rect',
        parentId: frame,
        x: 40,
        y: 50,
        width: 100,
        height: 60,
        fills: [{ fillColor: '#ff0000' }]
      })
    )
  })
}

export const kiwi = parseSchema(`
enum NodeType { DOCUMENT = 0; CANVAS = 1; RECTANGLE = 2; TEXT = 3; FRAME = 4; }
struct GUID { uint sessionID; uint localID; }
struct Vector { float x; float y; }
struct Transform { float m00; float m01; float m02; float m10; float m11; float m12; }
struct Parent { GUID guid; string position; }
message TextData { string characters = 1; }
message Node { GUID guid = 1; NodeType type = 2; Parent parentIndex = 3; string name = 4; Vector size = 5; Transform transform = 6; TextData textData = 7; }
message Message { Node[] nodeChanges = 1; }
`)

export const message = {
  nodeChanges: [
    { guid: { sessionID: 0, localID: 0 }, type: 'DOCUMENT', name: 'Document' },
    {
      guid: { sessionID: 0, localID: 1 },
      type: 'CANVAS',
      name: 'Imported page',
      parentIndex: { guid: { sessionID: 0, localID: 0 }, position: '!' }
    },
    {
      guid: { sessionID: 0, localID: 2 },
      type: 'TEXT',
      name: 'Native text',
      size: { x: 200, y: 60 },
      transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 70 },
      parentIndex: { guid: { sessionID: 0, localID: 1 }, position: '!' },
      textData: { characters: 'Editable Figma text' }
    }
  ]
}

export function figFixture(schema = kiwi, data: Record<string, unknown> = message) {
  const compiled = compileSchema(schema)
  const chunks = [
    deflateSync(encodeBinarySchema(schema)),
    deflateSync(compiled.encodeMessage(data))
  ]
  const output = new Uint8Array(
      12 + chunks.reduce((sum, chunk) => sum + chunk.length + 4, 0)
    ),
    view = new DataView(output.buffer)
  output.set(strToU8('fig-kiwi'))
  view.setUint32(8, 106, true)
  let offset = 12

  for (const chunk of chunks) {
    view.setUint32(offset, chunk.length, true)
    output.set(chunk, offset + 4)
    offset += chunk.length + 4
  }

  return output
}
