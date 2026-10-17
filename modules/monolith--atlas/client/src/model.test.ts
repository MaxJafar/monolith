import type { GraphNode, KnowledgeSnapshot } from '@monolith/blocks'
import { describe, expect, it } from 'vitest'

import {
  type Filters,
  filterGraph,
  identityColor,
  indexGraph,
  isPage,
  mergeKnowledge,
  neighborhood,
  targetOf
} from './model'

const node = (
  id: string,
  title = id,
  extra: Partial<GraphNode> = {}
): GraphNode => ({ id, key: id, kind: 'document', title, ...extra })
const graph: KnowledgeSnapshot = {
  nodes: [
    node('a', 'Research'),
    node('b', 'Build', { kind: 'record', context: 'Projects', tags: ['idea'] }),
    node('c', 'Reflect'),
    node('d', 'Unconnected')
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b', kind: 'mention', label: 'Page link' },
    { id: 'ba', source: 'b', target: 'a', kind: 'related', label: 'Inspires' },
    { id: 'bc', source: 'b', target: 'c', kind: 'parent', label: 'Parent' }
  ],
  unresolved: 2
}
const defaults: Filters = {
  search: '',
  kind: 'all',
  context: '',
  tag: '',
  orphans: true,
  sort: 'connections',
  scope: 'global',
  focus: '',
  depth: 1
}
describe('Atlas discovery', () => {
  it('connects real database membership and inline views without creating page copies', () => {
    const source: KnowledgeSnapshot = {
      nodes: [
        node('document:p'),
        node('record:r', 'Record', { kind: 'record' })
      ],
      edges: [],
      unresolved: 0,
      databases: [
        {
          id: 'db',
          title: 'Projects',
          href: '/databases?base=db',
          recordIds: ['r', 'unavailable'],
          embeddedIn: ['document:p', 'unavailable']
        }
      ]
    }
    const merged = mergeKnowledge(source, undefined, {
      tags: false,
      topics: false,
      context: false,
      strength: 0.5,
      colors: 'type'
    })
    expect(merged.nodes.map(node => node.key)).toEqual([
      'document:p',
      'record:r',
      'database:db'
    ])
    expect(merged.edges.map(edge => edge.kind)).toEqual(['collection', 'embed'])
    expect(isPage(merged.nodes[2]!)).toBe(false)
    const local = neighborhood(indexGraph(merged), 'database:db', 1)
    expect([...local].sort()).toEqual(['database:db', 'document:p', 'record:r'])
    expect(source.nodes).toHaveLength(2)
  })
  it('counts connected pages once while retaining different relationship types', () => {
    const index = indexGraph(graph)
    expect(index.neighbors.get('a')?.size).toBe(1)
    expect(index.outgoing.get('a')?.map(edge => edge.id)).toEqual(['ab'])
    expect(index.related.get('a')?.map(edge => edge.id)).toEqual(['ba'])
    expect(index.incoming.get('c')?.[0]?.kind).toBe('parent')
  })
  it('walks cyclic links by depth without including isolated pages', () => {
    const index = indexGraph(graph)
    expect([...neighborhood(index, 'a', 1)].sort()).toEqual(['a', 'b'])
    expect([...neighborhood(index, 'a', 3)].sort()).toEqual(['a', 'b', 'c'])
    expect([...neighborhood(index, 'missing', 2)]).toEqual([])
  })
  it('combines text, source, tag and type filters, removing dangling edges', () => {
    const result = filterGraph(graph, indexGraph(graph), {
      ...defaults,
      search: 'BUILD idea',
      context: 'Projects',
      tag: 'idea',
      kind: 'record'
    })
    expect(result.graph.nodes.map(node => node.key)).toEqual(['b'])
    expect(result.graph.edges).toEqual([])
    expect(result.graph.unresolved).toBe(2)
  })
  it('hides orphans using actual connectivity, not filtered edge counts', () => {
    const result = filterGraph(graph, indexGraph(graph), {
      ...defaults,
      search: 'research',
      orphans: false
    })
    expect(result.graph.nodes.map(node => node.key)).toEqual(['a'])
  })
  it('does not lose the graph when a bookmarked selection was deleted', () => {
    expect(
      filterGraph(graph, indexGraph(graph), {
        ...defaults,
        scope: 'local',
        focus: 'deleted'
      }).graph.nodes
    ).toHaveLength(4)
  })
  it('keeps a selected match in bounded results and reports omitted pages', () => {
    const result = filterGraph(
      graph,
      indexGraph(graph),
      { ...defaults, sort: 'title', focus: 'd' },
      2
    )
    expect(result.graph.nodes.some(node => node.key === 'd')).toBe(true)
    expect(result.omitted).toBe(2)
    const keys = new Set(result.graph.nodes.map(node => node.key))
    expect(
      result.graph.edges.every(
        edge => keys.has(edge.source) && keys.has(edge.target)
      )
    ).toBe(true)
  })
  it('resolves bidirectional relationship targets from either page', () => {
    const index = indexGraph(graph)
    expect(targetOf(graph.edges[1]!, 'a', index)?.key).toBe('b')
    expect(targetOf(graph.edges[1]!, 'b', index)?.key).toBe('a')
  })
  it('ignores stale endpoints when indexing connections', () => {
    const dirty = {
      ...graph,
      edges: [
        ...graph.edges,
        {
          id: 'gone',
          source: 'a',
          target: 'gone',
          kind: 'mention' as const,
          label: 'stale'
        }
      ]
    }
    expect(indexGraph(dirty).neighbors.get('a')?.size).toBe(1)
  })
  it('merges context as reversible layers without duplicating explicit relationships', () => {
    const layer = {
      nodes: [
        node('a', 'Research', { entityType: 'note' }),
        { ...node('tag:energy', 'energy'), kind: 'tag' as const }
      ],
      edges: [
        {
          id: 'inferred',
          source: 'a',
          target: 'b',
          kind: 'context' as const,
          label: 'Context',
          strength: 0.8
        },
        {
          id: 'tagged',
          source: 'a',
          target: 'tag:energy',
          kind: 'tag' as const,
          label: 'energy'
        }
      ],
      unresolved: 0
    }
    const options = {
      tags: true,
      topics: true,
      context: true,
      strength: 0.28,
      colors: 'individual' as const
    }
    const merged = mergeKnowledge(graph, layer, options)
    expect(merged.edges.some(edge => edge.id === 'inferred')).toBe(false)
    expect(merged.edges.some(edge => edge.id === 'tagged')).toBe(true)
    expect(isPage(merged.nodes.find(node => node.key === 'tag:energy')!)).toBe(
      false
    )
    const hidden = mergeKnowledge(graph, layer, { ...options, tags: false })
    expect(hidden.nodes).toHaveLength(graph.nodes.length)
    expect(hidden.edges).toHaveLength(graph.edges.length)
    expect(
      filterGraph(merged, indexGraph(merged), {
        ...defaults,
        kind: 'note'
      }).graph.nodes.map(node => node.key)
    ).toEqual(['a'])
  })
  it('assigns stable distinct colors independently of ordering or filters', () => {
    const colors = Array.from({ length: 100 }, (_, i) =>
      identityColor(`node:${i}`)
    )
    expect(new Set(colors).size).toBe(100)
    expect(identityColor('node:7')).toBe(colors[7])
    expect(identityColor('node:7', 'task')).not.toBe(
      identityColor('node:7', 'project')
    )
  })
})
