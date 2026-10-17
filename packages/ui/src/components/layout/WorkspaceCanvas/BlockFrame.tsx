import type { CanvasBlock } from '@monolith/blocks'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { ContextMenu, ContextMenuItem } from '@/components/overlays'
import { Box, Stack, Text } from '@/components/primitives'
import { startBlockDrag } from '@/utils/blockDrag'
import { settleElement } from '@/utils/elasticMotion'

import { CanvasBlockContent } from './BlockContent'

export function CanvasBlockFrame({
  block,
  editing,
  native,
  index,
  blocks,
  onMove,
  onChange,
  onRemove,
  onValidity,
  onInsertBlock
}: {
  block: CanvasBlock
  editing: boolean
  native: ReactNode
  index: number
  blocks: CanvasBlock[]
  onMove: (id: string, before: string | null) => void
  onChange: (block: CanvasBlock) => void
  onRemove: () => void
  onValidity: (valid: boolean) => void
  onInsertBlock?: (kind: string, anchor: DOMRect) => void
}) {
  const { t } = useTranslation('common.canvas')
  const frame = useRef<HTMLDivElement>(null)
  const grip = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const cancel = useRef<() => void>(() => {})
  useEffect(() => () => cancel.current(), [editing])

  return (
    <Stack
      ref={frame}
      className="canvas-block"
      data-canvas-block-id={block.id}
      data-width={block.width}
      data-selected={menuOpen}
      gap="sm"
      minWidth="0"
    >
      {editing && block.type !== 'document' && (
        <Box className="canvas-block-tools">
          <Button
            ref={grip}
            aria-label={t('dragBlock')}
            aria-expanded={menuOpen}
            icon="lucide:grip-vertical"
            namespace={false}
            variant="plain"
            onClick={event => {
              if (event.detail === 0) setMenuOpen(!menuOpen)
            }}
            onPointerDown={event => {
              if (!frame.current) return
              cancel.current()
              cancel.current = startBlockDrag(
                event.nativeEvent,
                frame.current,
                {
                  targets: () =>
                    Array.from(
                      frame.current?.parentElement?.querySelectorAll<HTMLElement>(
                        ':scope > [data-canvas-block-id]'
                      ) ?? []
                    ).map(element => ({
                      id: element.dataset.canvasBlockId!,
                      element
                    })),
                  commit: (id, before) =>
                    onMove(
                      block.id,
                      before
                        ? id
                        : (blocks[blocks.findIndex(item => item.id === id) + 1]
                            ?.id ?? null)
                    ),
                  click: () => setMenuOpen(open => !open)
                }
              )
            }}
            onKeyDown={event => {
              if (
                event.altKey &&
                ['ArrowUp', 'ArrowDown'].includes(event.key)
              ) {
                event.preventDefault()
                if (event.key === 'ArrowUp' && index > 0)
                  onMove(block.id, blocks[index - 1]!.id)
                if (event.key === 'ArrowDown' && index < blocks.length - 1)
                  onMove(block.id, blocks[index + 2]?.id ?? null)
              }
            }}
          />
          {menuOpen && (
            <ContextMenu
              open
              align="start"
              side="right"
              onOpenChange={open => {
                setMenuOpen(open)
                if (!open) requestAnimationFrame(() => grip.current?.focus())
              }}
              buttonComponent={
                <button
                  className="canvas-menu-anchor"
                  aria-label={t('dragBlock')}
                />
              }
              componentProps={{ menu: { minWidth: '240px' } }}
            >
              <Text color="muted" size="xs" px="md" py="sm">
                {t(`types.${block.type}`)}
              </Text>
              <ContextMenuItem
                label={t('moveUp')}
                disabled={index === 0}
                icon="lucide:arrow-up"
                namespace={false}
                onClick={() => onMove(block.id, blocks[index - 1]?.id ?? null)}
              />
              <ContextMenuItem
                label={t('moveDown')}
                disabled={index === blocks.length - 1}
                icon="lucide:arrow-down"
                namespace={false}
                onClick={() => onMove(block.id, blocks[index + 2]?.id ?? null)}
              />
              {(['full', 'half', 'third'] as const).map(width => (
                <ContextMenuItem
                  key={width}
                  checked={block.width === width}
                  label={t(`width.${width}`)}
                  icon="lucide:columns-2"
                  namespace={false}
                  onClick={() => {
                    onChange({ ...block, width })
                    requestAnimationFrame(() => settleElement(frame.current))
                  }}
                />
              ))}
              <ContextMenuItem
                label={t('removeBlock')}
                icon="lucide:trash-2"
                namespace={false}
                dangerous
                onClick={onRemove}
              />
            </ContextMenu>
          )}
        </Box>
      )}
      <CanvasBlockContent
        onInsertBlock={onInsertBlock}
        block={block}
        editing={editing}
        native={native}
        onChange={onChange}
        onValidity={onValidity}
      />
    </Stack>
  )
}
