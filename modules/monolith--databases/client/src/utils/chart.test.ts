import { describe, expect, it } from 'vitest'

import { type Field, type RecordPage, fieldConfigSchema } from '../../../shared'
import { chartBuckets } from './chart'

const field = {
  id: 'tags',
  kind: 'multi-select',
  config: fieldConfigSchema.parse({})
} as Field
const record = (
  id: string,
  value: number | null,
  tags: string[]
): RecordPage => ({
  id,
  base_id: 'base',
  title: id,
  content: '',
  updated: '2026-10-15',
  tags,
  values: { estimate: value }
})

describe('chart aggregation over filtered records', () => {
  const records = [
    record('one', 6, ['A', 'A', 'B']),
    record('two', -2, ['A']),
    record('three', null, ['A'])
  ]
  it('deduplicates multi-value buckets without losing empty numeric records', () => {
    expect(
      chartBuckets(records, field, {
        group_by: 'tags',
        value_field: null,
        aggregation: 'count'
      }).map(({ key, value }) => [key, value])
    ).toEqual([
      ['A', 3],
      ['B', 1]
    ])
  })
  it('handles negative totals and excludes missing values from averages', () => {
    expect(
      chartBuckets(records, field, {
        group_by: 'tags',
        value_field: 'estimate',
        aggregation: 'sum'
      })[0]?.value
    ).toBe(4)
    expect(
      chartBuckets(records, field, {
        group_by: 'tags',
        value_field: 'estimate',
        aggregation: 'average'
      })[0]?.value
    ).toBe(2)
    expect(
      chartBuckets([records[2]!], field, {
        group_by: 'tags',
        value_field: 'estimate',
        aggregation: 'average'
      })[0]?.value
    ).toBe(0)
  })
  it('uses the current record set and returns record identities for drill-down', () => {
    const bucket = chartBuckets([records[1]!], undefined, undefined)[0]!
    expect(bucket.value).toBe(1)
    expect(bucket.records.map(record => record.id)).toEqual(['two'])
  })
})
