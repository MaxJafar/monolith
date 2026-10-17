/** Seconds-based integration keeps motion identical on 60/120/144 Hz displays. */
export type Spring = { position: number; velocity: number }

export const spring = (position = 0): Spring => ({ position, velocity: 0 })

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function stepSpring(
  state: Spring,
  target: number,
  seconds: number,
  stiffness = 280,
  damping = 24
) {
  let remaining = clamp(seconds, 0, 0.064)

  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 240)
    state.velocity +=
      ((target - state.position) * stiffness - state.velocity * damping) * dt
    state.position += state.velocity * dt
    remaining -= dt
  }

  if (
    Math.abs(state.position - target) < 0.001 &&
    Math.abs(state.velocity) < 0.01
  ) {
    state.position = target
    state.velocity = 0
  }

  return state.position
}

/** Bounded visual lag, tilt and squash. The actual pointer target never lags. */
export function kineticPose() {
  const x = spring(),
    y = spring(),
    tilt = spring(),
    stretch = spring()

  let previousX = 0,
    previousY = 0,
    last = 0,
    initialized = false

  return {
    reset(px: number, py: number, now = performance.now()) {
      x.position = previousX = px
      y.position = previousY = py
      x.velocity =
        y.velocity =
        tilt.position =
        tilt.velocity =
        stretch.position =
        stretch.velocity =
          0
      last = now
      initialized = true
    },
    sample(px: number, py: number, now = performance.now(), reduced = false) {
      if (!initialized) this.reset(px, py, now)

      const dt = clamp((now - last) / 1000, 1 / 240, 0.064)
      const vx = (px - previousX) / dt,
        vy = (py - previousY) / dt
      previousX = px
      previousY = py
      last = now

      if (reduced) {
        this.reset(px, py, now)

        return { x: px, y: py, angle: 0, sx: 1, sy: 1 }
      }

      const nextX = clamp(stepSpring(x, px, dt, 650, 44), px - 24, px + 24)
      const nextY = clamp(stepSpring(y, py, dt, 650, 44), py - 24, py + 24)
      x.position = nextX
      y.position = nextY
      const angle = stepSpring(tilt, clamp(vx / 210, -5, 5), dt, 240, 19)
      const amount = stepSpring(
        stretch,
        clamp((Math.abs(vx) - Math.abs(vy)) / 42000, -0.025, 0.025),
        dt,
        320,
        20
      )

      return { x: nextX, y: nextY, angle, sx: 1 + amount, sy: 1 - amount }
    }
  }
}
