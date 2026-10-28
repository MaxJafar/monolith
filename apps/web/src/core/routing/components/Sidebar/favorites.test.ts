import { describe, expect, it } from 'vitest'

import {
  type Favorite,
  addFavorite,
  canAddFavorite,
  favoriteKey,
  hasFavorite,
  migrateFavorites,
  moveFavorite,
  moveFavoriteBefore,
  parseFavorites,
  removeFavorite,
  toggleFavorite,
  updateWidgetFavorite
} from './favorites'

const widget = (id: string): Favorite => ({
  type: 'widget',
  id,
  collapsed: false,
  filter: ''
})

const keys = (list: Favorite[]) => list.map(favoriteKey)

describe('sidebar favourites', () => {
  it('migrates visible areas in their saved order followed by pinned widgets', () => {
    expect(
      migrateFavorites({
        areaOrder: ['projects', 'calendar'],
        hiddenAreas: ['docs', 'journal', 'unknown'],
        widgets: [
          { id: 'calendarWidget', collapsed: true, filter: 'week' },
          { id: 'calendarWidget' },
          { id: 'habitTracker' }
        ]
      })
    ).toEqual([
      { type: 'area', id: 'projects' },
      { type: 'area', id: 'calendar' },
      { type: 'area', id: 'actions' },
      { type: 'area', id: 'rooms' },
      { type: 'area', id: 'dashboard' },
      { type: 'area', id: 'databases' },
      { type: 'widget', id: 'calendarWidget', collapsed: true, filter: 'week' },
      { type: 'widget', id: 'habitTracker', collapsed: false, filter: '' }
    ])
  })

  it('keeps every area for preferences saved before areas could be hidden', () => {
    expect(keys(migrateFavorites({ width: 300 }))).toEqual([
      'area:calendar',
      'area:projects',
      'area:actions',
      'area:rooms',
      'area:docs',
      'area:journal',
      'area:dashboard',
      'area:databases'
    ])
  })

  it('treats saved favourites as the source of truth, even when empty', () => {
    expect(
      migrateFavorites({
        favorites: [],
        areaOrder: ['calendar'],
        widgets: [{ id: 'habitTracker' }]
      })
    ).toEqual([])
    expect(
      migrateFavorites({
        favorites: [{ type: 'page', id: 'a' }],
        widgets: [{ id: 'habitTracker' }]
      })
    ).toEqual([{ type: 'page', id: 'a' }])
  })

  it('validates shape, removes duplicates and applies the item and widget caps', () => {
    expect(
      parseFavorites([
        { type: 'area', id: 'atlas' },
        { type: 'area', id: 'rooms' },
        { type: 'area', id: 'rooms' },
        { type: 'page', id: '' },
        { type: 'page', id: 'x'.repeat(100) },
        { type: 'addon', id: 'gym' },
        { type: 'folder', id: 'f' },
        { type: 'widget', id: 'focus', collapsed: 'yes', filter: 4 },
        null,
        'area:calendar'
      ])
    ).toEqual([
      { type: 'area', id: 'rooms' },
      { type: 'addon', id: 'gym' },
      { type: 'widget', id: 'focus', collapsed: false, filter: '' }
    ])
    expect(parseFavorites('nope')).toEqual([])

    const widgets = parseFavorites(
      Array.from({ length: 12 }, (_, index) => widget(`w${index}`))
    )
    expect(widgets).toHaveLength(8)

    const many = parseFavorites([
      ...Array.from({ length: 10 }, (_, index) => widget(`w${index}`)),
      ...Array.from({ length: 50 }, (_, index) => ({
        type: 'page',
        id: `p${index}`
      }))
    ])
    expect(many).toHaveLength(40)
    expect(many.filter(item => item.type === 'widget')).toHaveLength(8)
    expect(many.at(-1)).toEqual({ type: 'page', id: 'p31' })
  })

  it('adds, removes and toggles without duplicates or exceeding caps', () => {
    const list: Favorite[] = [
      { type: 'area', id: 'calendar' },
      { type: 'page', id: 'a' }
    ]
    const added = addFavorite(list, { type: 'addon', id: 'gym' }, 'page:a')

    expect(keys(added)).toEqual(['area:calendar', 'addon:gym', 'page:a'])
    expect(addFavorite(added, { type: 'page', id: 'a' })).toBe(added)
    expect(hasFavorite(added, { type: 'addon', id: 'gym' })).toBe(true)
    expect(keys(removeFavorite(added, 'addon:gym'))).toEqual(keys(list))
    expect(removeFavorite(added, 'page:missing')).toBe(added)
    expect(keys(toggleFavorite(list, { type: 'page', id: 'a' }))).toEqual([
      'area:calendar'
    ])
    expect(keys(toggleFavorite(list, { type: 'page', id: 'b' }))).toEqual([
      'area:calendar',
      'page:a',
      'page:b'
    ])

    const widgets = Array.from({ length: 8 }, (_, index) => widget(`w${index}`))
    expect(canAddFavorite(widgets, 'widget')).toBe(false)
    expect(canAddFavorite(widgets, 'page')).toBe(true)
    expect(addFavorite(widgets, widget('extra'))).toBe(widgets)

    const full = Array.from({ length: 40 }, (_, index): Favorite => ({
      type: 'page',
      id: `p${index}`
    }))
    expect(addFavorite(full, { type: 'page', id: 'extra' })).toBe(full)
  })

  it('moves into the target position in either direction or to the end', () => {
    const list: Favorite[] = [
      { type: 'area', id: 'calendar' },
      { type: 'page', id: 'a' },
      widget('focus'),
      { type: 'addon', id: 'gym' }
    ]

    expect(keys(moveFavorite(list, 'area:calendar', 'page:a'))).toEqual([
      'page:a',
      'area:calendar',
      'widget:focus',
      'addon:gym'
    ])
    expect(keys(moveFavorite(list, 'addon:gym', 'page:a'))).toEqual([
      'area:calendar',
      'addon:gym',
      'page:a',
      'widget:focus'
    ])
    expect(keys(moveFavorite(list, 'area:calendar', null))).toEqual([
      'page:a',
      'widget:focus',
      'addon:gym',
      'area:calendar'
    ])
    expect(moveFavorite(list, 'area:calendar', 'area:calendar')).toBe(list)
    expect(moveFavorite(list, 'page:missing', 'page:a')).toBe(list)
    expect(moveFavorite(list, 'page:a', 'page:missing')).toBe(list)
    expect(moveFavorite(list, 'addon:gym', null)).toBe(list)
    expect(
      keys(moveFavoriteBefore(list, 'area:calendar', 'widget:focus'))
    ).toEqual(['page:a', 'area:calendar', 'widget:focus', 'addon:gym'])
    expect(keys(moveFavoriteBefore(list, 'page:a', null))).toEqual([
      'area:calendar',
      'widget:focus',
      'addon:gym',
      'page:a'
    ])
    expect(moveFavoriteBefore(list, 'area:calendar', 'page:a')).toBe(list)
  })

  it('updates a widget favourite without touching other items', () => {
    const list: Favorite[] = [{ type: 'page', id: 'focus' }, widget('focus')]

    expect(
      updateWidgetFavorite(list, 'focus', { collapsed: true, filter: 'today' })
    ).toEqual([
      { type: 'page', id: 'focus' },
      { type: 'widget', id: 'focus', collapsed: true, filter: 'today' }
    ])
  })
})
