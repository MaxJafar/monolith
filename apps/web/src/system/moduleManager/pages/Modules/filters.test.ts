import { describe, expect, it } from 'vitest'

import { type AddonFilter, addonSlug, filterAddons } from './filters'

const addons = [
  {
    title: 'Automations',
    description: 'Connect triggers and actions',
    category: 'Productivity',
    kind: 'workbench',
    enabled: true
  },
  {
    title: 'Achievements',
    description: 'Track your victories',
    category: 'Lifestyle',
    kind: 'widget',
    enabled: false
  },
  {
    title: 'uRPG',
    description: 'A workspace campaign',
    category: 'Lifestyle',
    kind: 'overhaul',
    enabled: true
  }
]
const filter: AddonFilter = {
  search: '',
  status: 'all',
  category: 'all',
  kind: 'all'
}
describe('addon catalog filters', () => {
  it('combines search terms, status, category and type', () => {
    expect(
      filterAddons(addons, {
        search: ' ACTIONS  triggers ',
        status: 'enabled',
        category: 'Productivity',
        kind: 'workbench'
      }).map(a => a.title)
    ).toEqual(['Automations'])
    expect(
      filterAddons(addons, {
        ...filter,
        category: 'Lifestyle',
        status: 'available'
      }).map(a => a.title)
    ).toEqual(['Achievements'])
    expect(
      filterAddons(addons, { ...filter, kind: 'widget', status: 'enabled' })
    ).toEqual([])
  })
  it('sorts results without mutating the fetched catalog', () => {
    expect(filterAddons(addons, filter)[0]?.title).toBe('Achievements')
    expect(addons[0]?.title).toBe('Automations')
  })
  it('resolves canonical packages and independently named addons', () => {
    expect(addonSlug('@monolith/automations')).toBe('automations')
    expect(addonSlug('monolith--achievements')).toBe('achievements')
    expect(addonSlug('@monolith/alex--reading-list')).toBe('reading-list')
  })
})
