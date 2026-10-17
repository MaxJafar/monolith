import { describe, expect, it } from 'vitest'

import { kineticPose, spring, stepSpring } from './spring'

describe('shared kinetic motion', () => {
  it('settles to the same target at 60 and 144 Hz', () => {
    const positions = [60, 144].map(hz => {
      const state = spring(100)
      for (let i = 0; i < hz * 2; i++) stepSpring(state, 0, 1 / hz)
      return state.position
    })
    expect(Math.abs(positions[0]! - positions[1]!)).toBeLessThan(0.01)
    expect(Math.abs(positions[0]!)).toBeLessThan(0.01)
  })
  it('bounds visual lag and deformation during fast movement or a paused frame', () => {
    const pose = kineticPose()
    pose.reset(0, 0, 0)
    for (const now of [16, 32, 30000]) {
      const value = pose.sample(2000, -1000, now)
      expect(Math.abs(value.x - 2000)).toBeLessThanOrEqual(24)
      expect(Math.abs(value.y + 1000)).toBeLessThanOrEqual(24)
      expect(Math.abs(value.angle)).toBeLessThan(7)
      expect(value.sx).toBeGreaterThan(0.96)
      expect(value.sy).toBeLessThan(1.04)
    }
  })
  it('removes inertia, tilt and squash for reduced motion', () => {
    const pose = kineticPose()
    pose.reset(0, 0, 0)
    expect(pose.sample(500, 100, 16, true)).toEqual({
      x: 500,
      y: 100,
      angle: 0,
      sx: 1,
      sy: 1
    })
  })
})
