import { useCurrentSession } from '@/providers/CurrentSessionProvider'
import { usePomodoro } from '@/providers/PomodoroProvider'

function useProgress() {
  const timer = usePomodoro()
  const currentSession = useCurrentSession()

  const totalDuration = currentSession
    ? currentSession.session[
        (
          {
            work: 'workDuration',
            short_break: 'shortBreakDuration',
            long_break: 'longBreakDuration'
          } as const
        )[timer.subSessionType]
      ] * 60
    : 0

  return ((totalDuration - timer.timeLeft) / totalDuration) * 100
}

export default useProgress
