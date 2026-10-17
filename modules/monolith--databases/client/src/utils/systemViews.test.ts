import { describe, expect, it } from 'vitest'

import { moveNavigationItem, navigationSchema } from '../../../navigationShared'
import type { Field, RecordPage } from '../../../shared'
import { workspaceInput } from '../../../workspaceShared'
import {
  agendaMatches,
  belongsToSystem,
  systemStatus,
  withSystemDates
} from './systemViews'

const record: RecordPage = {
  id: '11111111-1111-4111-8111-111111111111',
  base_id: '22222222-2222-4222-8222-222222222222',
  title: 'Review',
  content: '',
  values: {},
  updated: '2026-10-14T08:00:00.000Z'
}
const field: Field = {
  id: '33333333-3333-4333-8333-333333333333',
  base_id: record.base_id,
  name: 'Tags',
  kind: 'multi-select',
  position: 0,
  target_base_id: null,
  config: { options: [], cardinality: 'many', reciprocal_field_id: null }
}

describe('System views across databases', () => {
  it('routes native types and exact, case-insensitive tags without substring matches', () => {
    expect(belongsToSystem({ ...record, item_type: 'task' }, 'actions')).toBe(
      true
    )
    expect(
      belongsToSystem({ ...record, tags: [' Project '] }, 'projects')
    ).toBe(true)
    expect(
      belongsToSystem({ ...record, tags: ['transaction'] }, 'actions')
    ).toBe(false)
    expect(
      belongsToSystem(
        { ...record, values: { [field.id]: ['idea', 'doc'] } },
        'ideas',
        [field]
      )
    ).toBe(true)
    expect(
      belongsToSystem(
        { ...record, values: { [field.id]: ['action'] } },
        'actions',
        [{ ...field, base_id: 'other' }]
      )
    ).toBe(false)
  })
  it('separates today/overdue, future, priority and completed actions', () => {
    const action = {
      ...record,
      date: '2026-10-13T12:00:00Z',
      priority: 'urgent'
    }
    expect(agendaMatches(action, 'today', '2026-10-14')).toBe(true)
    expect(agendaMatches(action, 'upcoming', '2026-10-14')).toBe(false)
    expect(
      agendaMatches(
        { ...action, date: '2026-10-16T12:00:00Z' },
        'upcoming',
        '2026-10-14'
      )
    ).toBe(true)
    expect(agendaMatches({ ...action, done: true }, 'priority')).toBe(false)
    expect(agendaMatches({ ...action, status: 'done' }, 'done')).toBe(true)
    expect(agendaMatches(record, 'today', '2026-10-14')).toBe(false)
    expect(agendaMatches(record, 'all')).toBe(true)
    expect(systemStatus({ ...action, done: true, status: 'active' })).toBe(
      'done'
    )
  })
  it('includes date properties while retaining canonical dates and original values', () => {
    const dateField = { ...field, kind: 'date' as const, name: 'Due date' }
    const source = { ...record, values: { [field.id]: '2026-10-14' } }
    expect(withSystemDates(source, [dateField]).date).toBe('2026-10-14')
    expect(source.date).toBeUndefined()
    expect(
      withSystemDates({ ...source, date: '2026-10-20T12:00:00Z' }, [dateField])
        .date
    ).toBe('2026-10-20T12:00:00Z')
    expect(
      withSystemDates({ ...source, values: { [field.id]: '2026-02-31' } }, [
        dateField
      ]).date
    ).toBeNull()
  })
})

describe('Customizable sidebar', () => {
  const group = '44444444-4444-4444-8444-444444444444'
  it('moves mixed page/addon entries without dropping visibility or unrelated items', () => {
    const state = navigationSchema.parse({
      revision: 8,
      groups: [{ id: group, name: 'Focus' }],
      items: [
        { key: `page:${record.id}`, group: 'pages' },
        { key: 'addon:wallet', group: 'addons', hidden: true },
        { key: 'addon:gym', group: 'addons' }
      ]
    })
    const moved = moveNavigationItem(
      state,
      'addon:wallet',
      group,
      `page:${record.id}`
    )
    expect(moved.revision).toBe(8)
    expect(moved.items.map(item => item.key)).toEqual([
      'addon:wallet',
      `page:${record.id}`,
      'addon:gym'
    ])
    expect(moved.items[0]).toMatchObject({ group, hidden: true })
    expect(state.items[0]?.key).toBe(`page:${record.id}`)
  })
  it('rejects duplicate entries and undefined groups', () => {
    expect(
      navigationSchema.safeParse({ items: [{ key: 'addon:gym', group }] })
        .success
    ).toBe(false)
    expect(
      navigationSchema.safeParse({
        items: [
          { key: 'addon:gym', group: 'addons' },
          { key: 'addon:gym', group: 'pages' }
        ]
      }).success
    ).toBe(false)
  })
  it('accepts custom addon slugs without extending a hardcoded module enum', () => {
    expect(
      workspaceInput.parse({
        name: 'Personal',
        enabled_modules: ['reading-list']
      }).enabled_modules
    ).toEqual(['reading-list'])
    expect(
      workspaceInput.safeParse({
        name: 'Personal',
        enabled_modules: ['../../escape']
      }).success
    ).toBe(false)
  })
})
