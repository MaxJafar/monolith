import {
  type CellValue,
  type Field,
  type FieldKind,
  type RecordPage,
  propertyValue
} from '../../../shared'

export const propertyIcons: Record<FieldKind, string> = {
  text: 'tabler:align-left',
  status: 'lucide:circle-dot',
  url: 'lucide:link',
  email: 'lucide:at-sign',
  phone: 'lucide:phone',
  files: 'lucide:paperclip',
  place: 'lucide:map-pin',
  formula: 'lucide:sigma',
  rollup: 'lucide:search',
  progress: 'lucide:chart-no-axes-combined',
  button: 'lucide:mouse-pointer',
  'unique-id': 'lucide:hash',
  'created-time': 'lucide:clock',
  'last-edited-time': 'lucide:clock',
  'created-by': 'lucide:user',
  'last-edited-by': 'lucide:user',
  number: 'tabler:number',
  date: 'tabler:calendar',
  checkbox: 'tabler:checkbox',
  select: 'tabler:circle-dot',
  'multi-select': 'tabler:tags',
  relation: 'tabler:link',
  person: 'tabler:user'
}

export function groupDistribution(field: Field, records: RecordPage[]) {
  if (field.kind !== 'checkbox' && field.kind !== 'select') return []

  const counts = new Map<CellValue, number>(
    field.kind === 'checkbox'
      ? [
          [false, 0],
          [true, 0]
        ]
      : [[null, 0], ...field.config.options.map(option => [option, 0] as const)]
  )

  for (const record of records) {
    const raw = propertyValue(record, field.id)
    const value =
      field.kind === 'checkbox'
        ? raw === true
        : typeof raw === 'string' && raw
          ? raw
          : null

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
}
