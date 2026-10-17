import { describe, expect, it } from 'vitest'

import { gymSection, gymSectionParams } from './navigation'

describe('Gym section navigation', () => {
  it('keeps each supported section usable from a direct URL', () => {
    for (const section of [
      'dashboard',
      'plan',
      'workout',
      'library',
      'history',
      'stats',
      'settings',
      'coach'
    ]) {
      expect(gymSection(section)).toBe(section)
      expect(gymSection(gymSectionParams(section).get('section'))).toBe(section)
    }
  })
  it('recovers unknown, empty or malformed section values to Overview', () => {
    for (const value of [null, '', 'STATS', 'unknown', 'history/../settings'])
      expect(gymSection(value)).toBe('dashboard')
  })
  it('preserves and safely encodes record identities and summary flags in deep links', () => {
    const query = gymSectionParams('history', {
      workout: 'id with & symbols#',
      summary: '1'
    })
    const decoded = new URLSearchParams(query.toString())

    expect(decoded.get('section')).toBe('history')
    expect(decoded.get('workout')).toBe('id with & symbols#')
    expect(decoded.get('summary')).toBe('1')
  })
  it('returns a clean section root so stale detail queries do not follow navigation', () => {
    expect(gymSectionParams('dashboard').toString()).toBe('')
    expect([...gymSectionParams('plan')]).toEqual([['section', 'plan']])
  })
})
