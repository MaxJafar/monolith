import dayjs from 'dayjs'
import z from 'zod'

export const fieldKind = z.enum([
  'text',
  'number',
  'date',
  'checkbox',
  'select',
  'multi-select',
  'relation',
  'person'
])

export const viewMode = z.enum(['table', 'kanban', 'calendar'])

export const relativeDateWindow = z.enum([
  'today',
  'tomorrow',
  'this-week',
  'this-month',
  'next-7-days',
  'overdue'
])

export function isISODate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dayjs(value).isValid() &&
    dayjs(value).format('YYYY-MM-DD') === value
  )
}

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isISODate, 'Use a valid YYYY-MM-DD date')

export const cellValue = z.union([
  z.string().max(100000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(255)).max(500),
  z.null()
])

export const valuesSchema = z.record(z.string().uuid(), cellValue)

export const fieldConfigSchema = z.object({
  options: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  cardinality: z.enum(['one', 'many']).default('many'),
  reciprocal_field_id: z.string().uuid().nullable().default(null)
})

export const builtinProperty = z.enum([
  'title',
  'item_type',
  'done',
  'date',
  'end_date',
  'project_id'
])
export const propertyId = z.union([z.string().uuid(), builtinProperty])

/** Built-in properties read the canonical item, never a second copy in values. */
export function propertyValue(
  record: RecordPage,
  id: string,
  timeZone?: string
): CellValue | undefined {
  if (id === 'title') return record.title
  if (id === 'item_type') return record.item_type ?? 'page'
  if (id === 'done') return record.done ?? false
  if (id === 'project_id') return record.project_id ?? null
  if (id === 'date' || id === 'end_date') {
    const value = record[id]
    if (!value || !dayjs(value).isValid()) return null
    if (!timeZone) return dayjs(value).format('YYYY-MM-DD')
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(dayjs(value).toDate())
    const get = (type: string) => parts.find(part => part.type === type)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
  }
  return record.values[id]
}

export function viewProperties(
  baseId: string,
  labels: (key: string) => string
): Field[] {
  return [
    {
      id: 'item_type',
      name: labels('itemType'),
      kind: 'select',
      config: {
        options: ['page', 'task', 'note', 'project', 'event', 'post'],
        cardinality: 'one',
        reciprocal_field_id: null
      }
    },
    { id: 'done', name: labels('itemDone'), kind: 'checkbox' },
    { id: 'date', name: labels('itemDate'), kind: 'date' },
    { id: 'end_date', name: labels('itemEndDate'), kind: 'date' }
  ].map(field => ({
    config: fieldConfigSchema.parse({}),
    ...field,
    base_id: baseId,
    position: -1,
    target_base_id: null
  })) as Field[]
}

export const filterSchema = z.object({
  field_id: propertyId,
  operator: z.enum([
    'equals',
    'not-equals',
    'contains',
    'empty',
    'not-empty',
    'greater',
    'less',
    'before',
    'after',
    'on-or-before',
    'on-or-after',
    'relative-date',
    'includes',
    'not-includes',
    'includes-any',
    'includes-all'
  ]),
  value: cellValue.optional()
})

export const viewConfigSchema = z
  .object({
    filters: z.array(filterSchema).max(20).default([]),
    filter_groups: z
      .array(
        z.object({
          filter_logic: z.enum(['and', 'or']).default('and'),
          filters: z.array(filterSchema).max(20).default([])
        })
      )
      .max(5)
      .default([]),
    sorts: z
      .array(
        z.object({
          field_id: propertyId,
          direction: z.enum(['asc', 'desc'])
        })
      )
      .max(10)
      .default([]),
    hidden_fields: z.array(z.string().uuid()).max(100).default([]),
    filter_logic: z.enum(['and', 'or']).default('and'),
    group_property: z.enum(['item_type', 'done']).nullable().default(null),
    date_field_id: z
      .union([z.string().uuid(), z.enum(['date', 'end_date'])])
      .nullable()
      .default(null),
    end_date_field_id: z
      .union([z.string().uuid(), z.enum(['date', 'end_date'])])
      .nullable()
      .default(null)
  })
  .refine(
    config =>
      config.filters.length +
        config.filter_groups.reduce(
          (count, group) => count + group.filters.length,
          0
        ) <=
      50,
    'A view supports at most 50 conditions'
  )

export const personSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  kind: z.enum(['human', 'agent']),
  status: z.enum(['active', 'paused']).optional()
})

export const calendarFeedSchema = z.object({
  sources: z.array(
    z.object({
      source_id: z.string().uuid(),
      view_id: z.string().uuid(),
      base_id: z.string().uuid(),
      name: z.string(),
      base_name: z.string(),
      unscheduled_count: z.number().int().nonnegative()
    })
  ),
  items: z.array(
    z.object({
      id: z.string(),
      record_id: z.string().uuid(),
      title: z.string(),
      start: isoDate,
      end: isoDate,
      source_id: z.string().uuid(),
      tags: z.array(z.string()),
      owners: z.array(z.string().uuid()),
      href: z.string(),
      native_event_id: z.string().uuid().optional()
    })
  )
})

export type FieldKind = z.infer<typeof fieldKind>

export type CellValue = z.infer<typeof cellValue>

export type FieldConfig = z.infer<typeof fieldConfigSchema>

type ParsedViewConfig = z.infer<typeof viewConfigSchema>

export type ViewConfig = Pick<
  ParsedViewConfig,
  'filters' | 'sorts' | 'hidden_fields'
> &
  Partial<
    Pick<
      ParsedViewConfig,
      | 'filter_groups'
      | 'filter_logic'
      | 'date_field_id'
      | 'end_date_field_id'
      | 'group_property'
    >
  >

