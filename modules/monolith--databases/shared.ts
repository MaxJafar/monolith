import { appearanceSchema } from '@monolith/blocks'
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
  'person',
  'status',
  'url',
  'email',
  'phone',
  'files',
  'place',
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

export const viewMode = z.enum([
  'table',
  'kanban',
  'calendar',
  'gallery',
  'list',
  'chart',
  'dashboard',
  'timeline'
])

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
  z.array(z.string().max(2048)).max(500),
  z.null()
])

export const valuesSchema = z.record(z.string().uuid(), cellValue)

export const recordCommentSchema = z.object({
  id: z.string().uuid(),
  author_id: z.string().uuid(),
  text: z.string().trim().min(1).max(10000),
  created: z.string().datetime()
})
export const pageTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  content: z.string().max(1000000).default(''),
  description: z.string().max(10000).default(''),
  appearance: appearanceSchema.default({}),
  values: valuesSchema.default({})
})
export type PageTemplate = z.infer<typeof pageTemplateSchema>

export const fieldConfigSchema = z.object({
  progress: z
    .object({
      checkbox_ids: z
        .array(z.union([z.string().uuid(), z.literal('done')]))
        .max(100)
        .default([]),
      relation: z
        .object({
          field_id: z.string().uuid(),
          checkbox_ids: z
            .array(z.union([z.string().uuid(), z.literal('done')]))
            .min(1)
            .max(100)
        })
        .optional(),
      show_number: z.boolean().default(true),
      color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .optional()
    })
    .optional(),
  formula: z.string().max(2000).optional(),
  button_url: z
    .string()
    .max(2048)
    .refine(
      value => !value || /^https?:\/\/[^\s]+$/i.test(value),
      'Use an HTTP or HTTPS URL'
    )
    .optional(),
  rollup: z
    .object({
      relation_id: z.string().uuid(),
      property_id: z.string().max(80),
      aggregation: z.enum([
        'count',
        'sum',
        'average',
        'min',
        'max',
        'checked-percent'
      ])
    })
    .optional(),
  options: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  option_colors: z
    .record(z.string().max(255), z.string().regex(/^#[0-9a-f]{6}$/i))
    .refine(value => Object.keys(value).length <= 100)
    .optional(),
  cardinality: z.enum(['one', 'many']).default('many'),
  reciprocal_field_id: z.string().uuid().nullable().default(null)
})

export const builtinProperty = z.enum([
  'title',
  'item_type',
  'done',
  'status',
  'priority',
  'tags',
  'date',
  'end_date',
  'project_id'
])

export const propertyId = z.union([z.string().uuid(), builtinProperty])

function calendarDate(value: string, timeZone?: string): string | null {
  if (!dayjs(value).isValid()) return null
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

/** Built-in properties read the canonical item, never a second copy in values. */
export function propertyValue(
  record: RecordPage,
  id: string,
  timeZone?: string
): CellValue | undefined {
  if (id === 'title') return record.title
  if (id === 'item_type') return record.item_type ?? 'page'
  if (id === 'done') return record.done ?? false
  if (id === 'status')
    return record.done ? 'done' : (record.status ?? 'planned')
  if (id === 'priority') return record.priority ?? 'normal'
  if (id === 'tags') return record.tags ?? []
  if (id === 'project_id') return record.project_id ?? null

  if (id === 'date' || id === 'end_date') {
    const value = record[id]

    return value ? calendarDate(value, timeZone) : null
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
    {
      id: 'status',
      name: labels('itemStatus'),
      kind: 'select',
      config: {
        options: ['planned', 'active', 'done'],
        cardinality: 'one',
        reciprocal_field_id: null
      }
    },
    {
      id: 'priority',
      name: labels('itemPriority'),
      kind: 'select',
      config: {
        options: ['low', 'normal', 'high', 'urgent'],
        cardinality: 'one',
        reciprocal_field_id: null
      }
    },
    { id: 'tags', name: labels('itemTags'), kind: 'multi-select' },
    { id: 'project_id', name: labels('itemProject'), kind: 'relation' },
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
    tab: z
      .object({
        icon: z.string().max(120).optional(),
        icon_color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .optional(),
        text_color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .optional(),
        display: z.enum(['both', 'text', 'icon']).optional()
      })
      .optional(),
    color: z
      .object({
        by: z.union([propertyId, z.enum(['none', 'solid'])]),
        palette: z
          .record(z.string().max(255), z.string().regex(/^#[0-9a-f]{6}$/i))
          .refine(value => Object.keys(value).length <= 100),
        columns: z.boolean()
      })
      .optional(),
    chart: z
      .object({
        group_by: propertyId.nullable().default(null),
        value_field: propertyId.nullable().default(null),
        aggregation: z.enum(['count', 'sum', 'average']).default('count')
      })
      .optional(),
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
    property_order: z.array(z.string().uuid()).max(100).default([]),
    board_order: z
      .record(z.string().max(1024), z.array(z.string().uuid()).max(10000))
      .refine(
        order => Object.keys(order).length <= 500,
        'Too many board columns'
      )
      .default({}),
    board_layout: z
      .object({
        order: z
          .record(z.string().max(1024), z.array(z.string().max(1024)).max(500))
          .default({}),
        columns: z
          .record(
            z.string().max(1024),
            z.object({
              width: z.number().int().min(240).max(640).optional(),
              collapsed: z.boolean().optional()
            })
          )
          .default({}),
        collapsed_sections: z.array(z.string().max(1024)).max(500).default([])
      })
      .refine(
        layout =>
          Object.keys(layout.order).length <= 100 &&
          Object.keys(layout.columns).length <= 500,
        'Too many board layout entries'
      )
      .default({ order: {}, columns: {}, collapsed_sections: [] }),
    collection_group_by: propertyId.nullable().default(null),
    sub_group_by: propertyId.nullable().default(null),
    wrap_cells: z.boolean().default(true),
    show_item_type: z.boolean().default(true),
    show_card_properties: z.boolean().default(true),
    show_page_properties: z.boolean().default(true),
    locked: z.boolean().default(false),
    filter_logic: z.enum(['and', 'or']).default('and'),
    group_property: z
      .enum(['item_type', 'done', 'status', 'priority', 'tags', 'project_id'])
      .nullable()
      .default(null),
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
      | 'color'
      | 'tab'
      | 'chart'
      | 'filter_groups'
      | 'filter_logic'
      | 'date_field_id'
      | 'end_date_field_id'
      | 'group_property'
      | 'property_order'
      | 'board_order'
      | 'board_layout'
      | 'collection_group_by'
      | 'sub_group_by'
      | 'wrap_cells'
      | 'show_item_type'
      | 'show_card_properties'
      | 'show_page_properties'
      | 'locked'
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
  owner_id?: string
  created_by?: string | null
  updated_by?: string | null
  appearance?: z.infer<typeof appearanceSchema>
  description?: string
  comments?: z.infer<typeof recordCommentSchema>[]
  created?: string
  status?: string
  priority?: string
  tags?: string[]
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
  templates?: PageTemplate[]
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
      let value = getValue(record, filter.field_id)
      // Timestamp properties use the same calendar-day filters as date properties.
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
        ([
          'before',
          'after',
          'on-or-before',
          'on-or-after',
          'relative-date'
        ].includes(filter.operator) ||
          (['equals', 'not-equals'].includes(filter.operator) &&
            isISODate(filter.value)))
      )
        value = calendarDate(value, context.timeZone)
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
