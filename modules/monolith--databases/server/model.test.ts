import { describe, expect, it } from 'vitest'

import { computeRecords, evaluateFormula } from '../computed'
import { validProgressSources } from '../progress'
import {
  type Field,
  type RecordPage,
  type SavedView,
  applyView,
  viewConfigSchema
} from '../shared'
import {
  convertViewField,
  ownerId,
  validateCalendarValue,
  validateValues,
  validateView
} from './model'

const id = '11111111-1111-4111-8111-111111111111'
const field: Field = {
  id,
  base_id: id,
  name: 'Value',
  kind: 'date',
  position: 0,
  target_base_id: null,
  config: { options: [], cardinality: 'many', reciprocal_field_id: null }
}
describe('Database property/view semantics', () => {
  it('persists column layout without changing old views and rejects invalid dimensions', () => {
    expect(viewConfigSchema.parse({}).board_layout).toEqual({
      order: {},
      columns: {},
      collapsed_sections: []
    })
    const key = '["done",false]'
    const layout = {
      order: { done: [key] },
      columns: { [key]: { width: 360, collapsed: true } },
      collapsed_sections: ['["status","Waiting"]']
    }
    expect(
      viewConfigSchema.parse({ board_layout: layout }).board_layout
    ).toEqual(layout)
    for (const width of [0, 239, 641, 300.5]) {
      expect(() =>
        viewConfigSchema.parse({
          board_layout: { columns: { [key]: { width } } }
        })
      ).toThrow()
    }
  })
  it('persists manual board order while accepting older views without it', () => {
    expect(viewConfigSchema.parse({}).board_order).toEqual({})
    const order = { '["done",false,null,null]': [id] }
    expect(viewConfigSchema.parse({ board_order: order }).board_order).toEqual(
      order
    )
    expect(() =>
      viewConfigSchema.parse({ board_order: { column: ['invalid-id'] } })
    ).toThrow()
  })
  it('validates grouping and ordered properties against the database schema', () => {
    const view = {
      mode: 'table' as const,
      group_field_id: null,
      config: viewConfigSchema.parse({
        collection_group_by: id,
        property_order: [id]
      })
    }
    expect(() => validateView([field], view)).toThrow('Grouping requires')
    expect(() =>
      validateView([{ ...field, kind: 'status' }], view)
    ).not.toThrow()
    expect(() => validateView([], view)).toThrow('unknown field')
  })
  it('filters timestamp properties by calendar day', () => {
    const view = {
      id,
      base_id: id,
      name: 'Recent',
      mode: 'table' as const,
      group_field_id: null,
      position: 0,
      config: viewConfigSchema.parse({
        filters: [
          { field_id: id, operator: 'on-or-before', value: '2026-10-14' }
        ]
      })
    }
    const timestampField = { ...field, kind: 'created-time' as const }
    expect(() => validateView([timestampField], view)).not.toThrow()
    const rows = [
      {
        id,
        base_id: id,
        title: 'A',
        content: '',
        updated: '',
        values: { [id]: '2026-10-14T10:00:00Z' }
      }
    ]
    expect(applyView(rows, view, [], { today: '2026-10-14' })).toHaveLength(1)
    rows[0]!.values[id] = '2026-10-14T22:30:00Z'
    view.config.filters = [
      { field_id: id, operator: 'equals', value: '2026-10-15' }
    ]
    expect(
      applyView(rows, view, [], { today: '2026-10-15', timeZone: 'Asia/Baku' })
    ).toHaveLength(1)
    expect(
      applyView(rows, view, [], { today: '2026-10-15', timeZone: 'UTC' })
    ).toHaveLength(0)
  })
  it('evaluates bounded arithmetic without executing code and rejects dependency cycles', () => {
    expect(evaluateFormula('prop("Value") * 2 + (3 / 2)', () => 4)).toBe(9.5)
    expect(evaluateFormula('globalThis.process.exit()', () => 0)).toBeNull()
    expect(evaluateFormula('1 / 0', () => 0)).toBeNull()
    const formula = {
      ...field,
      kind: 'formula' as const,
      config: { ...field.config, formula: 'prop("Value") + 1' }
    }
    const row: RecordPage = {
      id: 'row',
      base_id: id,
      title: 'Cycle',
      content: '',
      values: {},
      updated: '2026-10-14T00:00:00Z'
    }
    expect(computeRecords([row], [formula], [])[0]?.values[id]).toBeNull()
  })
  it('calculates only visible related records and strips forged computed values', () => {
    const target = '22222222-2222-4222-8222-222222222222',
      property = '33333333-3333-4333-8333-333333333333',
      rollupId = '44444444-4444-4444-8444-444444444444'
    const relation = {
      ...field,
      kind: 'relation' as const,
      target_base_id: target
    }
    const number = {
      ...field,
      id: property,
      base_id: target,
      kind: 'number' as const
    }
    const rollup = {
      ...field,
      id: rollupId,
      kind: 'rollup' as const,
      config: {
        ...field.config,
        rollup: {
          relation_id: id,
          property_id: property,
          aggregation: 'sum' as const
        }
      }
    }
    const rows: RecordPage[] = [
      {
        id: 'one',
        base_id: id,
        title: 'Source',
        content: '',
        values: {},
        updated: '2026-10-14T00:00:00Z'
      },
      {
        id: 'two',
        base_id: target,
        title: 'Visible',
        content: '',
        values: { [property]: 8 },
        updated: '2026-10-14T00:00:00Z'
      }
    ]
    const edges = ['two', 'inaccessible'].map(target_record_id => ({
      id: target_record_id,
      field_id: id,
      source_record_id: 'one',
      target_record_id
    }))
    expect(
      computeRecords(rows, [relation, number, rollup], edges)[0]?.values[
        rollupId
      ]
    ).toBe(8)
    const forged = { [rollupId]: 999 }
    validateValues([rollup], forged)
    expect(forged).toEqual({})
    const status = {
      ...field,
      kind: 'status' as const,
      config: { ...field.config, options: ['Ready'] }
    }
    expect(() => validateValues([status], { [id]: 'Ready' })).not.toThrow()
    expect(() => validateValues([status], { [id]: 'Other' })).toThrow()
    expect(() =>
      validateView([rollup], {
        mode: 'table',
        group_field_id: null,
        config: viewConfigSchema.parse({
          filters: [{ field_id: rollupId, operator: 'greater', value: 4 }]
        })
      })
    ).not.toThrow()
  })
  it('groups a Kanban by shared completion without requiring a copied checkbox field', () => {
    const view: SavedView = {
      id,
      base_id: id,
      name: 'Completion',
      mode: 'kanban',
      group_field_id: null,
      config: viewConfigSchema.parse({ group_property: 'done' })
    }
    expect(() => validateView([], view)).not.toThrow()
    expect(() =>
      validateView([field], { ...view, group_field_id: field.id })
    ).toThrow('one Kanban group')
  })
  it('filters shared item properties and uses the calendar time zone at midnight', () => {
    const view: SavedView = {
      id,
      base_id: id,
      name: 'Tasks',
      mode: 'calendar',
      group_field_id: null,
      config: viewConfigSchema.parse({
        date_field_id: 'date',
        end_date_field_id: 'end_date',
        filters: [
          { field_id: 'item_type', operator: 'equals', value: 'task' },
          { field_id: 'done', operator: 'equals', value: false },
          { field_id: 'date', operator: 'equals', value: '2026-10-12' }
        ]
      })
    }
    expect(() => validateView([], view)).not.toThrow()
    const record: RecordPage = {
      id,
      base_id: id,
      title: 'Shared task',
      content: '',
      item_type: 'task',
      done: false,
      date: '2026-10-13T01:00:00.000Z',
      values: {},
      updated: '2026-10-13T01:00:00.000Z'
    }
    expect(
      applyView([record], view, [], { timeZone: 'America/New_York' })
    ).toEqual([record])
    expect(applyView([record], view, [], { timeZone: 'UTC' })).toEqual([])
  })
  it('rejects dates that JavaScript would silently normalize', () => {
    expect(() => validateValues([field], { [id]: '2026-02-30' })).toThrow(
      'Invalid value'
    )
    expect(() => validateValues([field], { [id]: '2024-02-29' })).not.toThrow()
    expect(() => validateValues([field], { [id]: '2026-2-1' })).toThrow()
  })
  it('does not accept owner identity from missing or malformed locals', () => {
    expect(() => ownerId({ locals: {} })).toThrow('Authentication required')
    expect(() => ownerId({ locals: { userId: 'other' } })).toThrow(
      'Authentication required'
    )
  })
  it('keeps table sorting numeric and filters multi-select membership and reciprocal IDs', () => {
    const rows: RecordPage[] = [
      {
        id: 'a',
        base_id: id,
        title: 'A',
        content: '',
        values: { [id]: 2 },
        updated: ''
      },
      {
        id: 'b',
        base_id: id,
        title: 'B',
        content: '',
        values: { [id]: 10 },
        updated: ''
      }
    ]
    const view: SavedView = {
      id,
      base_id: id,
      name: 'Test',
      mode: 'table',
      group_field_id: null,
      config: {
        filters: [],
        sorts: [{ field_id: id, direction: 'desc' }],
        hidden_fields: []
      }
    }
    expect(applyView(rows, view).map(row => row.id)).toEqual(['b', 'a'])
    expect(
      applyView(rows, {
        ...view,
        config: {
          ...view.config,
          filters: [{ field_id: id, operator: 'greater', value: 5 }]
        }
      }).map(row => row.id)
    ).toEqual(['b'])
    const relationView = {
      ...view,
      config: {
        ...view.config,
        filters: [
          { field_id: 'relation', operator: 'equals' as const, value: 'target' }
        ]
      }
    }
    expect(
      applyView(rows, relationView, [
        {
          id: 'edge',
          field_id: 'relation',
          source_record_id: 'a',
          target_record_id: 'target'
        }
      ]).map(row => row.id)
    ).toEqual(['a'])
  })
  it('rejects arbitrary group fields and invalid comparison operands', () => {
    const config = { filters: [], sorts: [], hidden_fields: [] }
    expect(() =>
      validateView([field], { mode: 'kanban', group_field_id: id, config })
    ).toThrow('select or checkbox')
    expect(() =>
      validateView([field], {
        mode: 'table',
        group_field_id: null,
        config: {
          ...config,
          filters: [{ field_id: id, operator: 'greater', value: 1 }]
        }
      })
    ).toThrow('Numeric comparison')
  })
})

