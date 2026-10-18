import { ClientError } from '@monolith/server-utils'
import z from 'zod'

import { computedKinds, numericKinds, textKinds } from '../computed'
import {
  type CellValue,
  type Field,
  type SavedView,
  isISODate,
  relativeDateWindow,
  viewProperties
} from '../shared'

const uuid = z.string().uuid()

export function ownerId(res: { locals: Record<string, unknown> }): string {
  const id: unknown = res.locals.userId

  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
    throw new ClientError('Authentication required', 401)

  return id
}

export function validateValues(
  fields: Field[],
  values: Record<string, CellValue>,
  people: readonly string[] = []
) {
  for (const [id, value] of Object.entries(values)) {
    const field = fields.find(field => field.id === id)

    if (!field) throw new ClientError('Unknown field')
    if (computedKinds.has(field.kind)) {
      delete values[id]
      continue
    }
    if (field.kind === 'relation')
      throw new ClientError(
        'Relations must be updated through the links endpoint'
      )
    if (value == null) continue

    const valid = textKinds.has(field.kind)
      ? typeof value === 'string'
      : field.kind === 'number'
        ? typeof value === 'number' && Number.isFinite(value)
        : field.kind === 'checkbox'
          ? typeof value === 'boolean'
          : field.kind === 'person'
            ? typeof value === 'string' && people.includes(value)
            : field.kind === 'date'
              ? isISODate(value)
              : field.kind === 'select' || field.kind === 'status'
                ? typeof value === 'string' &&
                  (value === '' || field.config.options.includes(value))
                : field.kind === 'files'
                  ? Array.isArray(value) &&
                    value.every(url => /^https?:\/\/[^\s]+$/i.test(url))
                  : Array.isArray(value) &&
                    new Set(value).size === value.length &&
                    value.every(option => field.config.options.includes(option))

    if (!valid) throw new ClientError(`Invalid value for ${field.name}`)
  }
}

export function convertFieldValue(
  field: Field,
  candidate: Field,
  value: CellValue,
  people: readonly string[] = []
): CellValue {
  if (
    field.kind !== candidate.kind &&
    (computedKinds.has(field.kind) || computedKinds.has(candidate.kind))
  )
    throw new ClientError(
      'Computed properties cannot change type; create a new property to preserve existing values'
    )
  if (field.kind === 'relation' || candidate.kind === 'relation')
    throw new ClientError(
      'Relation fields cannot change type; create a new field'
    )
  if (value == null) return value

  validateValues([field], { [field.id]: value }, people)

  if (field.kind === candidate.kind) {
    validateValues([candidate], { [candidate.id]: value }, people)

    return value
  }

  let converted: CellValue = value

  if (Array.isArray(value)) {
    if (value.length > 1 || !['text', 'select'].includes(candidate.kind))
      throw new ClientError('Multiple selections cannot become a single value')
    converted = value[0] ?? ''
  } else if (candidate.kind === 'multi-select') {
    if (typeof value !== 'string')
      throw new ClientError(
        'Multi-select conversion requires text or a selection'
      )
    converted = value === '' ? [] : [value]
  } else if (candidate.kind === 'text' || candidate.kind === 'select') {
    converted = String(value)
  } else if (candidate.kind === 'person' && typeof value === 'string') {
    converted = value
  } else if (candidate.kind === 'number' && typeof value === 'string') {
    const number = Number(value)

    if (!Number.isFinite(number) || String(number) !== value)
      throw new ClientError('Use a canonical number such as 42 or 1.5 first')
    converted = number
  } else if (candidate.kind === 'checkbox' && typeof value === 'string') {
    if (value !== 'true' && value !== 'false')
      throw new ClientError('Use exactly true or false first')
    converted = value === 'true'
  } else if (candidate.kind !== 'date' || typeof value !== 'string') {
    throw new ClientError('This value cannot be converted without data loss')
  }
  validateValues([candidate], { [candidate.id]: converted }, people)

  return converted
}

