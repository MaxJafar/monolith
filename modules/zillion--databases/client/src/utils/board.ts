import {
  type CellValue,
  type Field,
  type RecordPage,
  propertyValue
} from '../../../shared'

export type BoardGroup = { value: CellValue; label: string }

export function boardValue(record: RecordPage, field: Field): CellValue {
  const value = propertyValue(record, field.id)

  return field.kind === 'checkbox'
    ? value === true
    : value === ''
      ? null
      : (value ?? null)
}

/** Keep legacy option values visible even when their schema option was removed. */
export function boardGroups(
  field: Field,
  records: RecordPage[],
  t: (key: string) => string
): BoardGroup[] {
  if (field.kind === 'checkbox')
    return [
      { value: false, label: t('unchecked') },
      { value: true, label: t('checked') }
    ]

  const groups: BoardGroup[] =
    field.id === 'item_type' ? [] : [{ value: null, label: t('ungrouped') }]
  const options = new Set(field.config.options)

  for (const record of records) {
    const value = boardValue(record, field)

    if (typeof value === 'string' && value) options.add(value)
  }
  groups.push(
    ...[...options].map(value => ({
      value,
      label: field.id === 'item_type' ? t(`itemTypes.${value}`) : value
    }))
  )

  return groups
}
