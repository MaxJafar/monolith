import { describe, expect, it } from 'vitest'

import { systemOrder } from './systemAreas'

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
})