export function convertViewField(
  view: SavedView,
  field: Field,
  candidate: Field,
  people: readonly string[] = []
): SavedView {
  if (field.kind === candidate.kind) return view

  const convertFilter = (filter: SavedView['config']['filters'][number]) => {
    if (
      filter.field_id !== field.id ||
      ['empty', 'not-empty'].includes(filter.operator)
    )
      return filter
    if (
      [
        'greater',
        'less',
        'before',
        'after',
        'on-or-before',
        'on-or-after',
        'relative-date'
      ].includes(filter.operator)
    )
      throw new ClientError(
        'Remove or change its typed comparison filter first'
      )

    if (filter.operator === 'contains') {
      if (
        !['text', 'select', 'multi-select'].includes(candidate.kind) ||
        field.kind === 'multi-select' ||
        candidate.kind === 'multi-select'
      )
        throw new ClientError('Remove or change its contains filter first')

      return filter
    }

    if (
      ['includes', 'not-includes', 'includes-any', 'includes-all'].includes(
        filter.operator
      )
    ) {
      if (!['multi-select', 'relation', 'person'].includes(candidate.kind))
        throw new ClientError('Remove or change its membership filter first')

      return filter
    }
    if (filter.value == null) throw new ClientError('Filter value required')
    if (
      filter.value === '' &&
      (field.kind === 'multi-select' || candidate.kind === 'multi-select')
    )
      throw new ClientError(
        'Empty selection equality changes meaning; use an empty filter first'
      )

    // Multi-select equality tests membership, so its operand stays scalar.
    const from =
      field.kind === 'multi-select'
        ? { ...field, kind: 'select' as const }
        : field
    const to =
      candidate.kind === 'multi-select'
        ? { ...candidate, kind: 'select' as const }
        : candidate

    return {
      ...filter,
      value: convertFieldValue(from, to, filter.value, people)
    }
  }

  return {
    ...view,
    config: {
      ...view.config,
      filters: view.config.filters.map(convertFilter),
      filter_groups: (view.config.filter_groups ?? []).map(group => ({
        ...group,
        filters: group.filters.map(convertFilter)
      }))
    }
  }
}

