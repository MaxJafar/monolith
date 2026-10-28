import { describe, expect, it } from 'vitest'

import { averageAvailability, bucketStatus, groupBy, kumaMark } from './live'

describe('Live dashboard helpers', () => {
  it('turns timeline buckets into strip states', () => {
    expect(bucketStatus(null)).toBe('empty')
    expect(bucketStatus({ up: 3, down: 0, error: 0, latency_ms: 4 })).toBe('up')
    expect(bucketStatus({ up: 2, down: 1, error: 0, latency_ms: 4 })).toBe(
      'partial'
    )
    expect(bucketStatus({ up: 0, down: 0, error: 2, latency_ms: null })).toBe(
      'down'
    )
  })

  it('maps Kuma states and averages only reported availability', () => {
    expect(kumaMark(null)).toBe('unknown')
    expect(kumaMark('maintenance')).toBe('maintenance')
    expect(averageAvailability([100, null, 50])).toBe(75)
    expect(averageAvailability([null])).toBeNull()
  })

  it('groups items in first-seen order', () => {
    expect([
      ...groupBy(['b1', 'a1', 'b2'], item => item[0]!).entries()
    ]).toEqual([
      ['b', ['b1', 'b2']],
      ['a', ['a1']]
    ])
  })
})
