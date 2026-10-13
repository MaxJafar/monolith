import { describe, expect, it } from 'vitest'

import {
  type CanvasPage,
  canvasKey,
  canvasLink,
  moveCanvasBlock,
  validateCanvasPage
} from './canvas'

const ids = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
]
const page = (): CanvasPage => ({
  version: 1,
  title: 'Owned page',
  icon: 'lucide:file-text',
  fullWidth: true,
  revision: 0,
  updated: null,
  blocks: ids.map(id => ({
    id,
    type: 'document',
    width: 'full',
    title: '',
    content: '',
    url: '',
    widget: ''
  }))
})
describe('Durable workspace pages', () => {
  it('accepts valid document blocks and independent columns', () => {
    const value = page()
    value.blocks[0].width = 'half'
    expect(() => validateCanvasPage(value)).not.toThrow()
  })
  it.each([
    'javascript:alert(1)',
    '//outside.example',
    'https://user:password@example.test',
    'https://example.test?api_key=secret',
    '/../../private'
  ])('rejects unsafe button target %s', url => {
    const value = page()
    value.blocks[0] = { ...value.blocks[0], type: 'button', url }
    expect(() => validateCanvasPage(value)).toThrow()
    expect(canvasLink(url)).toBe(false)
  })
  it.each([
    '/dashboard',
    '/tech-lab',
    '/page/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ])('accepts owned routing key %s', key => expect(canvasKey(key)).toBe(true))
  it.each(['//outside', '/page?owner=other', '/__proto__/../../', '/bad path'])(
    'rejects invalid page key %s',
    key => expect(canvasKey(key)).toBe(false)
  )
  it('rejects duplicate block identities', () => {
    const value = page()
    value.blocks[1].id = value.blocks[0].id
    expect(() => validateCanvasPage(value)).toThrow()
  })
  it('rejects two mounted area dashboards', () => {
    const value = page()
    value.blocks[0].type = 'native'
    value.blocks[1].type = 'native'
    expect(() => validateCanvasPage(value)).toThrow()
  })
  it('rejects unknown executable fields and excessive blocks', () => {
    const value = page()
    Object.assign(value.blocks[0], { script: 'bad' })
    expect(() => validateCanvasPage(value)).toThrow()
    const tooMany = page()
    tooMany.blocks = Array.from({ length: 101 }, () => ({
      ...page().blocks[0],
      id: crypto.randomUUID()
    }))
    expect(() => validateCanvasPage(tooMany)).toThrow()
  })
  it('rejects malformed rich-text documents rather than converting them', () => {
    const value = page()
    value.blocks[0].content = 'zillion:blocks:v1\n{"type":"script"}'
    expect(() => validateCanvasPage(value)).toThrow()
  })
  it('moves blocks without dropping their content or mutating the source', () => {
    const blocks = page().blocks
    const result = moveCanvasBlock(blocks, ids[2], ids[0])
    expect(result.map(block => block.id)).toEqual([ids[2], ids[0], ids[1]])
    expect(blocks.map(block => block.id)).toEqual(ids)
    expect(new Set(result).size).toBe(3)
  })
  it('ignores stale drag identities and supports moving a block to the end', () => {
    const blocks = page().blocks
    expect(moveCanvasBlock(blocks, 'missing', ids[1])).toBe(blocks)
    expect(
      moveCanvasBlock(blocks, ids[0], null).map(block => block.id)
    ).toEqual([ids[1], ids[2], ids[0]])
  })
})