export function validateView(
  fields: Field[],
  view: Pick<SavedView, 'mode' | 'group_field_id' | 'config'>,
  people: readonly string[] = []
) {
  const properties = [...viewProperties('', key => key), ...fields]
  const getField = (id: string) => {
    if (id === 'title') return { kind: 'text' as const, name: 'Title' }

    const field = properties.find(field => field.id === id)

    if (!field) throw new ClientError('View refers to an unknown field')

    return field
  }

  if (view.mode === 'kanban') {
    if (view.group_field_id && view.config.group_property)
      throw new ClientError('Choose one Kanban group property')
    const field = properties.find(
      field => field.id === (view.config.group_property ?? view.group_field_id)
    )

    if (
      !field ||
      ![
        'select',
        'status',
        'checkbox',
        'multi-select',
        'relation',
        'person'
      ].includes(field.kind)
    )
      throw new ClientError('Kanban requires a select or checkbox field')
  }

  if (view.mode === 'calendar' || view.mode === 'timeline') {
    const start = properties.find(
      field => field.id === view.config.date_field_id
    )
    const end = view.config.end_date_field_id
      ? properties.find(field => field.id === view.config.end_date_field_id)
      : null

    if (!start || start.kind !== 'date')
      throw new ClientError('Calendar requires a date field from this database')
    if (view.config.end_date_field_id && (!end || end.kind !== 'date'))
      throw new ClientError(
        'Calendar end must be a date field from this database'
      )
  }
  if (view.config.chart) {
    if (view.config.chart.group_by) getField(view.config.chart.group_by)
    if (view.config.chart.value_field && !numericKinds.has(getField(view.config.chart.value_field).kind))
      throw new ClientError('Chart values require a numeric property')
    if (view.config.chart.aggregation !== 'count' && !view.config.chart.value_field)
      throw new ClientError('Choose a numeric property for this chart aggregation')
  }
  if (view.group_field_id) getField(view.group_field_id)
  for (const id of view.config.hidden_fields) getField(id)
  for (const id of view.config.property_order ?? []) getField(id)
  for (const id of [
    view.config.collection_group_by,
    view.config.sub_group_by
  ]) {
    if (
      id &&
      ![
        'select',
        'status',
        'checkbox',
        'multi-select',
        'relation',
        'person'
      ].includes(getField(id).kind)
    )
      throw new ClientError(
        'Grouping requires a select, status or checkbox property'
      )
  }
  for (const sort of view.config.sorts) getField(sort.field_id)

  for (const filter of [
    ...view.config.filters,
    ...(view.config.filter_groups ?? []).flatMap(group => group.filters)
  ]) {
    const field = getField(filter.field_id)

    if (['empty', 'not-empty'].includes(filter.operator)) continue
    if (filter.value == null) throw new ClientError('Filter value required')

    if (
      ['before', 'after', 'on-or-before', 'on-or-after'].includes(
        filter.operator
      )
    ) {
      if (
        !['date', 'created-time', 'last-edited-time'].includes(field.kind) ||
        !isISODate(filter.value)
      )
        throw new ClientError(
          'Date comparison requires a date field and valid YYYY-MM-DD value'
        )

      continue
    }

    if (filter.operator === 'relative-date') {
      if (
        !['date', 'created-time', 'last-edited-time'].includes(field.kind) ||
        !relativeDateWindow.safeParse(filter.value).success
      )
        throw new ClientError(
          'Relative date filter requires a date field and known window'
        )

      continue
    }

    if (
      ['includes', 'not-includes', 'includes-any', 'includes-all'].includes(
        filter.operator
      )
    ) {
      if (!['multi-select', 'relation', 'person'].includes(field.kind))
        throw new ClientError(
          'Membership requires tags, relation or person field'
        )

      const multiple = ['includes-any', 'includes-all'].includes(
        filter.operator
      )
      const operands =
        multiple && Array.isArray(filter.value) ? filter.value : [filter.value]

      if (multiple && (!Array.isArray(filter.value) || !filter.value.length))
        throw new ClientError('Membership requires at least one value')
      if (new Set(operands).size !== operands.length)
        throw new ClientError('Membership values must be unique')

      for (const value of operands) {
        if (typeof value !== 'string' || !value)
          throw new ClientError(
            'Membership requires text identifiers or options'
          )
        if (
          'config' in field &&
          field.kind === 'multi-select' &&
          !field.config.options.includes(value)
        )
          throw new ClientError(
            'Filter refers to an unavailable selection option'
          )
        if (field.kind === 'relation' && !uuid.safeParse(value).success)
          throw new ClientError('Relation filter requires a record identifier')
        if (field.kind === 'person' && !people.includes(value))
          throw new ClientError('Person filter must use an owned principal')
      }

      continue
    }

    if (filter.operator === 'contains') {
      if (
        ![...textKinds, 'select', 'status', 'multi-select'].includes(
          field.kind
        ) ||
        typeof filter.value !== 'string'
      )
        throw new ClientError(
          'Contains requires a text or selection field and text value'
        )
      if (
        'config' in field &&
        field.kind === 'multi-select' &&
        !field.config.options.includes(filter.value)
      )
        throw new ClientError(
          'Filter refers to an unavailable selection option'
        )

      continue
    }
    if (
      ['greater', 'less'].includes(filter.operator) &&
      (!numericKinds.has(field.kind) || typeof filter.value !== 'number')
    )
      throw new ClientError(
        'Numeric comparison requires a number field and value'
      )
    if (field.kind === 'checkbox' && typeof filter.value !== 'boolean')
      throw new ClientError('Checkbox filter requires true or false')
    if (numericKinds.has(field.kind) && typeof filter.value !== 'number')
      throw new ClientError('Number filter requires a numeric value')
    if (
      ['person', 'created-by', 'last-edited-by'].includes(field.kind) &&
      (typeof filter.value !== 'string' || !people.includes(filter.value))
    )
      throw new ClientError('Person filter must use an owned principal')

    if (
      [
        ...textKinds,
        'date',
        'select',
        'status',
        'multi-select',
        'created-time',
        'last-edited-time'
      ].includes(field.kind)
    ) {
      if (typeof filter.value !== 'string')
        throw new ClientError('Text and selection filters require a text value')
      if (
        'config' in field &&
        ['select', 'status', 'multi-select'].includes(field.kind) &&
        filter.value !== '' &&
        !field.config.options.includes(filter.value)
      )
        throw new ClientError(
          'Filter refers to an unavailable selection option'
        )
      if ('config' in field && field.kind === 'date')
        validateValues([field], { [field.id]: filter.value })
    }
    if (
      field.kind === 'relation' &&
      (typeof filter.value !== 'string' ||
        !uuid.safeParse(filter.value).success)
    )
      throw new ClientError('Relation filter requires a record identifier')
  }
}

export function validateCalendarValue(
  view: Pick<SavedView, 'mode' | 'config' | 'name'>,
  values: Record<string, CellValue>
) {
  if (
    view.mode !== 'calendar' ||
    !view.config.date_field_id ||
    !view.config.end_date_field_id
  )
    return

  const start = values[view.config.date_field_id]
  const end = values[view.config.end_date_field_id]

  if (isISODate(start) && isISODate(end) && end < start)
    throw new ClientError(
      `Calendar "${view.name}" ends before it starts; change its end date`
    )
}