describe('Calendar and smart property filters', () => {
  const dateId = '22222222-2222-4222-8222-222222222222'
  const tagsId = '33333333-3333-4333-8333-333333333333'
  const personId = '44444444-4444-4444-8444-444444444444'
  const owner = '55555555-5555-4555-8555-555555555555'
  const dateField: Field = { ...field, id: dateId, name: 'Date' }
  const tags: Field = {
    ...field,
    id: tagsId,
    name: 'Tags',
    kind: 'multi-select',
    config: { ...field.config, options: ['Art', 'Cart', 'Ready'] }
  }
  const person: Field = {
    ...field,
    id: personId,
    name: 'Owner',
    kind: 'person'
  }
  const view: SavedView = {
    id,
    base_id: id,
    name: 'Calendar',
    mode: 'calendar',
    group_field_id: null,
    config: viewConfigSchema.parse({ date_field_id: dateId })
  }
  const row = (name: string, values: RecordPage['values']): RecordPage => ({
    id: name,
    title: name,
    base_id: id,
    content: '',
    updated: '',
    values
  })

  it('normalizes old config defaults and bounds the complete grouped expression', () => {
    expect(
      viewConfigSchema.parse({ filters: [], sorts: [], hidden_fields: [] })
    ).toMatchObject({
      filter_logic: 'and',
      filter_groups: [],
      date_field_id: null,
      end_date_field_id: null
    })
    const condition = { field_id: 'title', operator: 'not-empty' }
    const filters = Array.from({ length: 20 }, () => condition)

    expect(
      viewConfigSchema.safeParse({
        filters,
        filter_groups: [{ filters }, { filters }]
      }).success
    ).toBe(false)
    expect(
      viewConfigSchema.safeParse({
        filter_groups: Array.from({ length: 6 }, () => ({ filters: [] }))
      }).success
    ).toBe(false)
  })

  it('combines an OR group with date and person conditions and uses exact tag membership', () => {
    const config = viewConfigSchema.parse({
      date_field_id: dateId,
      filters: [
        { field_id: dateId, operator: 'on-or-before', value: '2026-10-12' },
        { field_id: personId, operator: 'includes', value: owner }
      ],
      filter_groups: [
        {
          filter_logic: 'or',
          filters: [
            { field_id: 'title', operator: 'equals', value: 'Active' },
            { field_id: tagsId, operator: 'contains', value: 'Art' }
          ]
        }
      ]
    })
    validateView([dateField, tags, person], { ...view, config }, [owner])
    const rows = [
      row('Active', {
        [dateId]: '2026-10-12',
        [personId]: owner,
        [tagsId]: ['Cart']
      }),
      row('Artist', {
        [dateId]: '2026-10-11',
        [personId]: owner,
        [tagsId]: ['Art']
      }),
      row('Cart only', {
        [dateId]: '2026-10-12',
        [personId]: owner,
        [tagsId]: ['Cart']
      }),
      row('Future', {
        [dateId]: '2026-10-13',
        [personId]: owner,
        [tagsId]: ['Art']
      }),
      row('Other owner', {
        [dateId]: '2026-10-12',
        [personId]: id,
        [tagsId]: ['Art']
      })
    ]

    expect(
      applyView(rows, { ...view, config }, [], { today: '2026-10-12' }).map(
        record => record.id
      )
    ).toEqual(['Active', 'Artist'])
    expect(
      applyView(
        rows,
        { ...view, config: { ...config, filter_logic: 'or' } },
        [],
        { today: '2026-10-12' }
      )
    ).toHaveLength(5)
  })

  it.each([
    ['today', ['2026-12-31']],
    ['tomorrow', ['2027-01-01']],
    ['this-week', ['2026-12-28', '2026-12-31', '2027-01-01', '2027-01-03']],
    ['this-month', ['2026-12-27', '2026-12-28', '2026-12-31']],
    [
      'next-7-days',
      ['2026-12-31', '2027-01-01', '2027-01-03', '2027-01-04', '2027-01-06']
    ],
    ['overdue', ['2026-12-27', '2026-12-28']]
  ])(
    'resolves %s against a civil reference day across the year boundary',
    (window, expected) => {
      const dates = [
        '2026-12-27',
        '2026-12-28',
        '2026-12-31',
        '2027-01-01',
        '2027-01-03',
        '2027-01-04',
        '2027-01-06',
        '2027-01-07'
      ]
      const config = {
        ...view.config,
        filters: [
          {
            field_id: dateId,
            operator: 'relative-date' as const,
            value: window
          }
        ]
      }

      expect(
        applyView(
          dates.map(date => row(date, { [dateId]: date })),
          { ...view, config },
          [],
          { today: '2026-12-31' }
        ).map(record => record.id)
      ).toEqual(expected)
      expect(config.filters[0]?.value).toBe(window)
    }
  )

  it('validates calendar bindings, ranges, typed operands and owned people', () => {
    expect(() => validateView([dateField], view)).not.toThrow()
    expect(() => validateView([tags], view)).toThrow(
      'date field from this database'
    )
    expect(() =>
      validateView([dateField, tags], {
        ...view,
        config: { ...view.config, end_date_field_id: tagsId }
      })
    ).toThrow('Calendar end')
    expect(() =>
      validateCalendarValue(
        { ...view, config: { ...view.config, end_date_field_id: id } },
        { [dateId]: '2026-10-12', [id]: '2026-10-11' }
      )
    ).toThrow('ends before')
    expect(() => validateValues([person], { [personId]: id }, [owner])).toThrow(
      'Invalid value'
    )
    expect(() =>
      validateView(
        [person],
        {
          ...view,
          mode: 'table',
          config: {
            ...view.config,
            filters: [{ field_id: personId, operator: 'equals', value: id }]
          }
        },
        [owner]
      )
    ).toThrow('owned principal')
    expect(() =>
      validateView([tags], {
        ...view,
        mode: 'table',
        config: {
          ...view.config,
          filters: [
            { field_id: tagsId, operator: 'before', value: '2026-10-12' }
          ]
        }
      })
    ).toThrow('Date comparison')
    expect(() =>
      validateView([dateField], {
        ...view,
        config: {
          ...view.config,
          filters: [
            { field_id: dateId, operator: 'relative-date', value: 'yesterday' }
          ]
        }
      })
    ).toThrow('known window')
    expect(() => applyView([], view, [], { today: '2026-02-30' })).toThrow(
      'reference date'
    )
  })

  it('checks smart conditions in groups before field conversion', () => {
    const config = {
      ...view.config,
      filter_groups: [
        {
          filter_logic: 'and' as const,
          filters: [
            {
              field_id: dateId,
              operator: 'before' as const,
              value: '2026-10-12'
            }
          ]
        }
      ]
    }

    expect(() =>
      convertViewField({ ...view, config }, dateField, {
        ...dateField,
        kind: 'text'
      })
    ).toThrow('typed comparison')
    const converted = convertViewField(
      {
        ...view,
        config: {
          ...view.config,
          filter_groups: [
            {
              filter_logic: 'and',
              filters: [
                { field_id: dateId, operator: 'equals', value: '2026-10-12' }
              ]
            }
          ]
        }
      },
      dateField,
      { ...dateField, kind: 'text' }
    )

    expect(converted.config.filter_groups?.[0]?.filters[0]?.value).toBe(
      '2026-10-12'
    )
    expect(() =>
      validateView([{ ...dateField, kind: 'text' }], converted)
    ).toThrow('Calendar requires')
  })

  it('keeps zero and false nonempty while all/any membership checks whole options', () => {
    const rows = [
      row('A', { [id]: 0, [tagsId]: ['Art', 'Ready'] }),
      row('B', { [id]: false, [tagsId]: ['Cart'] }),
      row('C', { [id]: null, [tagsId]: [] })
    ]
    const filtered = (
      operator:
        | 'empty'
        | 'not-empty'
        | 'includes-any'
        | 'includes-all'
        | 'not-includes',
      value?: string | string[]
    ) =>
      applyView(rows, {
        ...view,
        config: {
          ...view.config,
          filters: [
            {
              field_id:
                operator === 'empty' || operator === 'not-empty' ? id : tagsId,
              operator,
              value
            }
          ]
        }
      }).map(record => record.id)

    expect(filtered('not-empty')).toEqual(['A', 'B'])
    expect(filtered('empty')).toEqual(['C'])
    expect(filtered('includes-any', ['Art', 'Ready'])).toEqual(['A'])
    expect(filtered('includes-all', ['Art', 'Ready'])).toEqual(['A'])
    expect(filtered('not-includes', 'Art')).toEqual(['B', 'C'])
  })
})

