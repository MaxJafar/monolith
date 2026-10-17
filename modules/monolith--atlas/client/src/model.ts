import type {
  GraphEdge as BaseEdge,
  GraphNode as BaseNode,
  KnowledgeSnapshot as BaseSnapshot,
  GraphEdgeKind,
  PageKind
} from '@monolith/blocks'

export type AtlasKind = PageKind | 'tag' | 'topic' | 'source' | 'database'

export type GraphNode = BaseNode<AtlasKind>

export type KnowledgeSnapshot = BaseSnapshot<AtlasKind, GraphEdgeKind>

export type GraphEdge = BaseEdge<GraphEdgeKind>

export type Layers = {
  tags: boolean
  topics: boolean
  context: boolean
  strength: number
  colors: 'type' | 'individual'
}

export const entityKinds = [
  'redraw',
  'page',
  'database',
  'task',
  'project',
  'note',
  'idea',
  'event',
  'post',
  'source',
  'tag',
  'topic'
] as const

export const entityHues: Record<string, number> = {
  redraw: 275,
  page: 215,
  database: 210,
  task: 153,
  project: 265,
  note: 39,
  idea: 320,
  event: 188,
  post: 17,
  source: 225,
  tag: 330,
  topic: 28
}

export function entityType(node: GraphNode) {
  return (
    node.entityType ??
    (node.kind === 'record'
      ? 'page'
      : node.kind === 'document'
        ? 'page'
        : node.kind)
  )
}

function hash(value: string) {
  let result = 2166136261
  for (const char of value)
    result = Math.imul(result ^ char.charCodeAt(0), 16777619)

  return result >>> 0
}

export function identityColor(id: string, type?: string) {
  const value = hash(id)
  const hue = type
    ? (entityHues[type] ?? 210) + (value % 1700) / 100 - 8.5
    : (value % 36000) / 100

  return `hsl(${hue.toFixed(2)} ${58 + (value % 18)}% ${43 + ((value >>> 8) % 10)}%)`
}

export function isPage(node: GraphNode): node is BaseNode {
  return (
    node.kind === 'document' || node.kind === 'record' || node.kind === 'note' || node.kind === 'redraw'
  )
}

export function mergeKnowledge(
  base: BaseSnapshot,
  layer: KnowledgeSnapshot | undefined,
  options: Layers
): KnowledgeSnapshot {
  const catalog = new Map<string, GraphNode>(
    base.nodes.map(node => [node.key, node])
  )

  for (const node of layer?.nodes ?? []) {
    if (
      (node.kind === 'tag' && !options.tags) ||
      (node.kind === 'topic' && !options.topics)
    )
      continue

    const original = catalog.get(node.key)
    // Metadata enriches canonical nodes without replacing their source labels.
    catalog.set(node.key, {
      ...node,
      ...original,
      entityType: node.entityType,
      tags: node.tags,
      href: node.href
    })
  }

  const collectionEdges: GraphEdge[] = []
  for (const database of base.databases ?? []) {
    const key = `database:${database.id}`
    catalog.set(key, {
      id: database.id,
      key,
      kind: 'database',
      title: database.title,
      href: database.href
    })
    for (const id of database.recordIds) {
      const target = `record:${id}`
      if (catalog.has(target))
        collectionEdges.push({
          id: `collection:${database.id}:${id}`,
          source: key,
          target,
          kind: 'collection',
          label: 'Database membership'
        })
    }
    for (const source of database.embeddedIn) {
      if (catalog.has(source))
        collectionEdges.push({
          id: `embed:${source}:${database.id}`,
          source,
          target: key,
          kind: 'embed',
          label: 'Inline database'
        })
    }
  }
  const explicit = new Set(
    base.edges.map(edge => [edge.source, edge.target].sort().join('|'))
  )
  const edges = [
    ...base.edges,
    ...collectionEdges,
    ...(layer?.edges ?? []).filter(
      edge =>
        catalog.has(edge.source) &&
        catalog.has(edge.target) &&
        (edge.kind !== 'context' ||
          (options.context &&
            (edge.strength ?? 0) >= options.strength &&
            !explicit.has([edge.source, edge.target].sort().join('|'))))
    )
  ]

  return {
    nodes: [...catalog.values()].map(node => ({
      ...node,
      color: identityColor(
        node.key,
        options.colors === 'type' ? entityType(node) : undefined
      )
    })),
    edges: edges.map(edge => ({
      ...edge,
      color: identityColor(
        edge.id,
        options.colors === 'type'
          ? edge.kind === 'tag'
            ? 'tag'
            : edge.kind === 'topic'
              ? 'topic'
              : edge.kind === 'context'
                ? 'idea'
                : 'page'
          : undefined
      )
    })),
    unresolved: base.unresolved
  }
}

