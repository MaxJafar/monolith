import { describe, expect, it } from 'vitest'

import {
  addDashboardWidget,
  hasDashboardWidgets,
  shouldPersistDashboardLayout
} from './layout'

const first = { i: 'first', x: 0, y: 0, w: 4, h: 3 }
const second = { i: 'second', x: 4, y: 5, w: 4, h: 2 }

describe('dashboard layout persistence', () => {
  it('shows the overview for no configured widgets at any breakpoint', () => {
    expect(hasDashboardWidgets({})).toBe(false)
    expect(hasDashboardWidgets({ lg: [], sm: [] })).toBe(false)
    expect(hasDashboardWidgets({ lg: [], sm: [first] })).toBe(true)
  })

  it('never saves responsive grid calculations while the layout is locked', () => {
    expect(
      shouldPersistDashboardLayout(false, { lg: [first] }, { sm: [second] })
    ).toBe(false)
  })

  it('ignores object order and transient grid flags when geometry is unchanged', () => {
    const computed = {
      sm: [],
      lg: [{ ...second, moved: true, static: false }, first]
    }
    expect(
      shouldPersistDashboardLayout(
        true,
        { lg: [first, second], sm: [] },
        computed
      )
    ).toBe(false)
  })

  it('saves actual movement, resizing, additions and removal in edit mode', () => {
    const saved = { lg: [first] }
    expect(
      shouldPersistDashboardLayout(true, saved, { lg: [{ ...first, x: 1 }] })
    ).toBe(true)
    expect(
      shouldPersistDashboardLayout(true, saved, { lg: [{ ...first, h: 4 }] })
    ).toBe(true)
    expect(
      shouldPersistDashboardLayout(true, saved, { lg: [first, second] })
    ).toBe(true)
    expect(shouldPersistDashboardLayout(true, saved, { lg: [] })).toBe(true)
  })

  it('adds widgets below existing content with JSON-safe finite positions', () => {
    const saved = { lg: [first, second], sm: [{ ...first, y: 2 }] }
    const added = addDashboardWidget(saved, 'new', { minW: 2, minH: 3 })
    expect(added.lg?.find(widget => widget.i === 'new')).toMatchObject({
      x: 0,
      y: 7,
      w: 2,
      h: 3
    })
    expect(added.sm?.find(widget => widget.i === 'new')?.y).toBe(5)
    expect(added.xxs?.[0]?.y).toBe(0)
    expect(JSON.parse(JSON.stringify(added))).toEqual(added)
    expect(saved.lg).toEqual([first, second])
  })

  it('does not duplicate a widget when its toggle is delivered twice', () => {
    const once = addDashboardWidget({}, 'new', {})
    const twice = addDashboardWidget(once, 'new', {})
    expect(twice).toEqual(once)
    expect(Object.values(twice).every(widgets => widgets.length === 1)).toBe(
      true
    )
  })
})
