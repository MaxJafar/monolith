import { describe, expect, it } from 'vitest'

import { shapeTimeline } from './timeline'

const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const from = new Date('2026-10-28T00:00:00Z')
const to = new Date('2026-10-29T00:00:00Z')

describe('Monitor timelines', () => {
  it('gives every monitored service one slot per bucket', () => {
    const timeline = shapeTimeline(
      [
        {
          service_id: a,
          bucket: 0,
          up: 2,
          down: 0,
          error: 0,
          latency_ms: 12.345
        },
        { service_id: a, bucket: 3, up: 0, down: 1, error: 1, latency_ms: null }
      ],
      [a, b],
      { from, to, buckets: 4 }
    )

    expect(timeline.bucket_seconds).toBe(21600)
    expect(timeline.services).toEqual([
      {
        service_id: a,
        buckets: [
          { up: 2, down: 0, error: 0, latency_ms: 12.3 },
          null,
          null,
          { up: 0, down: 1, error: 1, latency_ms: null }
        ]
      },
      { service_id: b, buckets: [null, null, null, null] }
    ])
  })

  it('ignores rows for unknown services or buckets outside the window', () => {
    const timeline = shapeTimeline(
      [
        { service_id: b, bucket: 4, up: 1, down: 0, error: 0, latency_ms: 1 },
        {
          service_id: null,
          bucket: 0,
          up: 1,
          down: 0,
          error: 0,
          latency_ms: 1
        },
        {
          service_id: 'other',
          bucket: 0,
          up: 1,
          down: 0,
          error: 0,
          latency_ms: 1
        }
      ],
      [b],
      { from, to, buckets: 4 }
    )

    expect(timeline.services[0]!.buckets).toEqual([null, null, null, null])
  })
})
