import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Text } from '@monolith/ui'

import type { BoardGroup } from '@/utils/board'
import { colorStyle } from '@/utils/recordColors'

import type { useBoardLayout } from './useBoardLayout'

export function BoardColumnHeader({
  group,
  columnKey,
  color,
  count,
  layout,
  disabled,
  onCreate
}: {
  group: BoardGroup
  columnKey: string
  color?: string
  count: number
  layout: ReturnType<typeof useBoardLayout>
  disabled: boolean
  onCreate?: () => void
}) {
  const { t } = useModuleTranslation()
  return (
    <Flex
      className="database-board-heading"
      align="center"
      gap="xs"
      style={colorStyle(color)}
    >
      <button
        type="button"
        className="database-board-column-grip"
        disabled={disabled}
        draggable={!disabled}
        aria-label={t('dragColumn', { group: group.label })}
        title={t('dragColumnHelp')}
        onDragStart={event => layout.start(event, columnKey, group.label)}
        onDragEnd={layout.cancel}
        onKeyDown={event => {
          if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key))
            return
          event.preventDefault()
          event.stopPropagation()
          layout.shift(
            columnKey,
            event.key === 'ArrowLeft' ? -1 : 1,
            event.currentTarget
          )
        }}
      >
        <Icon icon="lucide:grip-vertical" size="14px" />
      </button>
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:chevron-down"
        aria-label={t('collapseColumn', { group: group.label })}
        aria-expanded
        data-board-group-toggle={columnKey}
        disabled={disabled}
        onClick={() => layout.toggleColumn(columnKey)}
      />
      <span
        className="database-tag database-status-tag database-board-column-label"
        title={group.label}
        style={{
          background: color
            ? `color-mix(in srgb, ${color} 65%, var(--bg-surface))`
            : 'var(--bg-lifted)'
        }}
      >
        <span
          className="database-tag-dot"
          style={{ background: color ?? 'var(--text-muted)' }}
        />
        <span>{group.label}</span>
      </span>
      <Text size="xs" color="muted">
        {count}
      </Text>
      <Flex flex="1" />
      {onCreate && (
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:plus"
          aria-label={t('addToGroup', { group: group.label })}
          disabled={disabled}
          onClick={onCreate}
        />
      )}
      <button
        type="button"
        className="database-board-column-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('resizeColumn', { group: group.label })}
        aria-valuemin={240}
        aria-valuemax={640}
        aria-valuenow={layout.width(columnKey)}
        title={t('resizeColumnHelp')}
        disabled={disabled}
        {...layout.resizeProps(columnKey)}
        onDoubleClick={event =>
          layout.resizeKey(columnKey, 280, event.currentTarget)
        }
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
            return
          event.preventDefault()
          event.stopPropagation()
          const next =
            event.key === 'Home'
              ? 240
              : event.key === 'End'
                ? 640
                : layout.width(columnKey) +
                  (event.key === 'ArrowLeft' ? -20 : 20)
          layout.resizeKey(columnKey, next, event.currentTarget)
        }}
      />
    </Flex>
  )
}
