import type { RecordPage } from '../../../shared'

/** The project relation always points at a record, never its containing table. */
export function projectProgress(projectId: string, records: RecordPage[]) {
  const actions = records.filter(
    row => row.item_type === 'task' && row.project_id === projectId
  )
  const completed = actions.filter(
    row => row.done || row.status === 'done'
  ).length

  return {
    actions,
    completed,
    total: actions.length,
    percent: actions.length ? Math.round((completed / actions.length) * 100) : 0
  }
}
