import { describe, expect, it } from 'vitest'

import { recordNavigation, sameRecordIds, viewNavigation } from './navigation'

describe('Database navigation links', () => {
  it('retains the saved calendar view, date and layout when opening a record in the same base', () => {
    expect(
      Object.fromEntries(
        recordNavigation(
          { id: 'launch', base_id: 'projects' },
          'projects',
          'calendar',
          { calendarDate: '2026-12-31', calendarLayout: 'week' }
        )
      )
    ).toEqual({
      base: 'projects',
      record: 'launch',
      view: 'calendar',
      calendarDate: '2026-12-31',
      calendarLayout: 'week'
    })
  })

  it('drops another base’s view and date context when following a reciprocal link', () => {
    expect(
      Object.fromEntries(
        recordNavigation(
          { id: 'alex', base_id: 'people' },
          'projects',
          'calendar',
          { calendarDate: '2026-12-31', calendarLayout: 'week' }
        )
      )
    ).toEqual({ base: 'people', record: 'alex' })
  })

  it('handles default views without persisting an empty record-view selection', () => {
    expect(
      Object.fromEntries(
        recordNavigation({ id: 'launch', base_id: 'projects' }, 'projects', '')
      )
    ).toEqual({ base: 'projects', record: 'launch' })
  })

  it('changes the saved view without keeping a stale record or workspace section', () => {
    expect(
      Object.fromEntries(
        viewNavigation('projects', 'board', { calendarDate: '2026-10-13' })
      )
    ).toEqual({ base: 'projects', view: 'board', calendarDate: '2026-10-13' })
  })

  it('escapes values instead of permitting extra query parameters in generated links', () => {
    const query = recordNavigation(
      { id: 'record&section=graph', base_id: 'base?record=other' },
      undefined,
      ''
    )

    expect(new URLSearchParams(query.toString()).get('record')).toBe(
      'record&section=graph'
    )
    expect(query.has('section')).toBe(false)
  })
})

describe('Relation draft identity comparison', () => {
  it('ignores order without mutating baseline or selected arrays', () => {
    const selected = ['alex', 'sam']
    const baseline = ['sam', 'alex']

    expect(sameRecordIds(selected, baseline)).toBe(true)
    expect(selected).toEqual(['alex', 'sam'])
    expect(baseline).toEqual(['sam', 'alex'])
  })

  it('detects selections, clear operations and changes elsewhere', () => {
    expect(sameRecordIds([], [])).toBe(true)
    expect(sameRecordIds(['alex'], [])).toBe(false)
    expect(sameRecordIds(['alex'], ['sam'])).toBe(false)
    expect(sameRecordIds(['alex', 'sam'], ['alex'])).toBe(false)
  })
})
