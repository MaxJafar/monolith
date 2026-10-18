import type { SavedView } from '../../../shared'

export const viewIcons: Record<SavedView['mode'], string> = {
  table: 'lucide:table-2',
  kanban: 'lucide:columns-3',
  gallery: 'lucide:layout-grid',
  list: 'lucide:list',
  calendar: 'lucide:calendar-days',
  chart: 'lucide:chart-pie',
  dashboard: 'lucide:panels-top-left',
  timeline: 'lucide:chart-gantt'
}
