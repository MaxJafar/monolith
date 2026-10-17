import { describe, expect, it } from 'vitest'

import { calculateStatistics } from './statistics'

describe('coding statistics', () => {
  it('returns zeroes for a new account', () => {
    const result = calculateStatistics([], '2026-10-12')
    expect(Object.values(result).every(value => value === 0)).toBe(true)
  })

  it('counts the trailing streak and stops the current streak after a missed day', () => {
    const entries = [
      '2026-10-07',
      '2026-10-08',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12'
    ].map(date => ({ date, total_minutes: 30 }))

    expect(calculateStatistics(entries, '2026-10-12')).toMatchObject({
      'Longest streak': 3,
      'Current streak': 3,
      'Total time spent': 150,
      'Average time spent': 30,
      'Time spent today': 30
    })
    expect(calculateStatistics(entries, '2026-10-14')['Current streak']).toBe(0)
  })

  it("keeps yesterday's streak until today finishes and combines duplicate days", () => {
    const entries = [
      { date: '2026-10-10', total_minutes: 15 },
      { date: '2026-10-11', total_minutes: 20 },
      { date: '2026-10-11', total_minutes: 10 }
    ]

    expect(calculateStatistics(entries, '2026-10-12')).toMatchObject({
      'Most time spent': 30,
      'Total time spent': 45,
      'Average time spent': 22.5,
      'Longest streak': 2,
      'Current streak': 2
    })
  })
})
