import { type ReactNode, useRef } from 'react'

import type { EditorSnapshot } from '@monolith/api'

import { DocumentEditor } from '@/components/display/DocumentEditor'

import { useCanvasWidgets } from './CanvasWidgets'
import { WidgetBoard } from './WidgetBoard'
import { readWidgetSnapshot, writeWidgetSnapshot } from './canonicalWidgets'

export function CanonicalWidgetBoard({
  snapshot,
  workspaceId,
  scope,
  nativeTitle,
  native,
  readOnly,
  onChange
}: {
  snapshot: EditorSnapshot
  workspaceId: string
  scope: string
  nativeTitle: string
  native?: ReactNode
  readOnly: boolean
  onChange: (snapshot: EditorSnapshot) => void
}) {
  const catalog = useCanvasWidgets()

  const { blocks, originals } = readWidgetSnapshot(snapshot)

  const retained = useRef(new Map<string, EditorSnapshot['blocks']>())

  for (const [id, block] of originals) retained.current.set(id, block)

  return (
    <WidgetBoard
      blocks={blocks}
      canResize={block => ['native', 'widget'].includes(block.type)}
      nativeTitle={nativeTitle}
      readOnly={readOnly}
      render={block => {
        if (block.type === 'native') return native
        if (block.type === 'widget')
          return catalog.render(block.widget, {
            filter: block.content,
            readOnly,
            onConfigChange: readOnly
              ? undefined
              : content =>
                  onChange(
                    writeWidgetSnapshot(
                      snapshot,
                      blocks.map(item =>
                        item.id === block.id ? { ...item, content } : item
                      )
                    )
                  )
          })

        const original = originals.get(block.id)!
        const content = {
          ...snapshot,
          meta: { ...snapshot.meta, title: block.title },
          blocks: {
            ...snapshot.blocks,
            children: snapshot.blocks.children.map(item =>
              item.flavour === 'affine:note'
                ? { ...item, children: [original] }
                : item
            )
          }
        }

        return (
          <DocumentEditor
            readOnly
            initialSnapshot={content}
            renderEmbed={embed =>
              embed.props.moduleId === 'native'
                ? native
                : catalog.render(
                    embed.flavour === 'monolith:linked-database'
                      ? 'linkedDatabase'
                      : String(embed.props.widgetId),
                    {
                      filter:
                        embed.flavour === 'monolith:linked-database'
                          ? JSON.stringify(embed.props)
                          : String(
                              (
                                embed.props.config as
                                  { content?: string } | undefined
                              )?.content ?? ''
                            ),
                      readOnly: true
                    }
                  )
            }
            workspaceId={workspaceId}
          />
        )
      }}
      scope={scope}
      onChange={next =>
        onChange(writeWidgetSnapshot(snapshot, next, retained.current))
      }
    />
  )
}
