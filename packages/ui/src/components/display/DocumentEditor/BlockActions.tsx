import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ContextMenu, ContextMenuItem } from '@/components/overlays'
import { Box, Text } from '@/components/primitives'

import type { DocumentAdapter } from './adapter'

export default function BlockActions({
  adapter,
  position,
  onClose,
  onError
}: {
  adapter: DocumentAdapter
  position: { x: number; y: number }
  onClose: () => void
  onError: (cause: unknown) => void
}) {
  const { t } = useTranslation('common.documentEditor')
  const [turnInto, setTurnInto] = useState(false)
  const [colors, setColors] = useState(false)

  const paragraph =
    adapter.roots().length > 0 &&
    adapter.roots().every(model => model.flavour === 'affine:paragraph')

  function close() {
    onClose()
    requestAnimationFrame(() => adapter.host.focus({ preventScroll: true }))
  }

  return (
    <Box
      position="fixed"
      style={{ left: position.x, top: position.y }}
      zIndex="9998"
    >
      <ContextMenu
        open
        align="start"
        buttonComponent={
          <button
            aria-label={t('blockActions')}
            className="monolith-block-menu-anchor"
          />
        }
        componentProps={{
          menu: { className: 'monolith-block-menu', minWidth: '240px' }
        }}
        onOpenChange={open => {
          if (!open) close()
        }}
      >
        <Text color="muted" px="md" py="sm" size="xs">
          {t('selectedBlocks', { count: adapter.roots().length })}
        </Text>
        {paragraph && (
          <ContextMenuItem
            icon="lucide:repeat-2"
            label={t('turnInto')}
            namespace={false}
            shouldCloseMenuOnClick={false}
            onClick={() => setTurnInto(!turnInto)}
          />
        )}
        {turnInto &&
          paragraph &&
          (['text', 'h1', 'h2', 'h3', 'quote'] as const).map(type => (
            <ContextMenuItem
              key={type}
              icon={
                type === 'text'
                  ? 'lucide:type'
                  : type === 'quote'
                    ? 'lucide:quote'
                    : `lucide:heading-${type.slice(1)}`
              }
              label={t(`blocks.${type}`)}
              namespace={false}
              onClick={() => {
                adapter.setParagraphType(type)
                close()
              }}
            />
          ))}
        <ContextMenuItem
          icon="lucide:copy"
          label={t('duplicate')}
          namespace={false}
          onClick={() => {
            void adapter.duplicate().catch(onError)
            close()
          }}
        />
        <ContextMenuItem
          icon="lucide:arrow-up"
          label={t('moveUp')}
          namespace={false}
          onClick={() => {
            adapter.moveByKeyboard(-1)
            close()
          }}
        />
        <ContextMenuItem
          icon="lucide:arrow-down"
          label={t('moveDown')}
          namespace={false}
          onClick={() => {
            adapter.moveByKeyboard(1)
            close()
          }}
        />
        <Box className="monolith-block-menu-divider" />
        <ContextMenuItem
          icon="lucide:paint-bucket"
          label={t('backgroundColor')}
          namespace={false}
          shouldCloseMenuOnClick={false}
          onClick={() => setColors(!colors)}
        />
        {colors &&
          [
            ['default', ''],
            ['gray', '#787774'],
            ['brown', '#9f6b53'],
            ['orange', '#d9730d'],
            ['yellow', '#cb912f'],
            ['green', '#448361'],
            ['blue', '#337ea9'],
            ['purple', '#9065b0'],
            ['pink', '#c14c8a'],
            ['red', '#d44c47']
          ].map(([name, color]) => (
            <ContextMenuItem
              key={name}
              namespace={false}
              icon="lucide:square"
              label={t(`backgroundColors.${name}`)}
              onClick={() => {
                adapter.setBackground(color!)
                close()
              }}
            />
          ))}
        <Box className="monolith-block-menu-divider" />
        <ContextMenuItem
          dangerous
          icon="lucide:trash-2"
          label={t('delete')}
          namespace={false}
          onClick={() => {
            adapter.delete()
            close()
          }}
        />
      </ContextMenu>
    </Box>
  )
}
