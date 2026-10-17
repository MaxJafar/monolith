import type { Field, FieldConfig, RecordPage, RelationLink } from './shared'

/** Resolve only checkbox sources in the same authorized database snapshot. */
export function validProgressSources(
  config: FieldConfig['progress'],
  baseId: string,
  fields: Field[]
): boolean {
  if (!config || (!config.checkbox_ids.length && !config.relation)) return false
  const checkboxes = (ids: string[], base: string) =>
    new Set(ids).size === ids.length &&
    ids.every(
      id =>
        id === 'done' ||
        fields.some(
          f => f.id === id && f.base_id === base && f.kind === 'checkbox'
        )
    )
  if (!checkboxes(config.checkbox_ids, baseId)) return false
  if (!config.relation) return true
  const relation = fields.find(
    f =>
      f.id === config.relation!.field_id &&
      f.base_id === baseId &&
      f.kind === 'relation'
  )
  return (
    !!relation?.target_base_id &&
    config.relation.checkbox_ids.length > 0 &&
    checkboxes(config.relation.checkbox_ids, relation.target_base_id)
  )
}

type ProgressRecord = Pick<RecordPage, 'id' | 'base_id' | 'values' | 'done'>

export function progressValue(
  record: ProgressRecord,
  config: FieldConfig['progress'],
  fields: Field[],
  records: Map<string, ProgressRecord>,
  links: RelationLink[]
): number | null {
  // Deleted or converted sources must not silently inflate completion.
  if (!config || !validProgressSources(config, record.base_id, fields))
    return null
  const values: boolean[] = []
  const collect = (row: ProgressRecord, ids: string[]) => {
    for (const id of ids)
      values.push((id === 'done' ? row.done : row.values[id]) === true)
  }
  collect(record, config.checkbox_ids)
  if (config.relation) {
    const relation = fields.find(f => f.id === config.relation!.field_id)!
    const targets = new Set(
      links
        .filter(
          link =>
            link.source_record_id === record.id && link.field_id === relation.id
        )
        .map(link => link.target_record_id)
    )
    for (const id of targets) {
      const target = records.get(id)
      if (target?.base_id === relation.target_base_id)
        collect(target, config.relation.checkbox_ids)
    }
  }
  return values.length
    ? (values.filter(Boolean).length / values.length) * 100
    : 0
}
