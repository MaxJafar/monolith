import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CanvasBlock } from '@lifeforge/blocks'

import { Button } from '@/components/inputs'
import { Box, Flex, Icon, Stack, Text } from '@/components/primitives'

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
  onValidity
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
}) {
  const { t } = useTranslation('common.canvas')

  return (
    <Stack
      className="canvas-block"
      data-width={block.width}
      gap="sm"
      minWidth="0"
      onDragOver={event => {
        if (editing) event.preventDefault()
      }}
      onDrop={event => {
        event.preventDefault()
        if (editing)
          onMove(
            event.dataTransfer.getData('application/x-monolith-block'),
            block.id
          )
      }}
    >
      {editing && (
        <Box as="details" className="canvas-block-tools">
          <summary
            draggable
            aria-label={t('dragBlock')}
            onDragStart={event =>
              event.dataTransfer.setData(
                'application/x-monolith-block',
                block.id
              )
            }
          >
            <Icon icon="lucide:grip-vertical" />
          </summary>
          <Flex
            align="center"
            className="canvas-block-actions"
            gap="xs"
            wrap="wrap"
          >
            <Box
              draggable
              aria-label={t('dragBlock')}
              as="button"
              className="canvas-drag-handle"
              onDragStart={event =>
                event.dataTransfer.setData(
                  'application/x-monolith-block',
                  block.id
                )
              }
            >
              <Icon icon="lucide:grip-vertical" />
            </Box>
            <Text color="muted" size="sm">
              {t(`types.${block.type}`)}
            </Text>
            <Button
              aria-label={t('moveUp')}
              disabled={index === 0}
              icon="lucide:arrow-up"
              variant="plain"
              onClick={() => onMove(block.id, blocks[index - 1]?.id ?? null)}
            />
            <Button
              aria-label={t('moveDown')}
              disabled={index === blocks.length - 1}
              icon="lucide:arrow-down"
              variant="plain"
              onClick={() => onMove(block.id, blocks[index + 2]?.id ?? null)}
            />
            {(['full', 'half', 'third'] as const).map(width => (
              <Button
                key={width}
                aria-pressed={block.width === width}
                namespace={false}
                variant={block.width === width ? 'primary' : 'plain'}
                onClick={() => onChange({ ...block, width })}
              >
                {t(`width.${width}`)}
              </Button>
            ))}
            <Button
              aria-label={t('removeBlock')}
              icon="lucide:x"
              variant="plain"
              onClick={onRemove}
            />
          </Flex>
        </Box>
      )}
      <CanvasBlockContent
        block={block}
        editing={editing}
        native={native}
        onChange={onChange}
        onValidity={onValidity}
      />
    </Stack>
  )
}
