export const systemAreas = {
  calendar: 'lucide:calendar-days',
  projects: 'lucide:layers-2',
  actions: 'lucide:circle-check',
  rooms: 'lucide:messages-square',
  docs: 'lucide:files',
  journal: 'lucide:book-open',
  dashboard: 'lucide:chart-no-axes-combined',
  databases: 'lucide:database'
} as const
export type SystemArea = keyof typeof systemAreas
export function systemOrder(value: unknown): SystemArea[] {
  const saved = Array.isArray(value)
    ? value.filter(
        (id): id is SystemArea =>
          typeof id === 'string' &&
          Object.prototype.hasOwnProperty.call(systemAreas, id)
      )
    : []
  return [...new Set([...saved, ...(Object.keys(systemAreas) as SystemArea[])])]
}
