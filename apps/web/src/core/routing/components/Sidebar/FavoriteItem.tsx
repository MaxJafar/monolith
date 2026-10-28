import type { DragEvent, KeyboardEvent } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  Box,
  Button,
  Flex,
  Text,
  elasticDragPreview,
  setInternalDragData,
  useCanvasWidgets
} from '@monolith/ui'

import RoomsUnread from '@/core/rooms/RoomsUnread'

import { useSidebarPreferences } from './SidebarPreferences'
import { type FavoriteWidget, updateWidgetFavorite } from './favorites'
import type { FavoriteEntry } from './useFavoriteCatalog'

export const favoriteDragType = 'application/x-monolith-favorite'

export type FavoriteItemProps = {
  entry: FavoriteEntry
  /** Where a drop on this item would land. */
  drop: 'before' | 'after' | null
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

function startDrag(event: DragEvent<HTMLElement>, entry: FavoriteEntry) {
  setInternalDragData(event.nativeEvent, favoriteDragType, entry.key)
  event.dataTransfer.effectAllowed = 'move'
  elasticDragPreview(event.nativeEvent, entry.label, event.currentTarget)
}

/** Grip (drag handle with ↑/↓ keys) and remove action shared by every item. */
function FavoriteControls({
  entry,
  onMove,
  onRemove
}: Pick<FavoriteItemProps, 'entry' | 'onMove' | 'onRemove'>) {
  const { t } = useTranslation('common.navigation'),
    { t: shop } = useTranslation('common.module-manager')

  return (
    <Flex className="monolith-favorite-controls" gap="none">
      <Button
        draggable
        aria-keyshortcuts="ArrowUp ArrowDown"
        aria-label={shop('shop.moveArea', { name: entry.label })}
        className="monolith-system-grip"
        icon="lucide:grip-vertical"
        namespace={false}
        title={shop('shop.dragHelp')}
        variant="plain"
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          onMove(event.key === 'ArrowUp' ? -1 : 1)
        }}
      />
      <Button
        aria-label={t('favorites.remove', { name: entry.label })}
        className="monolith-favorite-remove"
        icon="lucide:x"
        namespace={false}
        title={t('favorites.removeItem')}
        variant="plain"
        onClick={onRemove}
      />
    </Flex>
  )
}

function FavoriteLink({
  entry,
  drop,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
  onRemove
}: FavoriteItemProps) {
  return (
    <Flex
      draggable
      align="center"
      as="li"
      className="monolith-system-row"
      data-drop={drop ?? undefined}
      data-favorite={entry.key}
      onDragEnd={onDragLeave}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={event => startDrag(event, entry)}
      onDrop={onDrop}
    >
      <Button
        draggable
        aria-current={entry.active ? 'page' : undefined}
        as={Link}
        className="monolith-system-link"
        data-active={entry.active}
        flex="1"
        gap="sm"
        icon={entry.icon}
        iconProps={{
          preserveStyle: true,
          style: {
            color: entry.color ?? 'var(--appearance-icon-color, inherit)'
          }
        }}
        justify="start"
        minWidth="0"
        namespace={false}
        px="sm"
        py="xs"
        to={entry.href ?? '/'}
        variant="plain"
      >
        <Text truncate size="sm">
          {entry.label}
        </Text>
        {entry.favorite.type === 'area' && entry.favorite.id === 'rooms' && (
          <RoomsUnread />
        )}
      </Button>
      <FavoriteControls entry={entry} onMove={onMove} onRemove={onRemove} />
    </Flex>
  )
}

function FavoriteWidgetItem({
  entry,
  widget,
  drop,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
  onRemove
}: FavoriteItemProps & { widget: FavoriteWidget }) {
  const { update } = useSidebarPreferences()
  const catalog = useCanvasWidgets()
  const { t } = useTranslation('common.workspaceUI')

  return (
    <Box
      as="li"
      className="monolith-favorite-widget"
      data-drop={drop ?? undefined}
      data-favorite={entry.key}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Box
        aria-label={entry.label}
        as="section"
        className="monolith-sidebar-widget"
      >
        <Flex
          draggable
          align="center"
          className="monolith-sidebar-widget-heading"
          justify="between"
          onDragEnd={onDragLeave}
          onDragStart={event => startDrag(event, entry)}
        >
          <Button
            aria-expanded={!widget.collapsed}
            className="monolith-disclosure"
            icon="lucide:chevron-right"
            justify="start"
            namespace={false}
            variant="plain"
            onClick={() =>
              update(current => ({
                favorites: updateWidgetFavorite(current.favorites, widget.id, {
                  collapsed: !widget.collapsed
                })
              }))
            }
          >
            <Text truncate size="xs" weight="medium">
              {entry.label}
            </Text>
          </Button>
          <FavoriteControls entry={entry} onMove={onMove} onRemove={onRemove} />
        </Flex>
        <Box
          aria-hidden={widget.collapsed}
          className="monolith-nav-reveal"
          data-open={!widget.collapsed}
          inert={widget.collapsed}
        >
          <Box>
            <ErrorBoundary
              fallback={
                <Text color="muted" size="sm">
                  {t('widgetError')}
                </Text>
              }
            >
              <Box className="monolith-sidebar-widget-body" p="sm">
                {catalog.render(widget.id, {
                  filter: widget.filter,
                  onConfigChange: filter =>
                    update(current => ({
                      favorites: updateWidgetFavorite(
                        current.favorites,
                        widget.id,
                        { filter }
                      )
                    }))
                })}
              </Box>
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default function FavoriteItem(props: FavoriteItemProps) {
  const { favorite } = props.entry

  return favorite.type === 'widget' ? (
    <FavoriteWidgetItem {...props} widget={favorite} />
  ) : (
    <FavoriteLink {...props} />
  )
}
