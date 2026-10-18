import { Text as EditorText } from '@blocksuite/store'
import { useTranslation } from 'react-i18next'

import { ContextMenu, ContextMenuItem } from '@/components/overlays'
import { Box, Text } from '@/components/primitives'

import type { DocumentAdapter } from './adapter'

const blocks = [
  ['text', 'lucide:type', 'affine:paragraph', 'text'],
  ['h1', 'lucide:heading-1', 'affine:paragraph', 'h1'],
  ['h2', 'lucide:heading-2', 'affine:paragraph', 'h2'],
  ['h3', 'lucide:heading-3', 'affine:paragraph', 'h3'],
  ['bullet', 'lucide:list', 'affine:list', 'bulleted'],
  ['number', 'lucide:list-ordered', 'affine:list', 'numbered'],
  ['todo', 'lucide:square-check', 'affine:list', 'todo'],
  ['toggle', 'lucide:chevron-right', 'affine:list', 'toggle'],
  ['callout', 'lucide:lightbulb', 'affine:callout', ''],
  ['quote', 'lucide:quote', 'affine:paragraph', 'quote'],
  ['code', 'lucide:code', 'affine:code', ''],
  ['divider', 'lucide:minus', 'affine:divider', '']
] as const

export default function InsertBlockMenu({
  adapter
}: {
  adapter?: DocumentAdapter
}) {
  const { t } = useTranslation('common.documentEditor')

  return (
    <ContextMenu
      align="start"
      componentProps={{
        button: {
          icon: 'lucide:plus',
          children: t('addBlock'),
          'aria-label': t('addBlock'),
          namespace: false,
          disabled: !adapter,
          className: 'monolith-editor-insert'
        },
        menu: { className: 'monolith-block-menu', minWidth: '240px' }
      }}
    >
      <Text color="muted" px="md" py="sm" size="xs">
        {t('basicBlocks')}
      </Text>
      {blocks.map(([name, icon, flavour, type]) => (
        <ContextMenuItem
          key={name}
          icon={icon}
          label={t(`blocks.${name}`)}
          namespace={false}
          onClick={() => {
            const id = adapter?.insert(
              flavour,
              flavour === 'affine:divider' || flavour === 'affine:callout'
                ? {}
                : { text: new EditorText(''), ...(type ? { type } : {}) }
            )

            if (id)
              requestAnimationFrame(() => {
                const block = Array.from(
                  adapter!.host.querySelectorAll<HTMLElement>('[data-block-id]')
                ).find(element => element.dataset.blockId === id)
                block?.scrollIntoView({ block: 'nearest' })
                const input = block?.querySelector<HTMLElement>(
                  '[contenteditable="true"]'
                )
                input?.focus({ preventScroll: true })
              })
          }}
        />
      ))}
      <Box className="monolith-block-menu-divider" />
      {([2, 3] as const).map(count => (
        <ContextMenuItem
          key={count}
          icon="lucide:columns-2"
          label={t('columns', { count })}
          namespace={false}
          onClick={() => {
            const note = adapter?.store.root?.children.find(
              model => model.flavour === 'affine:note'
            )

            if (note) adapter?.addColumns(count, note.id)
          }}
        />
      ))}
    </ContextMenu>
  )
}
