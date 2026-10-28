import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Flex,
  FloatingPopover,
  Icon,
  Stack,
  Text,
  useCanvasWidgets
} from '@monolith/ui'

import WidgetOptions from '@/core/overlays/WidgetOptions'
import { useSidebarPreferences } from '@/core/routing/components/Sidebar/SidebarPreferences'
import {
  addFavorite,
  canAddFavorite,
  favoriteKey,
  findWidgetFavorite,
  removeFavorite,
  updateWidgetFavorite
} from '@/core/routing/components/Sidebar/favorites'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { addonSlug } from '../filters'

export default function WidgetPicker({
  moduleId,
  widgetId,
  sidebar = false
}: {
  moduleId?: string
  widgetId?: string
  sidebar?: boolean
}) {
  const catalog = useCanvasWidgets(),
    { active } = useWorkspace(),
    { preferences, update, error } = useSidebarPreferences()
  const { t } = useTranslation('common.module-manager')
  const [anchor, setAnchor] = useState<HTMLElement | null>(null),
    [selected, setSelected] = useState(widgetId ?? ''),
    [filter, setFilter] = useState('')
  const widgets = Object.entries(catalog.widgets).filter(([id, widget]) =>
    widgetId
      ? id === widgetId
      : addonSlug(widget.module ?? '') === addonSlug(moduleId ?? '')
  )
  const id = selected || widgets[0]?.[0],
    widget = id ? catalog.widgets[id] : undefined
  const placed = id ? findWidgetFavorite(preferences.favorites, id) : undefined
  const editable = !!active && active.role !== 'viewer'
  return (
    <>
      <Button
        namespace={false}
        variant="secondary"
        icon="lucide:sliders-horizontal"
        onClick={event => {
          setFilter(placed?.filter ?? '')
          setAnchor(event.currentTarget)
        }}
        disabled={!widgets.length}
      >
        {t('shop.configureWidget')}
      </Button>
      {error && (
        <Text role="alert" size="xs" color="dangerous">
          {t('common.workspaceUI:storageError')}
        </Text>
      )}
      {anchor && widget && id && (
        <FloatingPopover
          anchor={anchor}
          label={widget.title}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="md" className="shop-widget-popover">
            <Flex align="center" gap="sm">
              <Icon icon={widget.icon} />
              <Text weight="semibold">{widget.title}</Text>
            </Flex>
            {widgets.length > 1 && (
              <Flex gap="xs" wrap="wrap">
                {widgets.map(([key, item]) => (
                  <Button
                    key={key}
                    namespace={false}
                    variant="plain"
                    aria-pressed={id === key}
                    onClick={() => {
                      setSelected(key)
                      setFilter('')
                    }}
                  >
                    {item.title}
                  </Button>
                ))}
              </Flex>
            )}
            <WidgetOptions
              key={id}
              id={id}
              filter={filter}
              onChange={setFilter}
            />
            <Text size="xs" color="muted">
              {t('shop.livePreview')}
            </Text>
            <Stack className="shop-widget-preview" p="md" r="md">
              {catalog.render(id, {
                filter,
                readOnly: !editable,
                onConfigChange: setFilter
              })}
            </Stack>
            <Flex gap="sm" wrap="wrap">
              <Button
                namespace={false}
                icon="lucide:plus"
                disabled={!editable || !catalog.addToDashboard}
                onClick={() => {
                  catalog.addToDashboard?.(id, filter)
                  setAnchor(null)
                }}
              >
                {t('shop.addDashboard')}
              </Button>
              <Button
                namespace={false}
                variant="secondary"
                icon="lucide:panel-left"
                disabled={
                  !placed && !canAddFavorite(preferences.favorites, 'widget')
                }
                onClick={() => {
                  update(current => ({
                    favorites: findWidgetFavorite(current.favorites, id)
                      ? updateWidgetFavorite(current.favorites, id, { filter })
                      : addFavorite(current.favorites, {
                          type: 'widget',
                          id,
                          collapsed: false,
                          filter
                        })
                  }))
                  setAnchor(null)
                }}
              >
                {t(placed ? 'shop.saveSidebar' : 'shop.addSidebar')}
              </Button>
            </Flex>
            {sidebar && placed && (
              <Button
                namespace={false}
                variant="plain"
                onClick={() => {
                  update(current => ({
                    favorites: removeFavorite(
                      current.favorites,
                      favoriteKey({ type: 'widget', id })
                    )
                  }))
                  setAnchor(null)
                }}
              >
                {t('shop.removeSidebar')}
              </Button>
            )}
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
