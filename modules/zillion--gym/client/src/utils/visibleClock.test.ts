import { describe, expect, it } from 'vitest'

import { subscribeVisibleClock } from './visibleClock'

function environment() {
  let now = 1000
  let visible = true
  let listener: (() => void) | null = null
  let nextId = 0

  const intervals = new Map<number, () => void>()

  return {
    clock: {
      now: () => now,
      isVisible: () => visible,
      startInterval: (tick: () => void) => {
        const id = ++nextId
        intervals.set(id, tick)

        return id
      },
      stopInterval: (id: number) => {
        intervals.delete(id)
      },
      onVisibilityChange: (next: () => void) => {
        listener = next

        return () => {
          listener = null
        }
      }
    },
    advance(value: number) {
      now = value
      for (const tick of intervals.values()) tick()
    },
    visibility(value: boolean) {
      visible = value
      listener?.()
    },
    get intervalCount() {
      return intervals.size
    },
    get listening() {
      return listener !== null
    }
  }
}

describe('isolated workout clocks', () => {
  it('samples wall time instead of accumulating ticks and keeps only one interval', () => {
    const env = environment()
    const values: number[] = []
    const stop = subscribeVisibleClock(now => values.push(now), env.clock)

    env.advance(9000)
    env.advance(65000)
    env.visibility(true)
    expect(values).toEqual([1000, 9000, 65000, 65000])
    expect(env.intervalCount).toBe(1)
    stop()
  })
  it('pauses a hidden elapsed display and immediately catches up when the tab returns', () => {
    const env = environment()
    const values: number[] = []
    const stop = subscribeVisibleClock(now => values.push(now), env.clock)

    env.visibility(false)
    expect(env.intervalCount).toBe(0)
    env.advance(3600000)
    expect(values[values.length - 1]).toBe(1000)
    env.visibility(true)
    expect(values[values.length - 1]).toBe(3600000)
    expect(env.intervalCount).toBe(1)
    stop()
  })
  it('keeps active work/rest completion clocks ticking in the background', () => {
    const env = environment()
    const values: number[] = []
    const stop = subscribeVisibleClock(
      now => values.push(now),
      env.clock,
      false
    )

    env.visibility(false)
    env.advance(51000)
    expect(env.intervalCount).toBe(1)
    expect(values[values.length - 1]).toBe(51000)
    stop()
  })
  it('removes the interval and visibility listener when a workout clock unmounts', () => {
    const env = environment()
    const values: number[] = []
    const stop = subscribeVisibleClock(now => values.push(now), env.clock)
    stop()

    expect(env.intervalCount).toBe(0)
    expect(env.listening).toBe(false)
    env.advance(50000)
    env.visibility(true)
    expect(values).toEqual([1000])
  })
})
