import { useTranslation } from 'react-i18next'

import { Button, Flex, Icon, Stack, Switch, Text } from '@monolith/ui'

import { useSidebarPreferences } from '@/core/routing/components/Sidebar/SidebarPreferences'
import {
  moveSystemArea,
  systemAreas
} from '@/core/routing/components/Sidebar/systemAreas'

export default function NativeSectionSettings() {
  const { t } = useTranslation('common.module-manager'),
    { t: nav } = useTranslation('common.navigation')
  const { preferences, update } = useSidebarPreferences()
  return (
    <Stack gap="sm">
      <Text as="h2" size="lg" weight="semibold">
        {t('shop.nativeSections')}
      </Text>
      <Text color="muted" size="sm">
        {t('shop.dragHelp')}
      </Text>
      {preferences.areaOrder.map((area, index, order) => (
        <Flex
          key={area}
          align="center"
          gap="sm"
          className="workspace-setting-row"
        >
          <Icon icon={systemAreas[area]} />
          <Stack flex="1" gap="xs">
            <Text weight="medium">{nav(area)}</Text>
            <Text size="xs" color="muted">
              {t(`shop.native.${area}`)}
            </Text>
          </Stack>
          {([-1, 1] as const).map(offset => (
            <Button
              key={offset}
              namespace={false}
              variant="plain"
              icon={offset < 0 ? 'lucide:arrow-up' : 'lucide:arrow-down'}
              aria-label={t(offset < 0 ? 'shop.moveUp' : 'shop.moveDown', {
                name: nav(area)
              })}
              disabled={!order[index + offset]}
              onClick={() =>
                update({
                  areaOrder: moveSystemArea(order, area, order[index + offset]!)
                })
              }
            />
          ))}
          <Switch
            aria-label={t('shop.showArea', { name: nav(area) })}
            value={!preferences.hiddenAreas.includes(area)}
            onChange={show =>
              update({
                hiddenAreas: show
                  ? preferences.hiddenAreas.filter(id => id !== area)
                  : [...preferences.hiddenAreas, area]
              })
            }
          />
        </Flex>
      ))}
    </Stack>
  )
}
