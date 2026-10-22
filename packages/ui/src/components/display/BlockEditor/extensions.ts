import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import type { PageTarget } from '@monolith/blocks'

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
          'horizontalRule',
          'linkedDatabase',
          'callout',
          'pageEmbed'
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

export const draggingBlock = new PluginKey<DecorationSet>('draggingBlock')

/** ProseMirror redraws a block whose DOM is mutated directly, which would
 * detach a lifted block mid-drag. Mark it with a decoration instead. */
export const BlockDragging = Extension.create({
  name: 'blockDragging',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: draggingBlock,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const pos = transaction.getMeta(draggingBlock) as
              number | null | undefined

            if (pos === undefined)
              return decorations.map(transaction.mapping, transaction.doc)

            const node = pos === null ? null : transaction.doc.nodeAt(pos)

            if (pos === null || !node) return DecorationSet.empty

            return DecorationSet.create(transaction.doc, [
              Decoration.node(pos, pos + node.nodeSize, {
                'data-dragging': 'true'
              })
            ])
          }
        },
        props: { decorations: state => draggingBlock.getState(state) }
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
