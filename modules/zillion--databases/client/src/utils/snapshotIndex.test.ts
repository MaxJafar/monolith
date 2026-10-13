import { describe, expect, it } from 'vitest'

import type { KnowledgeSnapshot } from '@lifeforge/blocks'

import {
  type Snapshot,
  fieldConfigSchema,
  viewConfigSchema
} from '../../../shared'
import { indexKnowledge, indexSnapshot } from './snapshotIndex'

function fixture(): Snapshot {
  return {
    bases: [
      { id: 'a', name: 'Projects', description: '' },
      { id: 'b', name: 'People', description: '' }
    ],
    fields: [
      {
        id: 'later',
        base_id: 'a',
        position: 2,
        kind: 'text',
        name: 'Later',
        target_base_id: null,
        config: fieldConfigSchema.parse({})
      },
      {
        id: 'owner',
        base_id: 'a',
        position: 0,
        kind: 'relation',
        name: 'Owner',
        target_base_id: 'b',
        config: fieldConfigSchema.parse({})
      },
      {
        id: 'reverse',
        base_id: 'b',
        position: 0,
        kind: 'relation',
        name: 'Projects',
        target_base_id: 'a',
        config: fieldConfigSchema.parse({})
      }
    ],
    records: [
      {
        id: 'launch',
        base_id: 'a',
        title: 'Launch',
        content: '',
        values: {},
        updated: ''
      },
      {
        id: 'alex',
        base_id: 'b',
        title: 'Alex',
        content: '',
        values: {},
        updated: ''
      },
      {
        id: 'sam',
        base_id: 'b',
        title: 'Sam',
        content: '',
        values: {},
        updated: ''
      }
    ],
    views: [
      {
        id: 'table',
        base_id: 'a',
        mode: 'table',
        name: 'Table',
        group_field_id: null,
        config: viewConfigSchema.parse({})
      },
      {
        id: 'team',
        base_id: 'b',
        mode: 'table',
        name: 'Team',
        group_field_id: null,
        config: viewConfigSchema.parse({})
      }
    ],
    links: [
      {
        id: 'one',
        field_id: 'owner',
        source_record_id: 'launch',
        target_record_id: 'alex'
      },
      {
        id: 'two',
        field_id: 'owner',
        source_record_id: 'launch',
        target_record_id: 'sam'
      },
      {
        id: 'back',
        field_id: 'reverse',
        source_record_id: 'alex',
        target_record_id: 'launch'
      }
    ]
  }
}

describe('Snapshot indexes used by database rendering', () => {
  it('keeps base order, property positions and original snapshot objects intact', () => {
    const data = fixture()
    const original = JSON.stringify(data)
    const index = indexSnapshot(data)

    expect(index.fieldsByBase.get('a')?.map(field => field.id)).toEqual([
      'owner',
      'later'
    ])
    expect(index.recordsByBase.get('b')?.map(record => record.id)).toEqual([
      'alex',
      'sam'
    ])
    expect(index.viewsByBase.get('a')).toEqual([data.views[0]])
    expect(index.recordsById.get('launch')).toBe(data.records[0])
    expect(index.basesById.get('b')).toBe(data.bases[1])
    expect(JSON.stringify(data)).toBe(original)
  })

  it('keeps reciprocal relations separate by property and source record', () => {
    const data = fixture()
    const index = indexSnapshot(data)

    expect(index.linksByField.get('owner')?.get('launch')).toEqual(
      data.links.slice(0, 2)
    )
    expect(index.linksByField.get('owner')?.get('alex')).toBeUndefined()
    expect(index.linksByField.get('reverse')?.get('alex')).toEqual([
      data.links[2]
    ])
    expect(index.recordsById.get('missing')).toBeUndefined()
  })

  it('rebuilds from a refreshed snapshot without leaking removed targets or links', () => {
    const data = fixture()
    const old = indexSnapshot(data)
    const next = indexSnapshot({
      ...data,
      records: data.records.slice(0, 2),
      links: [data.links[0]!]
    })

    expect(next.recordsById.has('sam')).toBe(false)
    expect(next.linksByField.has('reverse')).toBe(false)
    expect(old.recordsById.has('sam')).toBe(true)
    expect(next.linksByField.get('owner')?.get('launch')).toHaveLength(1)
  })

  it('resolves a large relation table through indexes without rescanning snapshot arrays', () => {
    const data = fixture()
    data.records = Array.from({ length: 4000 }, (_, i) => ({
      ...data.records[0]!,
      id: `record-${i}`
    }))
    data.links = data.records.map((record, i) => ({
      id: `link-${i}`,
      field_id: 'owner',
      source_record_id: record.id,
      target_record_id: `record-${(i + 1) % 4000}`
    }))
    const index = indexSnapshot(data)

    for (const record of data.records) {
      const links = index.linksByField.get('owner')?.get(record.id)

      expect(links).toHaveLength(1)
      expect(index.recordsById.get(links![0]!.target_record_id)?.id).toBe(
        links![0]!.target_record_id
      )
    }
  })
})

describe('Knowledge page connection indexes', () => {
  it('preserves incoming/outgoing mentions, reciprocal relations and self-links once', () => {
    const snapshot: KnowledgeSnapshot = {
      nodes: [
        { key: 'record:a', id: 'a', kind: 'record', title: 'A' },
        { key: 'document:b', id: 'b', kind: 'document', title: 'B' }
      ],
      edges: [
        {
          id: 'mention',
          source: 'document:b',
          target: 'record:a',
          kind: 'mention',
          label: ''
        },
        {
          id: 'relation',
          source: 'record:a',
          target: 'document:b',
          kind: 'relation',
          label: 'Owner'
        },
        {
          id: 'self',
          source: 'record:a',
          target: 'record:a',
          kind: 'related',
          label: 'Self'
        }
      ],
      unresolved: 1
    }
    const index = indexKnowledge(snapshot)

    expect(index.backlinks.get('record:a')).toEqual([snapshot.edges[0]])
    expect(index.references.get('document:b')).toEqual([snapshot.edges[0]])
    expect(index.related.get('record:a')).toEqual(snapshot.edges.slice(1))
    expect(index.related.get('document:b')).toEqual([snapshot.edges[1]])
    expect(index.nodesByKey.get('record:a')).toBe(snapshot.nodes[0])
    expect(index.nodesByKey.get('note:missing')).toBeUndefined()
  })
})
