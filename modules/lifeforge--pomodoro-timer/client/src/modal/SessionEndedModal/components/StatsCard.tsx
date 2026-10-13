import type { Session } from '@'

import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Text, Widget, surface } from '@lifeforge/ui'

import { useSessionStyles } from '@/hooks/useSessionStyles'

import DurationText from './DurationText'

function StatsCard({
  session,
  breakTime
}: {
  session: Session
  breakTime?: number
}) {
  const { t } = useModuleTranslation()
  const sessionStyles = useSessionStyles()

  return (
    <Flex align="center" gap="md" minWidth="0" mt="md" width="100%" wrap="wrap">
      <Widget
        bg={surface.light}
        flex="1"
        flexShrink="0"
        icon={sessionStyles.work.icon}
        minWidth="min-content"
        namespace={false}
        title={t('timer.pomodoroCompleted')}
        variant="large-icon"
        width="100%"
      >
        <Text size="4xl" weight="semibold">
          {session.pomodoroCount}
        </Text>
      </Widget>
      <Widget
        bg={surface.light}
        flex="1"
        flexShrink="0"
        icon="tabler:clock"
        minWidth="min-content"
        namespace={false}
        title={t('timer.focusTime')}
        variant="large-icon"
        width="100%"
      >
        <DurationText seconds={session.totalTimeElapsed as number} />
      </Widget>
      <Widget
        bg={surface.light}
        flex="1"
        flexShrink="0"
        icon={sessionStyles.short_break.icon}
        minWidth="min-content"
        namespace={false}
        title={t('timer.breakTime')}
        variant="large-icon"
        width="100%"
      >
        <DurationText seconds={breakTime || 0} />
      </Widget>
    </Flex>
  )
}

export default StatsCard
