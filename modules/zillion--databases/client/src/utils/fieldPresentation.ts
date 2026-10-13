import {
  type CellValue,
  type Field,
  type FieldKind,
  type RecordPage,
  propertyValue
} from '../../../shared'

export const propertyIcons: Record<FieldKind, string> = {
  text: 'tabler:align-left',
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
