import { useTranslation } from 'react-i18next'

import { Button, Flex, Icon, Stack, Switch, Text } from '@monolith/ui'

import { useSidebarPreferences } from '@/core/routing/components/Sidebar/SidebarPreferences'
import {
  type Favorite,
  addFavorite,
  canAddFavorite,
  favoriteKey,
  moveFavorite,
  removeFavorite
} from '@/core/routing/components/Sidebar/favorites'
import {
  type SystemArea,
  systemAreas,
  systemOrder
} from '@/core/routing/components/Sidebar/systemAreas'

const areaKey = (id: SystemArea) => favoriteKey({ type: 'area', id })

/** Shown areas join the others; the first one returns to the top. */
function areaPosition(list: Favorite[]) {
  const last = list.reduce(
    (found, item, index) => (item.type === 'area' ? index : found),
    -1
  )
  const next = list[last + 1]

  return next ? favoriteKey(next) : null
}

export default function NativeSectionSettings() {
  const { t } = useTranslation('common.module-manager'),
    { t: nav } = useTranslation('common.navigation')

  const { preferences, update } = useSidebarPreferences()

  const pinned = preferences.favorites.flatMap(item =>
    item.type === 'area' ? [item.id] : []
  )

  return (
    <Stack gap="sm">
      <Text as="h2" size="lg" weight="semibold">
        {t('shop.nativeSections')}
      </Text>
      <Text color="muted" size="sm">
        {t('shop.dragHelp')}
      </Text>
      {systemOrder(pinned).map(area => {
        const index = pinned.indexOf(area)

        return (
          <Flex
            key={area}
            align="center"
            className="workspace-setting-row"
            gap="sm"
          >
            <Icon icon={systemAreas[area]} />
            <Stack flex="1" gap="xs">
              <Text weight="medium">{nav(area)}</Text>
              <Text color="muted" size="xs">
                {t(`shop.native.${area}`)}
              </Text>
            </Stack>
            {([-1, 1] as const).map(offset => {
              const target = index < 0 ? undefined : pinned[index + offset]

              return (
                <Button
                  key={offset}
                  aria-label={t(offset < 0 ? 'shop.moveUp' : 'shop.moveDown', {
                    name: nav(area)
                  })}
                  disabled={!target}
                  icon={offset < 0 ? 'lucide:arrow-up' : 'lucide:arrow-down'}
                  namespace={false}
                  variant="plain"
                  onClick={() => {
                    if (target)
                      update(current => ({
                        favorites: moveFavorite(
                          current.favorites,
                          areaKey(area),
                          areaKey(target)
                        )
                      }))
                  }}
                />
              )
            })}
            <Switch
              aria-label={t('shop.showArea', { name: nav(area) })}
              disabled={
                index < 0 && !canAddFavorite(preferences.favorites, 'area')
              }
              value={index >= 0}
              onChange={show =>
                update(current => ({
                  favorites: show
                    ? addFavorite(
                        current.favorites,
                        { type: 'area', id: area },
                        areaPosition(current.favorites)
                      )
                    : removeFavorite(current.favorites, areaKey(area))
                }))
              }
            />
          </Flex>
        )
      })}
    </Stack>
  )
}
