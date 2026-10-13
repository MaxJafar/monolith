import { useTranslation } from 'react-i18next'

import type { CanvasBlock } from '@lifeforge/blocks'

import { Button } from '@/components/inputs'
import { Flex, Stack, Text } from '@/components/primitives'

import { useCanvasWidgets } from './CanvasWidgets'
import { newCanvasBlock } from './defaults'

export function CanvasBlockMenu({
  onAdd,
  allowNative
}: {
  onAdd: (block: CanvasBlock) => void
  allowNative: boolean
}) {
  const { t } = useTranslation('common.canvas')
  const { widgets, databases = [] } = useCanvasWidgets()

  return (
    <Stack
      aria-label={t('addBlock')}
      className="canvas-block-menu"
      gap="md"
      p="md"
      role="region"
    >
      <Flex gap="sm" wrap="wrap">
        {(
          [
            'document',
            'heading',
            'callout',
            'button',
            'divider',
            ...(allowNative ? (['native'] as const) : [])
          ] as const
        ).map(type => (
          <Button
            key={type}
            namespace={false}
            variant="secondary"
            onClick={() =>
              onAdd(
                newCanvasBlock(type, {
                  title: type === 'button' ? t('newButton') : '',
                  url: type === 'button' ? '/dashboard' : ''
                })
              )
            }
          >
            {t(`types.${type}`)}
          </Button>
        ))}
      </Flex>
      <Text weight="semibold">{t('types.database')}</Text>
      <Flex direction="column" gap="xs">
        {databases.map(database => (
          <Button
            key={database.id}
            icon="lucide:database"
            justify="start"
            namespace={false}
            variant="plain"
            onClick={() =>
              onAdd(
                newCanvasBlock('database', {
                  title: database.name,
                  database: {
                    workspaceId: database.workspaceId,
                    baseId: database.id,
                    ...(database.views[0]
                      ? { viewId: database.views[0].id }
                      : {})
                  }
                })
              )
            }
          >
            {database.name}
          </Button>
        ))}
        {!databases.length && (
          <Text color="muted" size="sm">
            {t('noDatabases')}
          </Text>
        )}
      </Flex>
      <Text weight="semibold">{t('liveBlocks')}</Text>
      <Flex gap="sm" wrap="wrap">
        {Object.entries(widgets)
          .filter(([id]) => id !== 'linkedDatabase')
          .map(([id, widget]) => (
            <Button
              key={id}
              icon={widget.icon}
              namespace={false}
              variant="secondary"
              onClick={() =>
                onAdd(
                  newCanvasBlock('widget', { widget: id, title: widget.title })
                )
              }
            >
              {widget.title}
            </Button>
          ))}
      </Flex>
    </Stack>
  )
}
