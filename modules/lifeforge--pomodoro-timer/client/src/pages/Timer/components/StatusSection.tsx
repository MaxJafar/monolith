import _ from 'lodash'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, Icon, Text } from '@lifeforge/ui'

import { useSessionStyles } from '@/hooks/useSessionStyles'
import { useCurrentSession } from '@/providers/CurrentSessionProvider'
import { usePomodoro } from '@/providers/PomodoroProvider'

function StatusSection() {
  const timer = usePomodoro()
  const currentSession = useCurrentSession()
  const { t } = useModuleTranslation()
  const sessionStyles = useSessionStyles()

  const sessionsUntilLongBreak = currentSession
    ? currentSession.session.sessionUntilLongBreak
    : 0

  const getMessage = () => {
    if (timer.subSessionType === 'work') {
      if (!timer.isRunning) return t('timer.messages.readyToFocus')
      if (timer.isRunning) return t('timer.messages.stayFocused')

      return t('timer.messages.paused')
    }

    return t('timer.messages.takeBreak')
  }

  return (
    <>
      <Text as="p" size="lg" weight="medium">
        {t('timer.cycleCount', {
          current:
            Math.floor(
              (timer.pomodoroCount +
                (timer.subSessionType === 'long_break' ? -1 : 0)) /
                sessionsUntilLongBreak
            ) + 1
        })}
      </Text>
      <Flex
        align="center"
        gap="sm"
        pl="sm"
        pr="lg"
        py="sm"
        r="full"
        style={{
          backgroundColor: sessionStyles[timer.subSessionType].color + '15',
          border: `1px solid ${sessionStyles[timer.subSessionType].color}40`
        }}
      >
        <Box
          p="xs"
          r="full"
          style={{
            backgroundColor: sessionStyles[timer.subSessionType].color + '30'
          }}
        >
          <Icon
            icon={sessionStyles[timer.subSessionType].icon}
            style={{ color: sessionStyles[timer.subSessionType].color }}
          />
        </Box>
        <Text
          size="lg"
          style={{ color: sessionStyles[timer.subSessionType].color }}
          weight="semibold"
        >
          {t(`timer.${_.camelCase(timer.subSessionType)}`)}
        </Text>
      </Flex>
      <Text as="p" color="muted">
        {getMessage()}
      </Text>
    </>
  )
}

export default StatusSection
