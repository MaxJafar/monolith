import {
  type CellValue,
  type Field,
  type RecordPage,
  type RelationLink,
  propertyValue
} from '../../../shared'

export type BoardGroup = { value: CellValue; label: string }

export const boardColumnWidth = (width = 280) =>
  Math.round(Math.max(240, Math.min(640, width)))

export const boardGroupKey = (fieldId: string, value: CellValue) =>
  JSON.stringify([fieldId, value])

export function orderedBoardGroups(
  groups: BoardGroup[],
  fieldId: string,
  order: string[] = []
) {
  const positions = new Map(order.map((key, index) => [key, index]))
  return [...groups].sort(
    (a, b) =>
      (positions.get(boardGroupKey(fieldId, a.value)) ?? Infinity) -
      (positions.get(boardGroupKey(fieldId, b.value)) ?? Infinity)
  )
}

/** Keep collapsed and temporarily absent groups in their saved positions. */
export function insertBoardGroup(
  keys: string[],
  order: string[],
  key: string,
  before: string | null
) {
  const next = [...new Set([...order, ...keys])].filter(value => value !== key)
  const index = before === null ? -1 : next.indexOf(before)
  next.splice(index < 0 ? next.length : index, 0, key)
  return next
}

export function boardCellKey(
  field: Field,
  value: CellValue,
  subgroup?: Field,
  section: CellValue = null
) {
  return JSON.stringify([field.id, value, subgroup?.id ?? null, section])
}

export function orderedBoardRecords(
  records: RecordPage[],
  order: string[] = []
) {
  const positions = new Map(order.map((id, i) => [id, i]))
  return [...records].sort(
    (a, b) =>
      (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity)
  )
}

/** Retain filtered-out cards when inserting relative to a visible neighbour. */
export function insertBoardRecord(
  records: RecordPage[],
  order: string[],
  id: string,
  before: string | null
) {
  const ids = orderedBoardRecords(records, order)
    .map(record => record.id)
    .filter(value => value !== id)
  const index = before === null ? -1 : ids.indexOf(before)
  ids.splice(index < 0 ? ids.length : index, 0, id)
  return ids
}

export function boardValue(record: RecordPage, field: Field): CellValue {
  const value = propertyValue(record, field.id)

  return field.kind === 'checkbox'
    ? value === true
    : value === ''
      ? null
      : (value ?? null)
}

export function boardValues(
  record: RecordPage,
  field: Field,
  links: RelationLink[] = []
): CellValue[] {
  const raw =
    field.kind === 'relation' && field.id !== 'project_id'
      ? links
          .filter(
            link =>
              link.field_id === field.id && link.source_record_id === record.id
          )
          .map(link => link.target_record_id)
      : boardValue(record, field)
  return Array.isArray(raw) ? (raw.length ? [...new Set(raw)] : [null]) : [raw]
}

/** Keep legacy option values visible even when their schema option was removed. */
export function boardGroups(
  field: Field,
  records: RecordPage[],
  t: (key: string) => string,
  links: RelationLink[] = [],
  label?: (value: string) => string
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
    for (const value of boardValues(record, field, links))
      if (typeof value === 'string' && value) options.add(value)
  }
  groups.push(
    ...[...options].map(value => ({
      value,
      label:
        field.id === 'item_type'
          ? t(`itemTypes.${value}`)
          : (label?.(value) ?? value)
    }))
  )

  return groups
}
