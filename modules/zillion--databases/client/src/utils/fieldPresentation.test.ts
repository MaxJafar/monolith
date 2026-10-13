import { describe, expect, it } from 'vitest'

import {
  type CellValue,
  type Field,
  type RecordPage,
  fieldConfigSchema
} from '../../../shared'
import { groupDistribution } from './fieldPresentation'

function field(kind: Field['kind'] = 'select'): Field {
  return {
    id: 'status',
    base_id: 'projects',
    name: 'Status',
    kind,
    target_base_id: null,
    position: 0,
    config: fieldConfigSchema.parse({
      options: ['Todo', 'In progress', 'Done']
    })
  }
}

function records(values: (CellValue | undefined)[]): RecordPage[] {
  return values.map((value, index): RecordPage => ({
    id: String(index),
    base_id: 'projects',
    title: String(index),
    content: '',
    updated: '',
    values: value === undefined ? {} : { status: value }
  }))
}

describe('Saved-view group distribution', () => {
  it('counts supplied records once and retains zero-count options and ungrouped pages', () => {
    const distribution = groupDistribution(
      field(),
      records(['Todo', 'Todo', 'Done', null, undefined, ''])
    )

    expect(distribution).toEqual([
      { value: null, count: 3 },
      { value: 'Todo', count: 2 },
      { value: 'In progress', count: 0 },
      { value: 'Done', count: 1 }
    ])
    expect(distribution.reduce((total, item) => total + item.count, 0)).toBe(6)
  })

  it('reflects the filtered record subset without including rows outside the saved view', () => {
    const all = records(['Todo', 'Todo', 'Done'])

    expect(groupDistribution(field(), all.slice(2))).toEqual([
      { value: null, count: 0 },
      { value: 'Todo', count: 0 },
      { value: 'In progress', count: 0 },
      { value: 'Done', count: 1 }
    ])
  })

  it('preserves a legacy option as its own count rather than silently dropping its rows', () => {
    const distribution = groupDistribution(
      field(),
      records(['Archived', 'Todo'])
    )

    expect(distribution[distribution.length - 1]).toEqual({
      value: 'Archived',
      count: 1
    })
    expect(distribution.reduce((total, item) => total + item.count, 0)).toBe(2)
  })

  it('uses the existing Kanban checkbox grouping semantics for false and absent cells', () => {
    expect(
      groupDistribution(
        field('checkbox'),
        records([false, undefined, null, true, true])
      )
    ).toEqual([
      { value: false, count: 3 },
      { value: true, count: 2 }
    ])
  })

  it('does not mutate properties or records and does not invent groups for numeric fields', () => {
    const property = field()
    const pages = records(['Done', 'Todo'])
    const before = JSON.stringify({ property, pages })

    groupDistribution(property, pages)
    expect(JSON.stringify({ property, pages })).toBe(before)
    expect(groupDistribution(field('number'), records([0, 42]))).toEqual([])
  })
})
