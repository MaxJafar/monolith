import { progressValue } from './progress'
import type { CellValue, Field, RecordPage, RelationLink } from './shared'

export const computedKinds = new Set([
  'formula',
  'rollup',
  'progress',
  'button',
  'unique-id',
  'created-time',
  'last-edited-time',
  'created-by',
  'last-edited-by'
])
export const textKinds = new Set([
  'text',
  'url',
  'email',
  'phone',
  'place',
  'unique-id'
])
export const numericKinds = new Set(['number', 'formula', 'rollup', 'progress'])

/** Arithmetic parser; no JavaScript evaluation or executable property content. */
export function evaluateFormula(
  expression: string,
  property: (name: string) => CellValue | undefined
): number | null {
  try {
    const source = expression
      .replace(/prop\("([^"\\]{1,255})"\)/g, (_, name: string) => {
        const value = property(name)
        if (value === null || value === undefined || value === '') return '0'
        if (typeof value !== 'number' && typeof value !== 'boolean')
          throw Error('Non numeric property')
        return `(${Number(value)})`
      })
      .replace(/\s/g, '')
    if (!source || source.length > 12000) return null
    const tokens =
      source.match(/(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?|[()+*/%-]/gi) ?? []
    if (tokens.join('') !== source || tokens.length > 1000) return null
    let i = 0,
      depth = 0
    const atom = (): number => {
      if (++depth > 50) throw Error('Too deep')
      const token = tokens[i++]
      let value: number
      if (token === '+' || token === '-')
        value = (token === '-' ? -1 : 1) * atom()
      else if (token === '(') {
        value = add()
        if (tokens[i++] !== ')') throw Error('Missing bracket')
      } else {
        value = Number(token)
        if (token === undefined || !Number.isFinite(value))
          throw Error('Invalid number')
      }
      depth--
      return value
    }
    const multiply = (): number => {
      let v = atom()
      while (['*', '/', '%'].includes(tokens[i] ?? '')) {
        const op = tokens[i++],
          next = atom()
        v = op === '*' ? v * next : op === '/' ? v / next : v % next
      }
      return v
    }
    const add = (): number => {
      let v = multiply()
      while (tokens[i] === '+' || tokens[i] === '-') {
        const op = tokens[i++],
          next = multiply()
        v = op === '+' ? v + next : v - next
      }
      return v
    }
    const value = add()
    return i === tokens.length && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

/** Compute from the same visible snapshot, with bounded dependency cycles. */
type ComputableRecord = Pick<
  RecordPage,
  | 'id'
  | 'base_id'
  | 'values'
  | 'done'
  | 'owner_id'
  | 'created_by'
  | 'updated_by'
> & { created?: string | Date; updated: string | Date }
export function computeRecords<T extends ComputableRecord>(
  records: T[],
  fields: Field[],
  links: RelationLink[]
): T[] {
  const rows = new Map(records.map(record => [record.id, record])),
    memo = new Map<string, CellValue>(),
    pending = new Set<string>(),
    invalid = new Set<string>()
  const baseFields = new Map<string, Field[]>()
  for (const field of fields) {
    const list = baseFields.get(field.base_id) ?? []
    list.push(field)
    baseFields.set(field.base_id, list)
  }
  const value = (record: T, field: Field, depth = 0): CellValue => {
    if (!computedKinds.has(field.kind)) return record.values[field.id] ?? null
    const key = `${record.id}:${field.id}`
    if (memo.has(key)) return memo.get(key)!
    if (pending.has(key) || depth > 20) {
      for (const dependency of pending) invalid.add(dependency)
      return null
    }
    pending.add(key)
    let result: CellValue = null
    if (field.kind === 'unique-id') result = record.id
    else if (field.kind === 'created-time')
      result =
        record.created instanceof Date
          ? record.created.toISOString()
          : (record.created ?? null)
    else if (field.kind === 'last-edited-time')
      result =
        record.updated instanceof Date
          ? record.updated.toISOString()
          : record.updated
    else if (field.kind === 'created-by')
      result = record.created_by ?? record.owner_id ?? null
    else if (field.kind === 'last-edited-by')
      result = record.updated_by ?? record.owner_id ?? null
    else if (field.kind === 'button') result = field.config.button_url ?? null
    else if (field.kind === 'progress')
      result = progressValue(record, field.config.progress, fields, rows, links)
    else if (field.kind === 'formula')
      result = evaluateFormula(field.config.formula ?? '', name => {
        const target = baseFields
          .get(record.base_id)
          ?.find(f => f.id === name || f.name === name)
        if (!target) throw Error('Unknown property')
        return value(record, target, depth + 1)
      })
    else if (field.kind === 'rollup' && field.config.rollup) {
      const config = field.config.rollup,
        relation = fields.find(
          f =>
            f.id === config.relation_id &&
            f.base_id === record.base_id &&
            f.kind === 'relation'
        )
      const related = relation
        ? links
            .filter(
              link =>
                link.source_record_id === record.id &&
                link.field_id === relation.id
            )
            .map(link => rows.get(link.target_record_id))
            .filter((r): r is T => !!r && r.base_id === relation.target_base_id)
        : []
      const target = fields.find(
        f =>
          f.id === config.property_id && f.base_id === relation?.target_base_id
      )
      const values = related.map(r =>
        target
          ? value(r, target, depth + 1)
          : config.property_id === 'done'
            ? (r.done ?? false)
            : null
      )
      const numbers = values.filter((v): v is number => typeof v === 'number')
      if (config.aggregation === 'count') result = related.length
      else if (config.aggregation === 'checked-percent')
        result = values.length
          ? (100 * values.filter(v => v === true).length) / values.length
          : 0
      else if (numbers.length) {
        const sum = numbers.reduce((a, b) => a + b, 0)
        result =
          config.aggregation === 'sum'
            ? sum
            : config.aggregation === 'average'
              ? sum / numbers.length
              : config.aggregation === 'min'
                ? Math.min(...numbers)
                : Math.max(...numbers)
      }
    }
    if (invalid.has(key)) result = null
    pending.delete(key)
    memo.set(key, result)
    return result
  }
  return records.map(record => ({
    ...record,
    values: {
      ...record.values,
      ...Object.fromEntries(
        (baseFields.get(record.base_id) ?? [])
          .filter(f => computedKinds.has(f.kind))
          .map(f => [f.id, value(record, f)])
      )
    }
  }))
}
