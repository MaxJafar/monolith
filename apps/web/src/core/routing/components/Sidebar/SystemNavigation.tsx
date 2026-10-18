import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { styledIcon } from '@monolith/blocks'
import {
  Box,
  Button,
  Flex,
  Stack,
  Text,
  elasticDragPreview,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData
} from '@monolith/ui'

import { RpgNavigation } from '@/addons/urpg/RpgPage'
import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import RoomsUnread from '@/core/rooms/RoomsUnread'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { useSidebarPreferences } from './SidebarPreferences'
import { moveSystemArea, systemAreas } from './systemAreas'

const dragType = 'application/x-monolith-system-area'

export default function SystemNavigation() {
  const { t } = useTranslation('common.navigation'),
    { t: shop } = useTranslation('common.module-manager')
  const { active } = useWorkspace(),
    location = useLocation(),
    appearance = useAppAppearance()

  const { preferences, update } = useSidebarPreferences()

  const [over, setOver] = useState(''),
    [announcement, setAnnouncement] = useState('')
  const rpg = active?.enabled_modules.includes('urpg')
  const order = preferences.areaOrder

  function move(from: string, to: string) {
    update({ areaOrder: moveSystemArea(order, from, to) })
    setOver('')
    setAnnouncement(shop('shop.moved', { name: t(from) }))
  }

  return (
    <>
      {rpg && <RpgNavigation />}
      <Stack aria-label={t('system')} as="nav" gap="none" px="sm" py="sm">
        {order
          .filter(
            name =>
              (!rpg || name === 'rooms') &&
              !preferences.hiddenAreas.includes(name)
          )
          .map(name => (
            <Flex
              key={name}
              draggable
              align="center"
              className="monolith-system-row"
              data-over={over === name}
              onDragEnd={() => setOver('')}
              onDragLeave={() => setOver('')}
              onDragOver={event => {
                if (hasInternalDragData(event.nativeEvent, dragType)) {
                  event.preventDefault()
                  setOver(name)
                }
              }}
              onDragStart={event => {
                setInternalDragData(event.nativeEvent, dragType, name)
                event.dataTransfer.effectAllowed = 'move'
                elasticDragPreview(
                  event.nativeEvent,
                  t(name),
                  event.currentTarget
                )
              }}
              onDrop={event => {
                const source = getInternalDragData(event.nativeEvent, dragType)

                if (source) {
                  event.preventDefault()
                  move(source, name)
                }
              }}
            >
              <Button
                draggable
                aria-current={
                  location.pathname === `/${name}` ? 'page' : undefined
                }
                as={Link}
                className="monolith-system-link"
                data-active={location.pathname === `/${name}`}
                flex="1"
                gap="sm"
                icon={
                  appearance.pages[`/${name}`]?.icon ??
                  styledIcon(
                    systemAreas[name],
                    appearance.pages[`/${name}`]?.iconSet ??
                      appearance.workspace.iconSet ??
                      appearance.global.iconSet
                  )
                }
                iconProps={{
                  preserveStyle: true,
                  style: {
                    color:
                      appearance.pages[`/${name}`]?.icons ??
                      'var(--appearance-icon-color, inherit)'
                  }
                }}
                justify="start"
                minWidth="0"
                namespace={false}
                px="sm"
                py="xs"
                to={`/${name}${active ? `?workspace=${active.id}` : ''}`}
                variant="plain"
              >
                <Text size="sm">{t(name)}</Text>
                {name === 'rooms' && <RoomsUnread />}
              </Button>
              <Button
                draggable
                aria-keyshortcuts="ArrowUp ArrowDown"
                aria-label={shop('shop.moveArea', { name: t(name) })}
                className="monolith-system-grip"
                icon="lucide:grip-vertical"
                namespace={false}
                title={shop('shop.dragHelp')}
                variant="plain"
                onKeyDown={event => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
                    return
                  event.preventDefault()
                  const target =
                    order[
                      order.indexOf(name) + (event.key === 'ArrowUp' ? -1 : 1)
                    ]

                  if (target) move(name, target)
                }}
              />
            </Flex>
          ))}
      </Stack>
      <Box className="monolith-sr-only" role="status">
        {announcement}
      </Box>
    </>
  )
}
