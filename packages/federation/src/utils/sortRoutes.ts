// SPDX-License-Identifier: 0BSD
import type { ModuleGroup } from '@monolith/configs'

import { SYSTEM_CATEGORIES } from '../providers/FederationProvider'

export function sortRoutes<T extends ModuleGroup>(
  routes: T[],
  categoryOrder: Record<string, Record<string, string>>
): T[] {
  const preferences = new Map(
    Object.keys(categoryOrder).map((name, index) => [name.toLowerCase(), index])
  )
  const rank = (name: string): [number, number] => {
    const system = SYSTEM_CATEGORIES.indexOf(name)
    if (system === 0) return [0, 0]
    if (system > 0) return [3, system]
    const selected = preferences.get(name.toLowerCase())
    return selected === undefined ? [2, 0] : [1, selected]
  }
  return routes
    .slice()
    .sort((left, right) => {
      const a = rank(left.title),
        b = rank(right.title)
      return a[0] - b[0] || a[1] - b[1] || left.title.localeCompare(right.title)
    })
    .map(group => ({
      ...group,
      title:
        group.title === '<START>' || group.title === '<END>' ? '' : group.title,
      items: group.items.slice().sort((a, b) => a.name.localeCompare(b.name))
    }))
}
