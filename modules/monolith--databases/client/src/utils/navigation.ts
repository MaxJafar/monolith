import type { RecordPage } from '../../../shared'

type CalendarNavigation = {
  calendarDate?: string
  calendarLayout?: string
}

export function viewNavigation(
  baseId: string,
  viewId: string,
  calendar: CalendarNavigation = {}
) {
  return new URLSearchParams({ base: baseId, view: viewId, ...calendar })
}

export function recordNavigation(
  record: Pick<RecordPage, 'id' | 'base_id'>,
  baseId: string | undefined,
  viewId: string,
  calendar: CalendarNavigation = {}
) {
  return new URLSearchParams({
    base: record.base_id,
    record: record.id,
    ...(record.base_id === baseId && viewId ? { view: viewId } : {}),
    ...(record.base_id === baseId ? calendar : {})
  })
}

export function sameRecordIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false

  const selected = new Set(left)

  return right.every(id => selected.has(id))
}
