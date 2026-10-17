import { type CanvasBlock, canvasLink } from '@monolith/blocks'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/inputs'
import { PopoverButton } from '@/components/overlays/PopoverButton'
import { Box, Stack, Text } from '@/components/primitives'

import { useCanvasWidgets } from './CanvasWidgets'
import { CanvasDocumentBlock } from './DocumentBlock'

export function CanvasBlockContent({
  block,
  editing,
  native,
  onChange,
  onValidity,
  onInsertBlock
}: {
  block: CanvasBlock
  editing: boolean
  native: ReactNode
  onChange: (block: CanvasBlock) => void
  onValidity: (valid: boolean) => void
  onInsertBlock?: (kind: string, anchor: DOMRect) => void
}) {
  const { t } = useTranslation('common.canvas')
  const { render, widgets } = useCanvasWidgets()

  const update = (field: 'title' | 'content' | 'url', value: string) =>
    onChange({ ...block, [field]: value })

  if (block.type === 'native')
    return (
      <Stack gap="sm">
        <Box className="canvas-native" minWidth="0">
          {native}
        </Box>
      </Stack>
    )
  if (block.type === 'divider')
    return <Box className="canvas-divider" width="100%" />
  if (block.type === 'database')
    return (
      <Stack gap="sm" minWidth="0">
        {render('linkedDatabase', {
          filter: JSON.stringify(block.database),
          onViewChange: editing
            ? viewId =>
                onChange({ ...block, database: { ...block.database!, viewId } })
            : undefined,
          onHeightChange: editing
            ? height =>
                onChange({ ...block, database: { ...block.database!, height } })
            : undefined
        })}
      </Stack>
    )
  if (block.type === 'document')
    return (
      <CanvasDocumentBlock
        onInsertBlock={onInsertBlock}
        block={block}
        editing={editing}
        onChange={onChange}
        onValidity={onValidity}
      />
    )
  if (block.type === 'widget')
    return (
      <Stack className="canvas-widget" gap="md" minWidth="0">
        {block.title &&
          (editing ? (
            <Box
              aria-label={t('blockTitle')}
              as="input"
              className="canvas-inline-block-title"
              value={block.title}
              onChange={event => update('title', event.target.value)}
            />
          ) : (
            <Text as="h2">{block.title}</Text>
          ))}
        {render(block.widget, { filter: block.content })}
        {editing && widgets[block.widget]?.filterable && (
          <PopoverButton label={t('filter')} icon="lucide:list-filter">
            <input
              aria-label={t('filter')}
              value={block.content}
              onChange={event => update('content', event.target.value)}
            />
          </PopoverButton>
        )}
      </Stack>
    )
  if (editing && block.type === 'heading')
    return (
      <Box
        aria-label={t('blockTitle')}
        as="input"
        className="canvas-inline-block-title"
        placeholder={t('types.heading')}
        value={block.title}
        onChange={event => update('title', event.target.value)}
      />
    )
  if (editing && block.type === 'callout')
    return (
      <Stack className="canvas-callout" gap="sm" p="md">
        <Box
          aria-label={t('blockTitle')}
          as="input"
          className="canvas-inline-block-title"
          value={block.title}
          onChange={event => update('title', event.target.value)}
        />
        <Box
          aria-label={t('content')}
          as="textarea"
          className="canvas-inline-text"
          value={block.content}
          onChange={event => update('content', event.target.value)}
        />
      </Stack>
    )
  if (editing && block.type === 'button')
    return (
      <Stack gap="sm">
        {canvasLink(block.url) &&
          (block.url.startsWith('/') ? (
            <Button
              as={Link}
              icon="lucide:arrow-up-right"
              iconPosition="end"
              justify="between"
              namespace={false}
              to={block.url}
              variant="secondary"
            >
              {block.title || block.url}
            </Button>
          ) : (
            <Button
              as="a"
              href={block.url}
              icon="lucide:external-link"
              iconPosition="end"
              namespace={false}
              rel="noopener noreferrer"
              target="_blank"
              variant="secondary"
            >
              {block.title || block.url}
            </Button>
          ))}
        <PopoverButton label={t('linkSettings')} icon="lucide:link">
          <label>
            {t('blockTitle')}
            <input
              value={block.title}
              onChange={event => update('title', event.target.value)}
            />
          </label>
          <label>
            {t('buttonUrl')}
            <input
              value={block.url}
              onChange={event => update('url', event.target.value)}
            />
          </label>
        </PopoverButton>
      </Stack>
    )
  if (block.type === 'heading') return <Text as="h2">{block.title}</Text>
  if (block.type === 'callout')
    return (
      <Stack className="canvas-callout" gap="sm" p="md">
        <Text weight="semibold">{block.title}</Text>
        <Text whiteSpace="pre-wrap">{block.content}</Text>
      </Stack>
    )
  if (!canvasLink(block.url))
    return <Text color="dangerous">{t('unsafeLink')}</Text>

  return block.url.startsWith('/') ? (
    <Button
      as={Link}
      icon="lucide:arrow-up-right"
      iconPosition="end"
      justify="between"
      namespace={false}
      to={block.url}
      variant="secondary"
      width="100%"
    >
      {block.title || block.url}
    </Button>
  ) : (
    <Button
      as="a"
      href={block.url}
      icon="lucide:external-link"
      iconPosition="end"
      justify="between"
      namespace={false}
      rel="noopener noreferrer"
      target="_blank"
      variant="secondary"
      width="100%"
    >
      {block.title || block.url}
    </Button>
  )
}
