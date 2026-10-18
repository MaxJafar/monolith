import { describe, expect, it } from 'vitest'

import {
  type BlockDocument,
  extractReferences,
  markdownContent,
  parseContent,
  serializeDocument
} from './index'

const id = '11111111-1111-4111-8111-111111111111'
const database = {
  type: 'linkedDatabase',
  attrs: { workspaceId: id, baseId: id, viewId: id, title: 'Plan', height: 420 }
}
const page = {
  type: 'pageEmbed',
  attrs: { kind: 'record', targetId: id, label: 'Brief' }
}
const doc: BlockDocument = {
  type: 'doc',
  content: [
    { type: 'callout', content: [{ type: 'paragraph' }, database] },
    page
  ]
}
describe('record page blocks', () => {
  it('round-trips embedded databases and page references inside callouts', () => {
    const stored = serializeDocument(doc)
    expect(parseContent(stored)).toEqual(doc)
    expect(extractReferences(stored)).toEqual([
      { kind: 'record', id, title: 'Brief' }
    ])
    expect(markdownContent(stored)).toContain('[[Brief]]')
  })
  it('supports automatic height and rejects malformed persisted references', () => {
    expect(() =>
      serializeDocument({
        ...doc,
        content: [{ ...database, attrs: { ...database.attrs, height: 0 } }]
      })
    ).not.toThrow()
    for (const attrs of [
      { ...database.attrs, height: 2000 },
      { ...database.attrs, baseId: 'broken' },
      { ...database.attrs, height: NaN }
    ])
      expect(() =>
        serializeDocument({ ...doc, content: [{ ...database, attrs }] })
      ).toThrow('Invalid inline database')
  })
})
