import {
  type Field,
  type RecordPage,
  type RelationLink,
  type ViewConfig,
  propertyValue
} from '../../../shared'
import { boardValues } from './board'

/** Multi-value properties contribute once to each bucket; missing numbers are excluded from averages. */
export function chartBuckets(
  records: RecordPage[],
  field: Field | undefined,
  chart: ViewConfig['chart'],
  links: RelationLink[] = []
) {
  const buckets = new Map<
    string,
    { key: string; value: number; samples: number; records: RecordPage[] }
  >()
  for (const record of records) {
    const keys = field ? boardValues(record, field, links) : ['all']
    for (const value of new Set(
      keys.map(value => (value == null ? '' : String(value)))
    )) {
      const bucket = buckets.get(value) ?? {
        key: value,
        value: 0,
        samples: 0,
        records: []
      }
      bucket.records.push(record)
      const number = chart?.value_field
        ? propertyValue(record, chart.value_field)
        : undefined
      if (!chart || chart.aggregation === 'count') bucket.value++
      else if (typeof number === 'number' && Number.isFinite(number)) {
        bucket.value += number
        bucket.samples++
      }
      buckets.set(value, bucket)
    }
  }
  return [...buckets.values()].map(bucket => ({
    ...bucket,
    value:
      chart?.aggregation === 'average'
        ? bucket.samples
          ? bucket.value / bucket.samples
          : 0
        : bucket.value
  }))
}
