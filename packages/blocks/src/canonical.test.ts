import { describe, expect, it } from 'vitest'

import {
  type CanonicalBlock,
  canonicalMarkdown,
  canonicalReferences,
  canonicalText,
  serializeCanonical
} from './canonical'

const text = (insert: string, attributes?: Record<string, unknown>) => ({
  '$blocksuite:internal:text$': [{ insert, attributes }]
})
const block = (
  flavour: string,
  props: Record<string, unknown>,
  children: CanonicalBlock[] = []
): CanonicalBlock => ({ id: crypto.randomUUID(), flavour, props, children })
const doc = (...children: CanonicalBlock[]) =>
  serializeCanonical({
    type: 'page',
    meta: { id: 'page', title: 'Title' },
    blocks: block('affine:page', {}, children)
  })

describe('canonical content consumers', () => {
  it('extracts stable Redraw mentions with workspace context for backlinks', () => {
    const id = crypto.randomUUID(), workspace = crypto.randomUUID()
    const value = doc(block('affine:paragraph', { text: text('Design file', { link: `/redraw/${id}?workspace=${workspace}` }) }))
    expect(canonicalReferences(value)).toEqual([{ kind: 'redraw', id, title: 'Design file' }])
    expect(canonicalMarkdown(value)).toContain(`/redraw/${id}?workspace=${workspace}`)
  })
  it('reads actual editor-exported text for previews, backlinks and Markdown', () => {
    const id = '2dbe2471-08f9-4a98-99e9-11bcd8ba9237'
    const value = doc(
      block('affine:paragraph', {
        text: {
          '$blocksuite:internal:text$': true,
          delta: [
            { insert: 'Saved text ' },
            {
              insert: 'Linked page',
              attributes: { link: `/page/${id}`, bold: true }
            },
            { insert: ' [[Another page]]' }
          ]
        }
      })
    )
    expect(canonicalText(value)).toBe('Saved text Linked page [[Another page]]')
    expect(canonicalReferences(value)).toEqual([
      { kind: 'document', id, title: 'Linked page' },
      { title: 'Another page' }
    ])
    expect(canonicalMarkdown(value)).toContain(`[**Linked page**](/page/${id})`)
  })
  it('reads literal text while exporting formatting, list starts and database references', () => {
    const value = doc(
      block('affine:paragraph', {
        type: 'h2',
        text: text('Hello', { bold: true })
      }),
      block('affine:list', { type: 'numbered', order: 7, text: text('Item') }, [
        block('affine:list', {
          type: 'todo',
          checked: true,
          text: text('Done')
        })
      ]),
      block('monolith:linked-database', {
        workspaceId: 'workspace',
        baseId: 'base',
        viewId: 'view'
      })
    )
    expect(canonicalText(value)).toBe('Hello\nItem\nDone')
    const markdown = canonicalMarkdown(value)
    expect(markdown).toContain('## **Hello**')
    expect(markdown).toContain('7. Item\n  - [x] Done')
    expect(markdown).toContain(
      '/databases?workspace=workspace&base=base&view=view'
    )
  })
  it('retains anchored identities and ignores code mentions without crashing on malformed escapes', () => {
    const id = '2dbe2471-08f9-4a98-99e9-11bcd8ba9237'
    const value = doc(
      block('affine:paragraph', {
        text: text('Linked', { link: `/note/${id}#%invalid` })
      }),
      block('affine:paragraph', { text: text('[[Other page#anchor]]') }),
      block('affine:code', { text: text('[[Not a link]]') })
    )
    expect(canonicalReferences(value)).toEqual([
      { kind: 'note', id, title: 'Linked', block: '%invalid' },
      { title: 'Other page', block: 'anchor' }
    ])
    expect(
      canonicalMarkdown(
        doc(
          block('affine:code', { text: text('```\nplain'), language: 'text' })
        )
      )
    ).toBe('````text\n```\nplain\n````')
  })
})
