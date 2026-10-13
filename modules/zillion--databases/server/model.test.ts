import { describe, expect, it } from 'vitest'

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
