import {
  Box,
  Button,
  Flex,
  Stack,
  Text,
  elasticDragPreview,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData,
  useCanvasWidgets
} from '@monolith/ui'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { useSidebarPreferences } from './SidebarPreferences'

export default function SidebarWidgets() {
  const { preferences, update } = useSidebarPreferences()
  const catalog = useCanvasWidgets()
  const { t } = useTranslation('common.workspaceUI')

  return (
    <Stack className="monolith-sidebar-widgets" gap="sm" px="sm">
      {preferences.widgets.map(widget => {
        const metadata = catalog.widgets[widget.id]

        // The character HUD is pinned above the scrollable navigation.
        if (!metadata || widget.id === 'rpgProfile') return null

        return (
          <Box
            key={widget.id}
            aria-label={metadata.title}
            as="section"
            className="monolith-sidebar-widget"
            onDragOver={event => {
              if (
                hasInternalDragData(
                  event.nativeEvent,
                  'application/x-monolith-sidebar-widget'
                )
              )
                event.preventDefault()
            }}
            onDrop={event => {
              const id = getInternalDragData(
                event.nativeEvent,
                'application/x-monolith-sidebar-widget'
              )
              const source = preferences.widgets.find(item => item.id === id)

              if (!source || id === widget.id) return
              event.preventDefault()
              event.stopPropagation()
              const list = preferences.widgets.filter(item => item.id !== id)
              list.splice(
                list.findIndex(item => item.id === widget.id),
                0,
                source
              )
              update({ widgets: list })
            }}
          >
            <Flex
              draggable
              align="center"
              className="monolith-sidebar-widget-heading"
              justify="between"
              onDragStart={event => {
                setInternalDragData(
                  event.nativeEvent,
                  'application/x-monolith-sidebar-widget',
                  widget.id
                )
                event.dataTransfer.effectAllowed = 'move'
                elasticDragPreview(
                  event.nativeEvent,
                  metadata.title,
                  event.currentTarget
                )
              }}
            >
              <Button
                aria-expanded={!widget.collapsed}
                icon="lucide:chevron-right"
                className="monolith-disclosure"
                justify="start"
                namespace={false}
                variant="plain"
                onClick={() =>
                  update({
                    widgets: preferences.widgets.map(item =>
                      item.id === widget.id
                        ? { ...item, collapsed: !item.collapsed }
                        : item
                    )
                  })
                }
              >
                <Text truncate size="xs" weight="medium">
                  {metadata.title}
                </Text>
              </Button>
              <Button
                aria-label={t('removeWidget', { name: metadata.title })}
                icon="lucide:x"
                namespace={false}
                variant="plain"
                onClick={() =>
                  update({
                    widgets: preferences.widgets.filter(
                      item => item.id !== widget.id
                    )
                  })
                }
              />
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
                        update({
                          widgets: preferences.widgets.map(item =>
                            item.id === widget.id ? { ...item, filter } : item
                          )
                        })
                    })}
                  </Box>
                </ErrorBoundary>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
