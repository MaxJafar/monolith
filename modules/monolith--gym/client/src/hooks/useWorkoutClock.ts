import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { subscribeVisibleClock } from '../utils/visibleClock'

export function useWorkoutClock(enabled = true, pauseWhenHidden = true) {
  const [now, setNow] = useState(() => dayjs().valueOf())

  useEffect(() => {
    if (!enabled) return

    return subscribeVisibleClock(
      setNow,
      {
        now: () => dayjs().valueOf(),
        isVisible: () => document.visibilityState !== 'hidden',
        startInterval: tick => window.setInterval(tick, 1000),
        stopInterval: id => window.clearInterval(id),
        onVisibilityChange: listener => {
          document.addEventListener('visibilitychange', listener)

          return () =>
            document.removeEventListener('visibilitychange', listener)
        }
      },
      pauseWhenHidden
    )
  }, [enabled, pauseWhenHidden])

  return Math.max(now, dayjs().valueOf())
}
