import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Card,
  Flex,
  Icon,
  Stack,
  Switch,
  Text,
  Transition,
  colorWithOpacity,
  surface,
  usePersonalization
} from '@lifeforge/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'
import { addDashboardWidget } from '@/system/dashboard/utils/layout'

function ComponentListItem({
  id,
  icon,
  minW,
  minH,
  maxW,
  maxH,
  moduleName
}: {
  id: string
  icon: string
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  moduleName?: string
}) {
  const { t } = useTranslation(`apps.${moduleName}`)
  const { dashboardLayout: enabledWidgets } = usePersonalization()
  const { changeDashboardLayout: setDashboardLayout } = useUserPersonalization()

  const isEnabled = useMemo(() => {
    return Object.values(enabledWidgets).some(widgets =>
      widgets.some(widget => widget.i === id)
    )
  }, [enabledWidgets, id])

  function addComponent() {
    void setDashboardLayout(
      addDashboardWidget(enabledWidgets, id, { minW, minH, maxW, maxH })
    )
  }

  function removeComponent() {
    const newEnabledWidgets = Object.fromEntries(
      Object.entries(enabledWidgets).map(([k, value]) => [
        k,
        value.filter(i => i.i !== id)
      ])
    )

    if (Object.values(newEnabledWidgets).every(e => e.length === 0)) {
      setDashboardLayout({})
    } else {
      setDashboardLayout(newEnabledWidgets)
    }
  }

  function toggleComponent() {
    if (isEnabled) {
      removeComponent()

      return
    }

    addComponent()
  }

  return (
    <Card
      shadow
      align={{ base: 'start', sm: 'center' }}
      as="li"
      bg={surface.light}
      direction={{ base: 'column', sm: 'row' }}
      gap="md"
      justify="between"
      onClick={toggleComponent}
    >
      <Transition>
        <Flex
          centered
          bg={
            isEnabled
              ? colorWithOpacity('custom-500', '10%')
              : {
                  base: 'bg-200',
                  dark: colorWithOpacity('bg-700', '50%')
                }
          }
          flexShrink="0"
          height="3em"
          r="lg"
          width="3em"
        >
          <Icon
            color={isEnabled ? 'custom-500' : 'bg-500'}
            icon={icon}
            size="1.5em"
          />
        </Flex>
      </Transition>
      <Flex align="center" gap="md" justify="between" width="100%">
        <Stack gap="none">
          <Text as="h3" weight="semibold">
            {t([`widgets.${id}.title`, `widgets.${id}`, id])}
          </Text>
          <Text color="muted" size="sm">
            {t([`widgets.${id}.description`])}
          </Text>
        </Stack>
        <Box
          position={{ base: 'absolute', sm: 'static' }}
          right="1em"
          top="1.75em"
          onClick={event => event.stopPropagation()}
        >
          <Switch
            aria-label={t([`widgets.${id}.title`, `widgets.${id}`, id])}
            value={isEnabled}
            onChange={() => {
              toggleComponent()
            }}
          />
        </Box>
      </Flex>
    </Card>
  )
}

export default ComponentListItem