describe('Checkbox progress properties', () => {
  const checkbox = { ...field, id: 'check', kind: 'checkbox' as const }
  const otherCheckbox = { ...checkbox, id: 'review' }
  const relatedCheckbox = { ...checkbox, id: 'task-check', base_id: 'tasks' }
  const relation = {
    ...field,
    id: 'tasks-link',
    kind: 'relation' as const,
    target_base_id: 'tasks'
  }
  const progress = {
    ...field,
    id: 'progress',
    kind: 'progress' as const,
    config: {
      ...field.config,
      progress: {
        checkbox_ids: ['check', 'review'],
        show_number: true,
        relation: { field_id: 'tasks-link', checkbox_ids: ['task-check'] }
      }
    }
  }
  const fields: Field[] = [
    checkbox,
    otherCheckbox,
    relatedCheckbox,
    relation,
    progress
  ]
  const row = (
    id: string,
    base_id: string,
    values: RecordPage['values']
  ): RecordPage => ({
    id,
    base_id,
    title: id,
    content: '',
    values,
    updated: ''
  })
  const parent = row('parent', field.base_id, { check: true, review: false })
  const tasks = [
    row('a', 'tasks', { 'task-check': true }),
    row('b', 'tasks', {})
  ]
  const links = tasks.map(task => ({
    id: task.id,
    field_id: relation.id,
    source_record_id: parent.id,
    target_record_id: task.id
  }))
  const calculate = (
    rows = [parent, ...tasks],
    definitions = fields,
    edges = links
  ) => computeRecords(rows, definitions, edges)[0]!.values.progress

  it('combines local and related checkbox counts and recomputes when either changes', () => {
    expect(calculate()).toBe(50)
    expect(
      calculate([
        { ...parent, values: { check: true, review: true } },
        ...tasks
      ])
    ).toBe(75)
    expect(
      calculate([
        parent,
        ...tasks.map(task => ({ ...task, values: { 'task-check': true } }))
      ])
    ).toBe(75)
  })
  it('supports either source independently and canonical task completion', () => {
    const local = {
      ...progress,
      config: {
        ...progress.config,
        progress: { checkbox_ids: ['check', 'review'], show_number: false }
      }
    }
    expect(calculate(undefined, [checkbox, otherCheckbox, local])).toBe(50)
    const related = {
      ...progress,
      config: {
        ...progress.config,
        progress: {
          checkbox_ids: [],
          show_number: true,
          relation: { field_id: relation.id, checkbox_ids: ['done'] }
        }
      }
    }
    expect(
      calculate(
        [parent, { ...tasks[0]!, done: true }, tasks[1]!],
        [relation, related]
      )
    ).toBe(50)
    expect(calculate([parent], [relation, related], [])).toBe(0)
  })
  it('counts missing checkbox values as unchecked and deduplicates relation targets', () => {
    expect(calculate(undefined, undefined, [...links, links[0]!])).toBe(50)
    expect(calculate([{ ...parent, values: {} }, ...tasks])).toBe(25)
  })
  it('does not read unrelated databases or hidden records', () => {
    expect(
      calculate([parent, tasks[0]!, { ...tasks[1]!, base_id: 'foreign' }])
    ).toBeCloseTo(200 / 3)
    expect(calculate([parent], undefined, links)).toBe(50)
    const foreign = {
      ...progress,
      config: {
        ...progress.config,
        progress: { ...progress.config.progress, checkbox_ids: ['task-check'] }
      }
    }
    expect(
      validProgressSources(foreign.config.progress, parent.base_id, fields)
    ).toBe(false)
  })
  it('reports removed or converted sources as unavailable, not falsely complete', () => {
    expect(
      calculate(
        undefined,
        fields.filter(f => f.id !== checkbox.id)
      )
    ).toBeNull()
    expect(
      calculate(
        undefined,
        fields.map(f =>
          f.id === relatedCheckbox.id ? { ...f, kind: 'text' as const } : f
        )
      )
    ).toBeNull()
    expect(
      calculate(
        undefined,
        fields.filter(f => f.id !== relation.id)
      )
    ).toBeNull()
  })
  it('rejects empty and duplicate configurations', () => {
    expect(validProgressSources(undefined, parent.base_id, fields)).toBe(false)
    expect(
      validProgressSources(
        { checkbox_ids: [], show_number: true },
        parent.base_id,
        fields
      )
    ).toBe(false)
    expect(
      validProgressSources(
        { checkbox_ids: ['check', 'check'], show_number: true },
        parent.base_id,
        fields
      )
    ).toBe(false)
    expect(
      validProgressSources(
        {
          checkbox_ids: [],
          show_number: true,
          relation: { field_id: relation.id, checkbox_ids: [] }
        },
        parent.base_id,
        fields
      )
    ).toBe(false)
  })
  it('strips forged percentages and exposes progress to numeric formulas', () => {
    const values = { progress: 100, check: false }
    validateValues(fields, values)
    expect(values).toEqual({ check: false })
    const formula = {
      ...field,
      id: 'formula',
      kind: 'formula' as const,
      config: { ...field.config, formula: 'prop("progress") / 10' }
    }
    expect(
      computeRecords([parent, ...tasks], [...fields, formula], links)[0]!.values
        .formula
    ).toBe(5)
  })
})
