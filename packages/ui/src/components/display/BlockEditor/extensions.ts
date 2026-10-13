import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

import type { PageTarget } from '@lifeforge/blocks'

export const BlockIds = Extension.create({
  name: 'blockIds',
  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'taskList',
          'listItem',
          'taskItem',
          'blockquote',
          'codeBlock',
          'horizontalRule'
        ],
        attributes: {
          id: {
            default: null,
            parseHTML: element => element.getAttribute('data-block-id'),
            renderHTML: attrs =>
              attrs.id
                ? { 'data-block-id': attrs.id, id: `block-${String(attrs.id)}` }
                : {}
          }
        }
      }
    ]
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _old, state) {
          if (!transactions.some(transaction => transaction.docChanged))
            return null

          const seen = new Set<string>()
          const transaction = state.tr
          state.doc.descendants((node, pos) => {
            if (!node.isBlock || node.type.name === 'doc') return

            const id = node.attrs.id as string | null

            if (!id || seen.has(id))
              transaction.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                id: crypto.randomUUID()
              })
            seen.add(
              id && !seen.has(id)
                ? id
                : String(transaction.doc.nodeAt(pos)?.attrs.id)
            )
          })

          return transaction.docChanged ? transaction : null
        }
      })
    ]
  }
})

export function pageLinkExtension(
  onOpen: (page: Pick<PageTarget, 'id' | 'kind'>) => void
) {
  return Node.create({
    name: 'pageLink',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
      return {
        kind: { default: 'document' },
        targetId: { default: '' },
        label: { default: '' }
      }
    },
    parseHTML() {
      return [{ tag: 'span[data-page-id]' }]
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          class: 'zillion-page-link',
          'data-page-id': node.attrs.targetId,
          'data-page-kind': node.attrs.kind,
          role: 'link',
          tabindex: '0'
        }),
        String(node.attrs.label)
      ]
    },
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              click: (_view, event) => {
                const element = (event.target as Element).closest<HTMLElement>(
                  '[data-page-id]'
                )

                if (!element) return false
                event.preventDefault()
                onOpen({
                  id: element.dataset.pageId!,
                  kind: element.dataset.pageKind as PageTarget['kind']
                })

                return true
              },
              keydown: (_view, event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return false

                const element = (event.target as Element).closest<HTMLElement>(
                  '[data-page-id]'
                )

                if (!element) return false
                event.preventDefault()
                onOpen({
                  id: element.dataset.pageId!,
                  kind: element.dataset.pageKind as PageTarget['kind']
                })

                return true
              }
            }
          }
        })
      ]
    }
  })
}
