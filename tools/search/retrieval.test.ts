import assert from 'node:assert/strict'
import test from 'node:test'

import {
  type Source,
  chunks,
  cosine,
  digest,
  isFresh,
  retrieve,
  tokens
} from '../../apps/api/src/lib/search/retrieval'

const source = (id: string, title: string, text: string): Source => ({
  id,
  title,
  text,
  module: 'notes',
  workspace: null,
  href: '/notes',
  fingerprint: digest(text)
})
test('chunk windows retain an emoji at boundaries and the final character', () => {
  const text = 'a'.repeat(998) + '😀' + 'b'.repeat(1800) + '𐐀'
  const windows = chunks(text)
  assert(windows.some(w => w.includes('😀')))
  assert(windows.at(-1)?.endsWith('𐐀'))
  assert(
    windows.every(
      w =>
        Array.from(w).length <= 1000 &&
        !/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/.test(w)
    )
  )
})
test('keyword ranking finds rare phrases and Chinese words within unspaced text', () => {
  const a = source('a', 'Camera', 'Aperture controls lens exposure')
  const b = source('b', 'Groceries', 'Milk and bread')
  assert.equal(
    retrieve(
      [a, b].map(s => ({
        id: s.id,
        source: s,
        ordinal: 0,
        text: s.text,
        inferred: false
      })),
      'lens exposure'
    )[0]?.id,
    'a'
  )
  const c = source('c', '知识', '我正在学习摄影知识')
  assert.equal(
    retrieve(
      [{ id: 'c', source: c, ordinal: 0, text: c.text, inferred: false }],
      '摄影'
    )[0]?.id,
    'c'
  )
  assert(tokens('摄影').includes('摄影'))
})
test('rank fusion recovers a semantic match absent from the lexical list', () => {
  const s = source('semantic', 'Travel', 'Visit a distant town')
  assert.equal(
    retrieve(
      [
        {
          id: s.id,
          source: s,
          ordinal: 0,
          text: s.text,
          inferred: false,
          vector: [1, 0]
        }
      ],
      'holiday',
      [1, 0]
    )[0]?.id,
    s.id
  )
  assert.equal(cosine([1, 0], [0, 1]), 0)
  assert.equal(cosine([0, 0], [1, 1]), 0)
})
test('deleted sources, changed content and different model versions reject cached vectors', () => {
  const s = source('a', 'Note', 'original')
  assert(isFresh(s, s.fingerprint, 'v1', 'v1'))
  assert(!isFresh(undefined, s.fingerprint, 'v1', 'v1'))
  assert(
    !isFresh({ ...s, fingerprint: digest('edited') }, s.fingerprint, 'v1', 'v1')
  )
  assert(!isFresh(s, s.fingerprint, 'v1', 'v2'))
})
