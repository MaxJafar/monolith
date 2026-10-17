import type { WorkTimer } from '../../../shared'

export const POUNDS_PER_KG = 2.2046226218487757

export function weightDisplay(kg: number, unit: 'kg' | 'lb') {
  return Math.round(kg * (unit === 'lb' ? POUNDS_PER_KG : 1) * 100) / 100
}

export function weightKg(value: number, unit: 'kg' | 'lb') {
  return value / (unit === 'lb' ? POUNDS_PER_KG : 1)
}

export function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function adjacentGroups<T extends { superset_group: string | null }>(
  entries: T[]
): T[][] {
  const groups: T[][] = []
  entries.forEach((entry, index) => {
    if (
      entry.superset_group &&
      entries[index - 1]?.superset_group === entry.superset_group
    ) {
      groups[groups.length - 1]!.push(entry)
    } else groups.push([entry])
  })

  return groups
}

export function cleanSupersets<T extends { superset_group: string | null }>(
  entries: T[]
): T[] {
  return adjacentGroups(entries).flatMap(group =>
    group.length > 1
      ? group
      : group.map(entry => ({ ...entry, superset_group: null }))
  )
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function restAfterSet<
  T extends {
    id: string
    sets: { id: string; done: boolean }[]
    target: { rest_seconds: number }
  }
>(group: T[], entryId: string, setId: string): number {
  const entry = group.find(entry => entry.id === entryId)
  const index = entry?.sets.findIndex(set => set.id === setId) ?? -1

  if (index < 0 || !entry?.sets[index]?.done) return 0

  const partners = group.filter(entry => entry.sets[index])

  if (!partners.every(entry => entry.sets[index]!.done)) return 0

  return partners[partners.length - 1]?.target.rest_seconds ?? 0
}

export function timerRemaining(timer: WorkTimer | null, now: number): number {
  if (!timer) return 0

  const elapsed = Math.max(
    0,
    Math.floor((now - Date.parse(timer.started_at)) / 1000)
  )

  return Math.max(0, timer.target_seconds - elapsed)
}

export function acknowledgedWorkTimer(
  source: WorkTimer | null,
  draft: WorkTimer | null
): boolean {
  return (
    !!source &&
    !!draft &&
    source.started_at === draft.started_at &&
    source.entry_id === draft.entry_id &&
    source.set_id === draft.set_id &&
    source.target_seconds === draft.target_seconds
  )
}
