import { memo } from 'react'
import type { NavigateAction } from 'react-big-calendar'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Icon, Text } from '@monolith/ui'

import { useCalendarStore } from '@/hooks/useCalendarStore'

import DateRangeLabel from './components/DateRangeLabel'

function NavigationControl({
  label,
  onNavigate
}: {
  label: string
  onNavigate: (direction: NavigateAction) => void
}) {
  const { isEventLoading } = useCalendarStore()
  const { t } = useModuleTranslation()

  return (
    <Flex align="center" minWidth="0" width="100%">
      <Flex gap="none" justify="start">
        <Button
          aria-label={t('navigation.previousPeriod')}
          icon="tabler:chevron-left"
          variant="plain"
          onClick={() => {
            onNavigate('PREV')
          }}
        />
        <Button
          aria-label={t('navigation.nextPeriod')}
          icon="tabler:chevron-right"
          variant="plain"
          onClick={() => {
            onNavigate('NEXT')
          }}
        />
      </Flex>
      <Flex align="center" gap="sm" minWidth="0">
        <Text as="div" size="2xl" weight="medium">
          <DateRangeLabel label={label} onNavigate={onNavigate} />
        </Text>
        {isEventLoading && (
          <Icon color="muted" icon="svg-spinners:ring-resize" />
        )}
      </Flex>
    </Flex>
  )
}

export default memo(NavigationControl)
