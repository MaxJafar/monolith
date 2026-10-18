import { describe, expect, it } from 'vitest'

import {
  archivedNavigationKeys,
  moveNavigationItem,
  navigationSchema
} from '../../../navigationShared'
import { type RecordPage, viewConfigSchema } from '../../../shared'
import { recordColor, valueColor } from './recordColors'
import { belongsToSystem } from './systemViews'

const parent = '11111111-1111-4111-8111-111111111111'
const child = '22222222-2222-4222-8222-222222222222'
const group = '33333333-3333-4333-8333-333333333333'
const record: RecordPage = {
  id: parent,
  base_id: group,
  title: 'Journal entry',
  content: '',
  values: {},
  updated: '2026-10-14T12:00:00Z'
}

describe('Workspace customization and recovery', () => {
  it('archives a subtree, survives reordering, and restores descendants without changing page content', () => {
    const pages = [
      { id: parent, key: `page:${parent}`, parent: null },
      { id: child, key: `page:${child}`, parent }
    ]
    const config = navigationSchema.parse({
      groups: [{ id: group, name: 'Writing', icon: 'lucide:book-open' }],
      items: [{ key: `page:${parent}`, group: 'pages', archived: true }]
    })
    const moved = moveNavigationItem(config, `page:${parent}`, group)
    expect(archivedNavigationKeys(moved, pages)).toEqual(
      new Set([`page:${parent}`, `page:${child}`])
    )
    expect(moved.groups[0]?.icon).toBe('lucide:book-open')
    moved.items[0]!.archived = false
    expect(archivedNavigationKeys(moved, pages).size).toBe(0)
    expect(pages[1]?.parent).toBe(parent)
  })

  it('handles malformed ancestry cycles and retains individually archived descendants on restore', () => {
    const pages: { id: string; key: string; parent: string | null }[] = [
      { id: parent, key: `page:${parent}`, parent: child },
      { id: child, key: `page:${child}`, parent }
    ]
    const config = navigationSchema.parse({
      items: [{ key: `page:${child}`, group: 'pages', archived: true }]
    })
    expect(archivedNavigationKeys(config, pages).size).toBe(2)
    pages[0]!.parent = null
    expect(archivedNavigationKeys(config, pages)).toEqual(
      new Set([`page:${child}`])
    )
  })

  it('keeps Journal and Docs as projections of the same record, including historical posts', () => {
    for (const entry of [
      { ...record, item_type: 'note', tags: [' Journal '] },
      { ...record, item_type: 'post' }
    ]) {
      expect(belongsToSystem(entry, 'journal')).toBe(true)
      expect(belongsToSystem(entry, 'docs')).toBe(true)
    }
    expect(
      belongsToSystem(
        { ...record, item_type: 'note', tags: ['journalism'] },
        'journal'
      )
    ).toBe(false)
  })

  it('round-trips color rules and derives completed status and first tag consistently', () => {
    const config = viewConfigSchema.parse({
      color: {
        by: 'status',
        palette: { active: '#518e97', done: '#60896b' },
        columns: true
      }
    })
    expect(recordColor({ ...record, status: 'active' }, config.color)).toBe(
      '#518e97'
    )
    expect(
      recordColor({ ...record, status: 'active', done: true }, config.color)
    ).toBe('#60896b')
    expect(
      recordColor(
        { ...record, tags: ['Design', 'Research'] },
        { by: 'tags', palette: { Design: '#8a70ac' }, columns: false }
      )
    ).toBe('#8a70ac')
    expect(
      recordColor(record, { by: 'tags', palette: {}, columns: false })
    ).toBeUndefined()
    expect(
      recordColor(record, viewConfigSchema.parse({}).color)
    ).toBeUndefined()
    expect(valueColor('Design')).toBe(valueColor('Design'))
    expect(
      viewConfigSchema.safeParse({
        color: {
          by: 'tags',
          palette: { Design: 'red; display:none' },
          columns: false
        }
      }).success
    ).toBe(false)
  })
})
