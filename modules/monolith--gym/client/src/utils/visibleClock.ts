type ClockEnvironment = {
  now: () => number
  isVisible: () => boolean
  startInterval: (tick: () => void) => number
  stopInterval: (id: number) => void
  onVisibilityChange: (listener: () => void) => () => void
}

export function subscribeVisibleClock(
  update: (now: number) => void,
  environment: ClockEnvironment,
  pauseWhenHidden = true
) {
  let interval: number | null = null

  const tick = () => update(environment.now())
  const synchronize = () => {
    tick()
    const shouldTick = !pauseWhenHidden || environment.isVisible()

    if (shouldTick && interval === null)
      interval = environment.startInterval(tick)
    else if (!shouldTick && interval !== null) {
      environment.stopInterval(interval)
      interval = null
    }
  }
  const unsubscribe = environment.onVisibilityChange(synchronize)
  synchronize()

  return () => {
    unsubscribe()
    if (interval !== null) environment.stopInterval(interval)
    interval = null
  }
}
