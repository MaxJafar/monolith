import type { PageTarget } from '@monolith/blocks'
import { Node, mergeAttributes } from '@tiptap/core'
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer
} from '@tiptap/react'
import { useTranslation } from 'react-i18next'

import { useCanvasWidgets } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'

function DatabaseBlock({ node, editor, updateAttributes }: NodeViewProps) {
  const catalog = useCanvasWidgets()
  const { t } = useTranslation('common')
  const { workspaceId, baseId, viewId, height } = node.attrs
  return (
    <NodeViewWrapper
      className="monolith-inline-database-block"
      data-block-id={node.attrs.id}
      contentEditable={false}
    >
      {catalog.render('linkedDatabase', {
        filter: JSON.stringify({ workspaceId, baseId, viewId, height }),
        readOnly: !editor.isEditable,
        onViewChange: editor.isEditable
          ? viewId => updateAttributes({ viewId })
          : undefined,
        onHeightChange: editor.isEditable
          ? height => updateAttributes({ height })
          : undefined
      }) || <span>{t('inlineDatabase.unavailable')}</span>}
    </NodeViewWrapper>
  )
}

export const LinkedDatabaseBlock = Node.create({
  name: 'linkedDatabase',
  group: 'block',
  atom: true,
  isolating: true,
  addAttributes() {
    return {
      workspaceId: { default: '' },
      baseId: { default: '' },
      viewId: { default: '' },
      title: { default: '' },
      height: { default: 0 }
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-linked-database]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-linked-database': '' })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(DatabaseBlock)
  }
})

export const CalloutBlock = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'aside[data-callout]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        class: 'monolith-inline-callout'
      }),
      0
    ]
  }
})

export function pageBlockExtension(
  onOpen: (page: Pick<PageTarget, 'kind' | 'id'>) => void
) {
  function PageBlock({ node }: NodeViewProps) {
    const catalog = useCanvasWidgets()
    const target = catalog.pages?.find(
      page => page.id === node.attrs.targetId && page.kind === node.attrs.kind
    )
    return (
      <NodeViewWrapper
        className="monolith-inline-page-block"
        data-block-id={node.attrs.id}
        contentEditable={false}
      >
        <button
          type="button"
          onClick={() =>
            onOpen({ kind: node.attrs.kind, id: node.attrs.targetId })
          }
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6" />
          </svg>
          <span>{target?.title || node.attrs.label}</span>
        </button>
      </NodeViewWrapper>
    )
  }
  return Node.create({
    name: 'pageEmbed',
    group: 'block',
    atom: true,
    addAttributes() {
      return {
        kind: { default: 'record' },
        targetId: { default: '' },
        label: { default: '' }
      }
    },
    parseHTML() {
      return [{ tag: 'div[data-page-embed]' }]
    },
    renderHTML({ HTMLAttributes }) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-page-embed': '' })]
    },
    addNodeView() {
      return ReactNodeViewRenderer(PageBlock)
    }
  })
}
