export const systemAreas = {
  calendar: 'lucide:calendar-days',
  projects: 'lucide:layers-2',
  actions: 'lucide:circle-check',
  rooms: 'lucide:messages-square',
  docs: 'lucide:files',
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
export function moveSystemArea(
  order: SystemArea[],
  from: string,
  to: string
): SystemArea[] {
  if (
    from === to ||
    !order.includes(from as SystemArea) ||
    !order.includes(to as SystemArea)
  )
    return order
  const result = order.filter(id => id !== from)
  result.splice(order.indexOf(to as SystemArea), 0, from as SystemArea)
  return result
}
