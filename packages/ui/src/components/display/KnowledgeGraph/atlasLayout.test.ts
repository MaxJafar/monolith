import { describe, expect, it } from 'vitest'

import { type LabelCandidate, atlasTargets, graphLabels } from './atlasLayout'

describe('Atlas families', () => {
  const nodes = [
    'database:a',
    'record:a',
    'database:b',
    'record:b',
    'topic:one',
    'document:solo'
  ].map(key => ({ key, kind: key.split(':')[0] }))
  const edges = [
    { source: 'database:a', target: 'record:a', kind: 'collection' },
    { source: 'database:b', target: 'record:b', kind: 'collection' },
    { source: 'record:a', target: 'record:b', kind: 'context' },
    { source: 'topic:one', target: 'record:a', kind: 'topic' }
  ]

  it('keeps database membership together without collapsing contextual bridges', () => {
    const positions = atlasTargets(nodes, edges, 180)
    expect(positions.get('database:a')?.group).toBe(
      positions.get('record:a')?.group
    )
    expect(positions.get('database:b')?.group).not.toBe(
      positions.get('record:a')?.group
    )
    expect(positions.get('topic:one')?.group).toBe(
      positions.get('record:a')?.group
    )
    expect(positions.size).toBe(nodes.length)
    expect(
      [...positions.values()].every(
        position => Number.isFinite(position.x) && Number.isFinite(position.y)
      )
    ).toBe(true)
  })

  it('preserves positions when a refresh returns a different order', () => {
    expect(
      atlasTargets([...nodes].reverse(), [...edges].reverse(), 180)
    ).toEqual(atlasTargets(nodes, edges, 180))
    expect(atlasTargets([], [], 180).size).toBe(0)
  })
})

describe('Screen-space label placement', () => {
  const label = (
    key: string,
    x: number,
    y: number,
    extra: Partial<LabelCandidate> = {}
  ): LabelCandidate => ({
    key,
    x,
    y,
    width: 100,
    radius: 5,
    priority: 1,
    ...extra
  })

  it('reserves the selected title first and finds another side for nearby titles', () => {
    const visible = graphLabels(
      [
        label('ordinary', 150, 100),
        label('selected', 160, 100, { required: true }),
        label('clear', 400, 100)
      ],
      800,
      500,
      12
    )
    expect([...visible.keys()][0]).toBe('selected')
    expect(visible.get('ordinary')?.y).toBeLessThan(0)
    expect(visible.has('clear')).toBe(true)
  })

  it('does not paint a title over another node marker', () => {
    const visible = graphLabels(
      [
        label('title', 150, 100, { priority: 5 }),
        label('marker', 150, 120, { priority: -1 })
      ],
      800,
      500,
      12
    )
    expect(visible.get('title')?.y).toBeLessThan(0)
    expect(visible.has('marker')).toBe(false)
  })

  it('uses a bounded label budget and ignores labels outside the viewport', () => {
    const visible = graphLabels(
      [
        label('offscreen', -200, 50, { priority: 20 }),
        label('first', 150, 100, { priority: 3 }),
        label('second', 400, 100),
        label('third', 650, 100)
      ],
      800,
      500,
      2
    )
    expect([...visible.keys()]).toEqual(['first', 'second'])
  })
})