export const emptyGraph: BaseSnapshot = {
  nodes: [],
  edges: [],
  unresolved: 0
}

export type Filters = {
  search: string
  kind: string
  context: string
  tag: string
  orphans: boolean
  sort: string
  scope: string
  focus: string
  depth: number
}

export function indexGraph(graph: KnowledgeSnapshot) {
  const nodes = new Map(graph.nodes.map(node => [node.key, node]))
  const neighbors = new Map(
    graph.nodes.map(node => [node.key, new Set<string>()])
  )
  const incoming = new Map<string, GraphEdge[]>(),
    outgoing = new Map<string, GraphEdge[]>(),
    related = new Map<string, GraphEdge[]>()

  for (const edge of graph.edges) {
    if (
      !nodes.has(edge.source) ||
      !nodes.has(edge.target) ||
      edge.source === edge.target
    )
      continue
    neighbors.get(edge.source)!.add(edge.target)
    neighbors.get(edge.target)!.add(edge.source)

    if (!['mention', 'parent'].includes(edge.kind)) {
      for (const key of [edge.source, edge.target])
        related.set(key, [...(related.get(key) ?? []), edge])
    } else {
      incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    }
  }

  return { nodes, neighbors, incoming, outgoing, related }
}

export type GraphIndex = ReturnType<typeof indexGraph>

export function neighborhood(index: GraphIndex, focus: string, depth: number) {
  const visited = new Set<string>()

  if (!index.nodes.has(focus)) return visited
  visited.add(focus)
  let frontier = [focus]

  for (let step = 0; step < depth; step++) {
    const next: string[] = []

    for (const key of frontier)
      for (const neighbor of index.neighbors.get(key) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          next.push(neighbor)
        }
      }
    frontier = next
  }

  return visited
}

export function filterGraph(
  graph: KnowledgeSnapshot,
  index: GraphIndex,
  filters: Filters,
  limit = 600
) {
  const local =
    filters.scope === 'local' && index.nodes.has(filters.focus)
      ? neighborhood(index, filters.focus, filters.depth)
      : null
  const words = filters.search
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const matches = graph.nodes
    .filter(node => {
      const text =
        `${node.title} ${node.context ?? ''} ${(node.tags ?? []).join(' ')} ${node.excerpt ?? ''}`.toLocaleLowerCase()

      return (
        (!local || local.has(node.key)) &&
        (filters.kind === 'all' ||
          node.kind === filters.kind ||
          entityType(node) === filters.kind) &&
        (!filters.context || node.context === filters.context) &&
        (!filters.tag || node.tags?.includes(filters.tag)) &&
        (filters.orphans || !!index.neighbors.get(node.key)?.size) &&
        words.every(word => text.includes(word))
      )
    })
    .sort((a, b) =>
      filters.sort === 'connections'
        ? (index.neighbors.get(b.key)?.size ?? 0) -
            (index.neighbors.get(a.key)?.size ?? 0) ||
          a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title)
    )
  const nodes = matches.slice(0, limit)
  // Keep an already selected matching item visible even in a very large result set.
  const selected = matches.find(node => node.key === filters.focus)

  if (selected && !nodes.includes(selected) && nodes.length)
    nodes[nodes.length - 1] = selected

  const keys = new Set(nodes.map(node => node.key))

  return {
    graph: {
      nodes,
      edges: graph.edges.filter(
        edge => keys.has(edge.source) && keys.has(edge.target)
      ),
      unresolved: graph.unresolved
    },
    matches,
    omitted: Math.max(0, matches.length - nodes.length)
  }
}

export function targetOf(
  edge: GraphEdge,
  focus: string,
  index: GraphIndex
): GraphNode | undefined {
  return index.nodes.get(edge.source === focus ? edge.target : edge.source)
}
