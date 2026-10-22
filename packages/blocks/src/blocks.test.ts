import { describe, expect, it } from 'vitest'

import {
  BLOCK_PREFIX,
  type BlockDocument,
  type KnowledgeSnapshot,
  assertContent,
  contentText,
  extractReferences,
  localGraph,
  markdownContent,
  parseContent,
  resolveReference,
  serializeDocument,
  stabilizeReferences
} from './index'

const page = {
  kind: 'document' as const,
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Launch plan'
}
const textDoc = (text: string): BlockDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

describe('durable block content', () => {
  it('preserves old text, whitespace, markup and HTML as literal text', () => {
    const original = '# Heading\n\n  - item\n<script>alert(1)</script>\n'
    expect(contentText(serializeDocument(parseContent(original)))).toBe(
      original
    )
    expect(markdownContent(original)).toBe(original)
  })
  it('round trips structured tasks, headings, marks and page references', () => {
    const doc: BlockDocument = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, id: page.id },
          content: [{ type: 'text', text: 'Plan', marks: [{ type: 'bold' }] }]
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'pageLink',
                      attrs: {
                        kind: page.kind,
                        targetId: page.id,
                        label: page.title
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
    const encoded = serializeDocument(doc)
    expect(parseContent(encoded)).toEqual(doc)
    expect(markdownContent(encoded)).toContain('- [x] [[Launch plan]]')
    expect(extractReferences(encoded)).toEqual([
      { kind: page.kind, id: page.id, title: page.title }
    ])
  })
  it('preserves editor numbering attributes and rejects invalid numbering styles', () => {
    const doc: BlockDocument = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 1, type: null },
          content: [
            { type: 'listItem', content: textDoc('First item').content }
          ]
        }
      ]
    }
    expect(parseContent(serializeDocument(doc))).toEqual(doc)
    doc.content[0].attrs!.type = 'A'
    expect(parseContent(serializeDocument(doc))).toEqual(doc)
    doc.content[0].attrs!.type = '<script>'
    expect(() => serializeDocument(doc)).toThrow('numbering style')
  })
  it('rejects malformed versions, invalid grammar, duplicate IDs and excessive nesting', () => {
    expect(() => assertContent('zillion:blocks:v2\n{}')).toThrow('version')
    expect(() => assertContent(BLOCK_PREFIX + '{')).toThrow()
    expect(() =>
      serializeDocument({
        type: 'doc',
        content: [{ type: 'text', text: 'invalid' }]
      })
    ).toThrow()
    expect(() =>
      serializeDocument({
        type: 'doc',
        content: [
          { type: 'paragraph', attrs: { id: page.id } },
          { type: 'paragraph', attrs: { id: page.id } }
        ]
      })
    ).toThrow('duplicate')
    let content = textDoc('nested').content
    for (let i = 0; i < 35; i++) content = [{ type: 'blockquote', content }]
    expect(() => serializeDocument({ type: 'doc', content })).toThrow(
      'excessive'
    )
  })
  it('rejects executable links, unexpected nodes and HTML attributes', () => {
    expect(() =>
      serializeDocument({ type: 'doc', content: [{ type: 'iframe' }] })
    ).toThrow()
    expect(() =>
      serializeDocument({
        type: 'doc',
        content: [{ type: 'paragraph', attrs: { onclick: 'alert(1)' } }]
      })
    ).toThrow()

    for (const href of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'https://site.test/\nfoo'
    ]) {
      const doc = textDoc('link')
      doc.content[0].content![0].marks = [{ type: 'link', attrs: { href } }]
      expect(() => serializeDocument(doc)).toThrow('Unsafe')
    }

    for (const title of [{ toString: () => 'x' }, 'x'.repeat(256)]) {
      const doc = textDoc('link')
      doc.content[0].content![0].marks = [
        { type: 'link', attrs: { href: 'https://site.test', title } }
      ]
      expect(() => serializeDocument(doc)).toThrow('Unsafe')
    }
  })
  it('accepts links exactly as the editor emits them', () => {
    for (const title of [null, 'Project site']) {
      const doc = textDoc('link')
      doc.content[0].content![0].marks = [
        {
          type: 'link',
          attrs: {
            href: 'https://example.com',
            target: '_blank',
            rel: 'noopener noreferrer',
            class: null,
            title
          }
        }
      ]
      expect(parseContent(serializeDocument(doc))).toEqual(doc)
    }
  })
  it('excludes references in code and respects wiki aliases', () => {
    expect(
      extractReferences(
        '[[Launch plan|Plan]]\n`[[Ignored]]`\n```\n[[Ignored too]]\n```'
      )
    ).toEqual([{ title: 'Launch plan' }])
    const doc: BlockDocument = {
      type: 'doc',
      content: [
        { type: 'codeBlock', content: [{ type: 'text', text: '[[Ignored]]' }] },
        ...textDoc('[[Launch plan]]').content
      ]
    }
    expect(extractReferences(serializeDocument(doc))).toEqual([
      { title: 'Launch plan' }
    ])
  })
  it('never guesses between duplicate titles or resolves foreign/deleted IDs', () => {
    expect(
      resolveReference({ title: page.title }, [
        page,
        { ...page, id: '00000000-0000-4000-8000-000000000002' }
      ])
    ).toBeUndefined()
    expect(
      resolveReference({ id: page.id, kind: 'note', title: page.title }, [page])
    ).toBeUndefined()
  })
  it('stabilizes wiki titles to IDs so renaming preserves backlinks', () => {
    const value = stabilizeReferences(
      serializeDocument(
        textDoc('Before [[Launch plan|My plan]] after [[Missing]]')
      ),
      [page]
    )
    expect(contentText(value)).toBe('Before My plan after [[Missing]]')
    const [reference] = extractReferences(value)
    expect(
      resolveReference(reference, [{ ...page, title: 'Renamed' }])?.id
    ).toBe(page.id)
    expect(stabilizeReferences(value, [page])).toBe(value)
  })
  it('bounds content size without silently dropping text', () => {
    expect(() => assertContent('x'.repeat(1_000_001))).toThrow('large')
    expect(() => serializeDocument(textDoc('x'.repeat(1_000_000)))).toThrow(
      'large'
    )
  })
})

it('computes undirected local neighborhoods by breadth, not edge order', () => {
  const graph: KnowledgeSnapshot = {
    nodes: ['a', 'b', 'c', 'd'].map(key => ({
      id: key,
      key,
      kind: 'note',
      title: key
    })),
    edges: [
      { id: '2', source: 'b', target: 'c', kind: 'mention', label: '' },
      { id: '1', source: 'a', target: 'b', kind: 'related', label: '' }
    ],
    unresolved: 0
  }
  expect(localGraph(graph, 'a', 1).nodes.map(node => node.key)).toEqual([
    'a',
    'b'
  ])
  expect(localGraph(graph, 'a', 2).nodes.map(node => node.key)).toEqual([
    'a',
    'b',
    'c'
  ])
  expect(localGraph(graph, 'd', 3).nodes.map(node => node.key)).toEqual(['d'])
})
