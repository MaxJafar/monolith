import dayjs from 'dayjs'

import { type Field, type RecordPage, isISODate } from '../../../shared'

export function withSystemDates(
  record: RecordPage,
  fields: Field[]
): RecordPage {
  const dates = fields.filter(
    field => field.base_id === record.base_id && field.kind === 'date'
  )
  const start = dates.find(
    field =>
      !/end|finish/i.test(field.name) && isISODate(record.values[field.id])
  )
  const end = dates.find(
    field =>
      /end|finish/i.test(field.name) && isISODate(record.values[field.id])
  )

  return {
    ...record,
    date: record.date || (start ? String(record.values[start.id]) : null),
    end_date: record.end_date || (end ? String(record.values[end.id]) : null)
  }
}

const aliases: Record<string, string[]> = {
  actions: ['action', 'actions', 'task', 'todo'],
  projects: ['project', 'projects'],
  docs: ['doc', 'docs', 'document', 'note', 'journal'],
  journal: ['journal'],
  ideas: ['idea', 'ideas']
}

export function belongsToSystem(
  record: RecordPage,
  area: string,
  fields: Field[] = []
) {
  if (area === 'calendar') return !!record.date || record.item_type === 'event'
  if (['docs', 'journal'].includes(area) && record.item_type === 'post')
    return true

  const kinds: Record<string, string> = {
    actions: 'task',
    projects: 'project',
    docs: 'note'
  }

  if (kinds[area] && record.item_type === kinds[area]) return true

  const tags = [
    ...(record.tags ?? []),
    ...fields
      .filter(
        field =>
          field.base_id === record.base_id &&
          ['tags', 'tag', 'type'].includes(field.name.trim().toLowerCase())
      )
      .flatMap(field => {
        const value = record.values[field.id]

        return Array.isArray(value)
          ? value
          : typeof value === 'string'
            ? value.split(',')
            : []
      })
  ].map(tag => tag.trim().toLowerCase())

  return (aliases[area] ?? []).some(tag => tags.includes(tag))
}

export function systemStatus(record: RecordPage) {
  return record.done || record.status === 'done'
    ? 'done'
    : record.status === 'active'
      ? 'active'
      : 'planned'
}

export function agendaMatches(
  record: RecordPage,
  filter: string,
  today = dayjs().format('YYYY-MM-DD')
) {
  if (filter === 'done') return systemStatus(record) === 'done'
  if (systemStatus(record) === 'done') return false

  const date = record.date && dayjs(record.date).format('YYYY-MM-DD')

  if (filter === 'today') return !!date && date <= today
  if (filter === 'upcoming') return !!date && date > today
  if (filter === 'priority')
    return ['high', 'urgent'].includes(record.priority ?? '')

  return true
}