export type Person = z.infer<typeof personSchema>

export type CalendarFeed = z.infer<typeof calendarFeedSchema>

export type Field = {
  id: string
  base_id: string
  name: string
  kind: FieldKind
  config: FieldConfig
  target_base_id: string | null
  position: number
}

export type RecordPage = {
  id: string
  base_id: string
  title: string
  content: string
  item_type?: string
  done?: boolean
  date?: string | null
  end_date?: string | null
  project_id?: string | null
  values: Record<string, CellValue>
  updated: string
}

export type SavedView = {
  id: string
  base_id: string
  name: string
  mode: z.infer<typeof viewMode>
  group_field_id: string | null
  config: ViewConfig
}

export type Base = {
  id: string
  name: string
  description: string
  workspace_id?: string | null
  source_type?: string | null
}

export type RelationLink = {
  id: string
  field_id: string
  source_record_id: string
  target_record_id: string
}

export type Snapshot = {
  bases: Base[]
  fields: Field[]
  records: RecordPage[]
  views: SavedView[]
  links: RelationLink[]
}

export function displayValue(value: CellValue | undefined): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? '✓' : '—'

  return String(value)
}

export function applyView(
  records: RecordPage[],
  view: SavedView | undefined,
  links: RelationLink[] = [],
  context: { today?: string; timeZone?: string } = {}
): RecordPage[] {
  if (!view) return records

  const today = context.today ?? dayjs().format('YYYY-MM-DD')

  if (!isISODate(today))
    throw new Error('Use a valid YYYY-MM-DD reference date')

  const getValue = (record: RecordPage, field: string): CellValue | undefined =>
    propertyValue(record, field, context.timeZone) ??
    links
      .filter(
        link => link.field_id === field && link.source_record_id === record.id
      )
      .map(link => link.target_record_id)
  const filtered = records.filter(record => {
    const matches = (filter: ViewConfig['filters'][number]) => {
      const value = getValue(record, filter.field_id)
      const empty =
        value == null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)

      if (filter.operator === 'empty') return empty
      if (filter.operator === 'not-empty') return !empty
      if (filter.operator === 'contains')
        return Array.isArray(value)
          ? value.includes(String(filter.value))
          : displayValue(value)
              .toLowerCase()
              .includes(displayValue(filter.value).toLowerCase())

      if (
        ['includes', 'not-includes', 'includes-any', 'includes-all'].includes(
          filter.operator
        )
      ) {
        const members = Array.isArray(value)
          ? value
          : typeof value === 'string' && value
            ? [value]
            : []

        if (
          filter.operator === 'includes' ||
          filter.operator === 'not-includes'
        ) {
          const has =
            typeof filter.value === 'string' && members.includes(filter.value)

          return filter.operator === 'includes' ? has : !has
        }
        if (!Array.isArray(filter.value) || !filter.value.length) return false

        return filter.operator === 'includes-any'
          ? filter.value.some(item => members.includes(item))
          : filter.value.every(item => members.includes(item))
      }

      if (
        ['before', 'after', 'on-or-before', 'on-or-after'].includes(
          filter.operator
        )
      ) {
        if (!isISODate(value) || !isISODate(filter.value)) return false

        if (filter.operator === 'before') return value < filter.value
        if (filter.operator === 'after') return value > filter.value
        if (filter.operator === 'on-or-before') return value <= filter.value

        return value >= filter.value
      }

      if (filter.operator === 'relative-date') {
        if (!isISODate(value)) return false

        const reference = dayjs(today)
        const monday = reference.subtract((reference.day() + 6) % 7, 'day')

        if (filter.value === 'today') return value === today
        if (filter.value === 'tomorrow')
          return value === reference.add(1, 'day').format('YYYY-MM-DD')
        if (filter.value === 'overdue') return value < today
        if (filter.value === 'this-week')
          return (
            value >= monday.format('YYYY-MM-DD') &&
            value <= monday.add(6, 'day').format('YYYY-MM-DD')
          )
        if (filter.value === 'this-month')
          return (
            value >= reference.startOf('month').format('YYYY-MM-DD') &&
            value <= reference.endOf('month').format('YYYY-MM-DD')
          )
        if (filter.value === 'next-7-days')
          return (
            value >= today &&
            value <= reference.add(6, 'day').format('YYYY-MM-DD')
          )

        return false
      }
      if (filter.operator === 'greater')
        return (
          typeof value === 'number' &&
          typeof filter.value === 'number' &&
          value > filter.value
        )
      if (filter.operator === 'less')
        return (
          typeof value === 'number' &&
          typeof filter.value === 'number' &&
          value < filter.value
        )

      const equal = Array.isArray(value)
        ? value.includes(String(filter.value))
        : value === filter.value

      return filter.operator === 'equals' ? equal : !equal
    }

    const results = [
      ...view.config.filters.map(matches),
      ...(view.config.filter_groups ?? [])
        .filter(group => group.filters.length)
        .map(group =>
          group.filter_logic === 'or'
            ? group.filters.some(matches)
            : group.filters.every(matches)
        )
    ]

    return (
      !results.length ||
      (view.config.filter_logic === 'or'
        ? results.some(Boolean)
        : results.every(Boolean))
    )
  })

  return [...filtered].sort((a, b) => {
    for (const sort of view.config.sorts) {
      const left = getValue(a, sort.field_id),
        right = getValue(b, sort.field_id)
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : displayValue(left).localeCompare(displayValue(right), undefined, {
              numeric: true
            })

      if (order) return sort.direction === 'asc' ? order : -order
    }

    return a.id.localeCompare(b.id)
  })
}
