import { describe, expect, it } from 'vitest'

import { axisTickIndexes, barMaximum, lineLayout, progressRatio } from './model'

describe('data visualization scales', () => {
  it('preserves unknown gaps rather than drawing a false connection', () => {
    const result = lineLayout([
      { label: 'A', value: 0 },
      { label: 'B', value: null },
      { label: 'C', value: 12 }
    ])
    expect(result.points.map(point => point.value)).toEqual([0, 12])
    expect(result.segments.map(segment => segment.length)).toEqual([1, 1])
  })
  it('preserves duplicate timestamps and actual time spacing', () => {
    const result = lineLayout([
      { label: 'A', position: 10, value: 2 },
      { label: 'B', position: 10, value: 4 },
      { label: 'C', position: 12, value: 5 },
      { label: 'D', position: 20, value: 6 }
    ])
    expect(result.points.map(point => point.x)).toEqual([64, 64, 176, 624])
    expect(result.points).toHaveLength(4)
  })
  it('handles a single zero value and invalid values with finite coordinates', () => {
    const result = lineLayout([
      { label: 'A', value: 0 },
      { label: 'B', value: Number.NaN }
    ])
    expect(result.points).toHaveLength(1)
    expect(Number.isFinite(result.points[0]!.y)).toBe(true)
    expect(result.max).toBeGreaterThan(result.min)
  })
  it('respects fixed and inverted domains and clamps outliers to the plot', () => {
    const result = lineLayout(
      [
        { label: 'A', value: 0 },
        { label: 'B', value: 10 },
        { label: 'C', value: 15 }
      ],
      [0, 10],
      true
    )
    expect(result.points.map(point => point.y)).toEqual([18, 176, 176])
  })
  it('includes a goal in the automatic domain and rejects invalid domains', () => {
    const result = lineLayout([{ label: 'A', value: 12 }], [3, 3], false, 30)
    expect(result.max).toBeGreaterThan(30)
    expect(result.min).toBeLessThan(12)
  })
  it('keeps bar scales zero-based and includes source values beyond an explicit max', () => {
    expect(
      barMaximum([
        { label: 'A', value: null },
        { label: 'B', value: Number.POSITIVE_INFINITY }
      ])
    ).toBe(1)
    expect(barMaximum([{ label: 'A', value: 20 }], 10)).toBe(20)
  })
  it('clamps progress and keeps zero or unknown goals finite', () => {
    expect(progressRatio(8, 4)).toBe(1)
    expect(progressRatio(-1, 4)).toBe(0)
    expect(progressRatio(2, 0)).toBe(0)
    expect(progressRatio(Number.NaN, 4)).toBe(0)
  })
})

describe('civil position axis labels', () => {
  it('omits the middle label when sessions cluster near an endpoint', () => {
    const positions = [1, 2, 3, 4, 5, 6, 31].map(day => Date.UTC(2026, 9, day))
    expect(axisTickIndexes(positions)).toEqual([0, 6])
    expect(axisTickIndexes([0, 80, 90, 95, 100])).toEqual([0, 4])
  })
  it('selects the position closest to the time midpoint rather than the record midpoint', () => {
    expect(axisTickIndexes([0, 1, 2, 3, 50, 100])).toEqual([0, 4, 5])
    expect(axisTickIndexes([0, 10, 20, 30, 40, 50, 60])).toEqual([0, 3, 6])
  })
  it('de-duplicates date labels while retaining every same-day session and its geometry', () => {
    const source = [
      { label: 'Oct 1 morning', position: 0, value: 2 },
      { label: 'Oct 1 evening', position: 0, value: 4 },
      { label: 'Oct 16 morning', position: 15, value: 5 },
      { label: 'Oct 16 evening', position: 15, value: 7 },
      { label: 'Oct 31', position: 30, value: 6 }
    ]
    const layout = lineLayout(source, [0, 10])
    const before = layout.points.map(point => ({
      index: point.index,
      x: point.x,
      y: point.y
    }))
    expect(axisTickIndexes(layout.positions)).toEqual([0, 2, 4])
    expect(layout.points).toHaveLength(5)
    expect(
      layout.points.map(point => ({
        index: point.index,
        x: point.x,
        y: point.y
      }))
    ).toEqual(before)
    expect(axisTickIndexes([5, 5, 5])).toEqual([0])
  })
  it('handles empty and short series and orders labels by numeric position', () => {
    expect(axisTickIndexes([])).toEqual([])
    expect(axisTickIndexes([Number.NaN, Number.POSITIVE_INFINITY])).toEqual([])
    expect(axisTickIndexes([12])).toEqual([0])
    expect(axisTickIndexes([5, 20])).toEqual([0, 1])
    expect(axisTickIndexes([30, 0, 15])).toEqual([1, 2, 0])
  })
})
