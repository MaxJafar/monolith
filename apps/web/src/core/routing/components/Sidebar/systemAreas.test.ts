import { describe, expect, it } from 'vitest'

import { moveSystemArea, systemOrder } from './systemAreas'

describe('native sidebar preferences', () => {
  it('migrates missing entries and discards duplicates, Atlas and unknown keys', () => {
    expect(systemOrder(['projects', 'projects', 'atlas', 'unknown'])).toEqual([
      'projects',
      'calendar',
      'actions',
      'rooms',
      'docs',
      'journal',
      'dashboard',
      'databases'
    ])
  })
  it('moves in either direction without losing hidden sections', () => {
    const original = systemOrder(null),
      moved = moveSystemArea(original, 'calendar', 'projects')
    expect(moved.slice(0, 2)).toEqual(['projects', 'calendar'])
    expect(moveSystemArea(moved, 'calendar', 'projects')).toEqual(original)
    expect(moveSystemArea(original, 'foreign', 'projects')).toBe(original)
  })
})
