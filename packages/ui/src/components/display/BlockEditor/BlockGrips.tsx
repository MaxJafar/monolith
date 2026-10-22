import type { Editor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { startBlockDrag } from '@/utils/blockDrag'

import { draggingBlock } from './extensions'

function blocks(editor: Editor) {
  const result: Array<{
    id: string
    pos: number
    size: number
    element: HTMLElement
  }> = []
  editor.state.doc.forEach((node, pos) => {
    const element = editor.view.nodeDOM(pos)
    if (element instanceof HTMLElement)
      result.push({
        id: String(node.attrs.id ?? pos),
        pos,
        size: node.nodeSize,
        element
      })
  })
  return result
}

/** Grips live outside ProseMirror so selection, composition and history stay native. */
export function BlockGrips({ editor }: { editor: Editor }) {
  const { t } = useTranslation('common.canvas')
  const root = useRef<HTMLDivElement>(null)
  const cancel = useRef<() => void>(() => {})
  const [items, setItems] = useState<Array<{ id: string; top: number }>>([])
  useEffect(() => {
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!root.current || editor.isDestroyed) return
        const top = root.current.getBoundingClientRect().top
        setItems(
          blocks(editor).map(item => ({
            id: item.id,
            top: item.element.getBoundingClientRect().top - top
          }))
        )
      })
    }
    const resize = new ResizeObserver(sync)
    resize.observe(editor.view.dom)
    editor.on('transaction', sync)
    sync()
    return () => {
      cancel.current()
      cancelAnimationFrame(frame)
      resize.disconnect()
      editor.off('transaction', sync)
    }
  }, [editor])
  function move(id: string, to: string, before: boolean) {
    const current = blocks(editor)
    const source = current.find(item => item.id === id),
      target = current.find(item => item.id === to)
    if (!source || !target || source.id === target.id || !editor.isEditable)
      return
    const node = editor.state.doc.nodeAt(source.pos)
    if (!node) return
    const destination = target.pos + (before ? 0 : target.size)
    const tr = editor.state.tr.delete(source.pos, source.pos + source.size)
    tr.insert(tr.mapping.map(destination), node)
    editor.view.dispatch(tr.scrollIntoView())
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-drag-id="${CSS.escape(id)}"]`)
        ?.focus()
    )
  }
  return (
    <div ref={root} className="monolith-block-grips">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          data-drag-id={item.id}
          aria-label={t('dragBlock')}
          title={`${t('dragBlock')} · Alt ↑ / ↓`}
          style={{ top: item.top }}
          onPointerDown={event => {
            const button = event.currentTarget
            const source = blocks(editor).find(block => block.id === item.id)
            if (!source) return
            cancel.current()
            cancel.current = startBlockDrag(event.nativeEvent, source.element, {
              targets: () => blocks(editor),
              commit: (id, before) => move(item.id, id, before),
              click: () => {
                editor.commands.setNodeSelection(source.pos)
                button.focus()
              },
              mark: dragging => {
                if (editor.isDestroyed) return

                const pos = dragging
                  ? blocks(editor).find(block => block.id === item.id)?.pos
                  : undefined
                editor.view.dispatch(
                  editor.state.tr.setMeta(draggingBlock, pos ?? null)
                )
              }
            })
          }}
          onKeyDown={event => {
            if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              const target = items[index + (event.key === 'ArrowUp' ? -1 : 1)]
              if (target) move(item.id, target.id, event.key === 'ArrowUp')
            }
          }}
        >
          ⠿
        </button>
      ))}
    </div>
  )
}
