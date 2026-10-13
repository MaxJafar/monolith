import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, Text } from '@lifeforge/ui'

import { useSessionStyles } from '@/hooks/useSessionStyles'
import { useCurrentSession } from '@/providers/CurrentSessionProvider'
import { usePomodoro } from '@/providers/PomodoroProvider'

import useProgress from '../hooks/useProgress'

function ProgressBars() {
  const currentSession = useCurrentSession()
  const timer = usePomodoro()
  const progress = useProgress()
  const { t } = useModuleTranslation()
  const sessionStyles = useSessionStyles()

  const currentPomodoroInCycle = currentSession
    ? timer.pomodoroCount % currentSession.session.sessionUntilLongBreak
    : 0

  if (!currentSession) {
    return null
  }

  return (
    <>
      <Flex align="center" gap="xs" maxWidth="28rem" width="100%">
        {Array.from({
          length: currentSession.session.sessionUntilLongBreak * 2
        }).map((_, i) => {
          const isWorkSegment = i % 2 === 0

          const workIndex = Math.floor(i / 2)

          const restIndex = Math.floor(i / 2)

          if (isWorkSegment) {
            const isCompleted =
              workIndex < currentPomodoroInCycle ||
              timer.subSessionType === 'long_break'

            const isCurrent =
              workIndex === currentPomodoroInCycle &&
              timer.subSessionType === 'work'

            const segmentProgress = isCurrent ? progress : 0

            return (
              <Box
                key={i}
                bg={{ base: 'bg-200', dark: 'bg-800' }}
                flex="2"
                height="0.5rem"
                overflow="hidden"
                position="relative"
                r="full"
              >
                <Box
                  bottom="0"
                  left="0"
                  position="absolute"
                  r="full"
                  style={{
                    width: isCompleted ? '100%' : `${segmentProgress}%`,
                    backgroundColor: sessionStyles.work.color,
                    transition: 'all 300ms'
                  }}
                  top="0"
                />
              </Box>
            )
          }

          const isLongBreak =
            restIndex === currentSession.session.sessionUntilLongBreak - 1

          const breakType = isLongBreak ? 'long_break' : 'short_break'

          const adjustedRestIndex =
            (currentPomodoroInCycle -
              1 +
              currentSession.session.sessionUntilLongBreak) %
            currentSession.session.sessionUntilLongBreak

          const isRestCompleted =
            timer.subSessionType === 'work'
              ? restIndex < currentPomodoroInCycle
              : restIndex < adjustedRestIndex

          const isRestCurrent =
            restIndex === adjustedRestIndex && timer.subSessionType !== 'work'

          const segmentProgress = isRestCurrent ? progress : 0

          return (
            <Box
              key={i}
              bg={{ base: 'bg-200', dark: 'bg-800' }}
              flex="1"
              height="0.5rem"
              overflow="hidden"
              position="relative"
              r="full"
            >
              <Box
                bottom="0"
                left="0"
                position="absolute"
                r="full"
                style={{
                  width: isRestCompleted ? '100%' : `${segmentProgress}%`,
                  backgroundColor: sessionStyles[breakType].color,
                  transition: 'all 300ms'
                }}
                top="0"
              />
            </Box>
          )
        })}
      </Flex>
      <Text color="muted">
        {timer.subSessionType === 'work'
          ? t('timer.pomodoroCount', {
              current:
                currentPomodoroInCycle +
                (timer.subSessionType === 'work' ? 1 : 0),
              total: currentSession.session.sessionUntilLongBreak
            })
          : t('timer.breakingTime')}
      </Text>
    </>
  )
}

export default ProgressBars
