import { describe, expect, it } from 'vitest'

import {
  buildContextGraph,
  sourceKey,
  sourceTags
} from '../lib/search/contextGraph'
import type { Passage, Source } from '../lib/search/retrieval'

const source = (
  id: string,
  title: string,
  text: string,
  extra: Partial<Source> = {}
): Source => ({
  id: `record:${id}`,
  title,
  text,
  href: `/databases?record=${id}`,
  workspace: 'workspace',
  module: 'databases',
  fingerprint: id,
  ...extra
})
const sources = [
  source(
    'a',
    'Solar energy research',
    'Photovoltaic battery storage and solar energy resilience.',
    { entityType: 'note', tags: ['Energy', 'energy/solar'] }
  ),
  source(
    'b',
    'Battery storage prototype',
    'Photovoltaic battery storage enables solar energy resilience.',
    { entityType: 'task', tags: ['energy'] }
  ),
  source(
    'c',
    'Clean energy program',
    'Battery storage and photovoltaic materials improve energy resilience.',
    { entityType: 'project', tags: ['energy/solar'] }
  ),
  source('d', 'Bird watching', 'Wildlife migration in coastal wetlands.', {
    entityType: 'note'
  })
]
describe('Atlas contextual graph from RAG evidence', () => {
  it('normalizes explicit tags, reads hashtags and excludes headings, links and hex colors', () => {
    expect(
      sourceTags(
        source(
          'a',
          'Tags',
          '# Heading\n#Research #研究计划 https://example.com/#fragment #ffffff',
          { tags: [' RESEARCH ', '#Research', 'Design/UX'] }
        )
      )
    ).toEqual(['design/ux', 'research', '研究计划'])
  })
  it('connects canonical tasks, notes and projects through shared tag hubs', () => {
    const graph = buildContextGraph(sources, [])
    const energy = graph.nodes.find(
      node => node.kind === 'tag' && node.title === 'energy'
    )!
    expect(graph.edges.filter(edge => edge.target === energy.key).length).toBe(
      3
    )
    expect(graph.nodes.find(node => node.key === 'record:b')?.entityType).toBe(
      'task'
    )
    expect(graph.nodes.find(node => node.key === 'record:c')?.entityType).toBe(
      'project'
    )
    expect(graph.edges.some(edge => edge.id.startsWith('taxonomy:'))).toBe(true)
  })
  it('preserves canonical task and project identities when they carry an idea tag', () => {
    const graph = buildContextGraph(
      ['task', 'project', 'page'].map(type =>
        source(type, type, '', { entityType: type, tags: ['idea'] })
      ),
      []
    )
    expect(
      graph.nodes
        .filter(node => node.kind === 'record')
        .map(node => node.entityType)
        .sort()
    ).toEqual(['idea', 'project', 'task'])
  })
  it('derives specific topics and contextual evidence without linking unrelated content', () => {
    const graph = buildContextGraph(sources, [])
    expect(
      graph.nodes.some(
        node =>
          node.kind === 'topic' && /battery|solar|photovoltaic/.test(node.title)
      )
    ).toBe(true)
    const edges = graph.edges.filter(edge => edge.kind === 'context')
    expect(edges.length).toBeGreaterThan(0)
    expect(
      edges.every(
        edge => edge.method === 'lexical' && edge.evidence!.length >= 2
      )
    ).toBe(true)
    expect(
      edges.some(
        edge => edge.source === 'record:d' || edge.target === 'record:d'
      )
    ).toBe(false)
  })
  it('reuses indexed vectors for semantic links even without shared words', () => {
    const input = [
      source('a', 'Canine companion', 'Puppies enjoy fetching.'),
      source('b', 'Dog friendship', 'Hounds love retrieving.')
    ]
    const passages: Passage[] = input.map(source => ({
      id: source.id,
      source,
      ordinal: 0,
      text: source.text,
      inferred: false,
      vector: Array.from({ length: 768 }, (_, i) => Math.sin(i + 1))
    }))
    const graph = buildContextGraph(input, passages)
    expect(graph.edges.find(edge => edge.kind === 'context')).toMatchObject({
      method: 'embedding',
      strength: 1
    })
    expect(graph.coverage.embedded).toBe(2)
    expect(
      buildContextGraph(input, []).edges.filter(edge => edge.kind === 'context')
    ).toHaveLength(0)
  })
  it('keeps identities deterministic across source ordering and never mutates source content', () => {
    const before = JSON.stringify(sources)
    expect(buildContextGraph(sources, [])).toEqual(
      buildContextGraph([...sources].reverse(), [])
    )
    expect(JSON.stringify(sources)).toBe(before)
  })
  it('bounds dense contextual degree and reports analysis coverage', () => {
    const input = Array.from({ length: 620 }, (_, i) =>
      source(
        String(i),
        `Photovoltaic research ${i}`,
        'Battery storage improves photovoltaic energy resilience.'
      )
    )
    const graph = buildContextGraph(input, [])
    expect(graph.coverage).toMatchObject({ analyzed: 600, eligible: 620 })
    const degree = new Map<string, number>()
    for (const edge of graph.edges.filter(edge => edge.kind === 'context'))
      for (const key of [edge.source, edge.target])
        degree.set(key, (degree.get(key) ?? 0) + 1)
    expect(Math.max(...degree.values())).toBeLessThanOrEqual(4)
    expect(new Set(graph.edges.map(edge => edge.id)).size).toBe(
      graph.edges.length
    )
  })
  it('excludes system surfaces and maps imported knowledge to its original source', () => {
    expect(sourceKey({ id: 'page:p', entityType: 'surface' })).toBeUndefined()
    expect(sourceKey({ id: 'page:p' })).toBe('document:p')
    const graph = buildContextGraph(
      [
        source('a', 'Home', '', { id: 'page:a', entityType: 'surface' }),
        source('b', 'Research archive', 'Solar energy', { id: 'knowledge:b' })
      ],
      []
    )
    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0]).toMatchObject({
      kind: 'source',
      key: 'source:b',
      href: '/databases?record=b'
    })
  })
  it('does not derive topics or contextual links from generic boilerplate', () => {
    const graph = buildContextGraph(
      ['a', 'b', 'c'].map(id =>
        source(
          id,
          'New project',
          'This is the new page for our project. Build, review and verify. 0ad7bdb1-4f74-4f74-9c52-fe2d1e55ffba'
        )
      ),
      []
    )
    expect(graph.edges).toHaveLength(0)
  })
  it('does not mistake shared database display metadata for topical evidence', () => {
    const graph = buildContextGraph(
      [
        source('a', 'Solar research', 'Research archive shared database', {
          bodyText: 'Photovoltaic energy.'
        }),
        source(
          'b',
          'Wildlife observation',
          'Research archive shared database',
          { bodyText: 'Bird migration.' }
        )
      ],
      []
    )
    expect(graph.edges).toHaveLength(0)
  })
})
