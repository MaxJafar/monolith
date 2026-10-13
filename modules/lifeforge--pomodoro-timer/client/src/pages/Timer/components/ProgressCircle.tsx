import dayjs from 'dayjs'

import { Box, Flex, Text } from '@lifeforge/ui'

import { useSessionStyles } from '@/hooks/useSessionStyles'
import { usePomodoro } from '@/providers/PomodoroProvider'

import useProgress from '../hooks/useProgress'
import * as styles from './ProgressCircle.css'

function ProgressCircle() {
  const timer = usePomodoro()
  const progress = useProgress()
  const sessionStyles = useSessionStyles()

  return (
    <Box position="relative">
      <svg className={styles.svg} viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          className={styles.backgroundCircle}
          cx="100"
          cy="100"
          fill="none"
          r="85"
          stroke="currentColor"
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          className={styles.progressCircle}
          cx="100"
          cy="100"
          fill="none"
          r="85"
          stroke={sessionStyles[timer.subSessionType].color}
          strokeDasharray={`${(progress / 100) * 534.07} 534.07`}
          strokeLinecap="round"
          strokeWidth="10"
        />
      </svg>
      <Flex
        align="center"
        direction="column"
        inset="0"
        justify="center"
        position="absolute"
      >
        <Text
          size="6xl"
          style={{
            color: timer.isRunning
              ? sessionStyles[timer.subSessionType].color
              : undefined
          }}
          weight="semibold"
        >
          {dayjs.duration(timer.timeLeft, 'seconds').format('mm:ss')}
        </Text>
      </Flex>
    </Box>
  )
}

export default ProgressCircle
