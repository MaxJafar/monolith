import { describe, expect, it } from 'vitest'

import { sliderRange } from './range'

describe('Slider boundaries', () => {
  it('keeps equal, reversed and non-finite bounds renderable', () => {
    for (const range of [
      sliderRange(5, 5, 5, 1),
      sliderRange(8, 10, 0, 1),
      sliderRange(NaN, 0, Infinity, 0)
    ]) {
      expect(range.progress).toBe(0)
      expect(range.fixed).toBe(true)
      expect(Number.isFinite(range.value)).toBe(true)
    }
  })
  it('clamps values outside the range and aligns typed decimal values', () => {
    expect(sliderRange(-40, -20, 50, 0.5).value).toBe(-20)
    expect(sliderRange(70, -20, 50, 0.5).progress).toBe(100)
    expect(sliderRange(0.26, 0.1, 1, 0.1).value).toBe(0.3)
    expect(sliderRange(13, 0, 100, 5).value).toBe(15)
  })
})
