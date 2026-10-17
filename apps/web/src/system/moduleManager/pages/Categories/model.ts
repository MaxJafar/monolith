export type CategoryMap = Record<string, Record<string, string>>

export type Category = { key: string; value: Record<string, string> }

export class CategoryConflict extends Error {
  constructor() {
    super('A category with this key already exists')
  }
}

export function editCategories(
  current: CategoryMap,
  updates: Category[],
  oldKey?: string
): CategoryMap {
  const occupied = new Set(Object.keys(current).filter(key => key !== oldKey))
  const revised = updates.map(({ key, value }) => {
    const clean = key.trim()

    if (
      !clean ||
      ['__proto__', 'constructor', 'prototype'].includes(clean) ||
      occupied.has(clean)
    )
      throw new CategoryConflict()
    occupied.add(clean)

    return [clean, { ...value }] as [string, Record<string, string>]
  })
  const result: [string, Record<string, string>][] = []

  let inserted = false

  for (const [key, labels] of Object.entries(current)) {
    if (key !== oldKey) result.push([key, labels])
    else {
      result.push(...revised)
      inserted = true
    }
  }
  if (!inserted) result.push(...revised)

  return Object.fromEntries(result)
}

export function reorderCategories(
  current: CategoryMap,
  source: string,
  target: string
): CategoryMap {
  const entries = Object.entries(current)
  const from = entries.findIndex(([key]) => key === source)
  const to = entries.findIndex(([key]) => key === target)

  if (from < 0 || to < 0 || from === to) return current

  const [moved] = entries.splice(from, 1)
  entries.splice(to, 0, moved!)

  return Object.fromEntries(entries)
}

export function deleteCategory(current: CategoryMap, key: string): CategoryMap {
  return Object.fromEntries(
    Object.entries(current).filter(([name]) => name !== key)
  )
}
