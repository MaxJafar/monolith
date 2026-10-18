import type { GraphEdge, GraphNode, PageKind } from '@monolith/blocks'

import { type Passage, type Source, cosine, digest, tokens } from './retrieval'

export type AtlasKind = PageKind | 'tag' | 'topic' | 'source'

export type AtlasNode = GraphNode<AtlasKind>

type ContextEdge = GraphEdge<'tag' | 'topic' | 'context'>

const stop = new Set(
  `a an the and or but for to of in on with from by at as is are was were be been being this that these those it its we our you your they their them he she his her us me my i not no yes can could should would will have has had do does did how what when where why who which about into over under through all any each every more most other some such than then there here up out so also just only very new use using used page pages note notes task tasks project projects workspace database databases untitled content title completed true false today tomorrow week month year create update add find make get set help work working team item items one two three name none empty text type description status priority date done start end action actions plan planning overview summary introduction conclusion general information example section list table en ms zh 的 了 在 是 和 与 及 或 这 那 一个 我们 你们 他们 dan yang untuk dengan dari pada ini itu saya anda kita kami adalah akan telah boleh tidak ke di`.split(
    /\s+/
  )
)

// Common action verbs in task titles do not describe a shared subject.
for (const word of 'build bring review verify check implement prepare collect define write ship refine organize manage open close edit save delete remove select click read include ensure allow'.split(
  ' '
))
  stop.add(word)

export const normalizeConcept = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en')

export function sourceKey(
  source: Pick<Source, 'id' | 'entityType'>
): string | undefined {
  if (source.entityType === 'surface') return
  if (source.id.startsWith('page:'))
    return source.id.replace(/^page:/, 'document:')
  if (source.id.startsWith('record:')) return source.id
  if (source.id.startsWith('knowledge:')) return `source:${source.id.slice(10)}`
}

function meaningful(value: string) {
  return (
    value.length >= 3 &&
    value.length <= 40 &&
    !stop.has(value) &&
    !/^\d+$/.test(value) &&
    !/^(?=.*\d)[a-f0-9]{4,}$/i.test(value)
  )
}

export function sourceTags(source: Source) {
  // Inline hashtags are explicit metadata, not inferred topics. Headings, URL
  // fragments and hex colors are deliberately excluded.
  const hashtags = [
    ...(source.bodyText ?? source.text)
      .slice(0, 24000)
      .matchAll(/(?:^|[\s(])#([\p{L}][\p{L}\p{N}_/-]{1,63})/gu)
  ]
    .map(match => match[1]!)
    .filter(tag => !/^[a-f0-9]{6}$/i.test(tag))

  return [
    ...new Set(
      [...(source.tags ?? []), ...hashtags]
        .map(normalizeConcept)
        .filter(Boolean)
    )
  ]
    .sort()
    .slice(0, 24)
}

function features(source: Source) {
  const weights = new Map<string, number>()

  function add(text: string, boost: number) {
    const words = tokens(text)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]!

      if (!meaningful(word)) continue
      weights.set(word, Math.min(12, (weights.get(word) ?? 0) + boost))
      const next = words[i + 1]

      if (next && meaningful(next) && word !== next) {
        const phrase = `${word} ${next}`
        weights.set(
          phrase,
          Math.min(16, (weights.get(phrase) ?? 0) + boost * 1.4)
        )
      }
    }
  }
  add(source.title, 4)
  add((source.bodyText ?? source.text).slice(0, 8000), 1)

  return weights
}

/** A bounded, read-only view of the same authorized passages used by RAG.
 * Nothing inferred here is written as a user-authored relationship. */
export function buildContextGraph(sources: Source[], passages: Passage[]) {
  const eligible = sources.filter(source => !!sourceKey(source))
  const chosen = eligible
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 600)
  const nodes: AtlasNode[] = chosen.map(source => {
    const key = sourceKey(source)!
    const tags = sourceTags(source)
    const type = source.entityType ?? 'source'

    return {
      key,
      id: key.slice(key.indexOf(':') + 1),
      kind: key.startsWith('document:')
        ? 'document'
        : key.startsWith('record:')
          ? 'record'
          : 'source',
      title: source.title,
      entityType:
        type === 'page' && (tags.includes('idea') || tags.includes('ideas'))
          ? 'idea'
          : type,
      context: source.module,
      tags,
      excerpt: source.text.slice(0, 360),
      href: source.href
    }
  })
  const edges: ContextEdge[] = []
  const known = new Map(nodes.map(node => [node.key, node]))
  const hub = (kind: 'tag' | 'topic', label: string) => {
    const key = `${kind}:${digest(label).slice(0, 24)}`

    if (!known.has(key)) {
      const node: AtlasNode = {
        key,
        id: key.slice(kind.length + 1),
        kind,
        entityType: kind,
        title: label,
        tags: kind === 'tag' ? [label] : []
      }
      nodes.push(node)
      known.set(key, node)
    }

    return key
  }
  const tags = [...new Set(nodes.flatMap(node => node.tags ?? []))]
    .sort()
    .slice(0, 160)
  const allowedTags = new Set(tags)

  for (const node of [...nodes])
    for (const tag of node.tags ?? []) {
      if (!allowedTags.has(tag)) continue

      const target = hub('tag', tag)
      edges.push({
        id: `tag:${node.key}:${target}`,
        source: node.key,
        target,
        kind: 'tag',
        label: tag,
        method: 'tag',
        strength: 1,
        evidence: [`#${tag}`]
      })
    }

  // Nested tags form a taxonomy while retaining the original full tag label.
  for (const tag of tags) {
    const parent = tag.includes('/') ? tag.slice(0, tag.lastIndexOf('/')) : ''

    if (parent && allowedTags.has(parent))
      edges.push({
        id: `taxonomy:${tag}`,
        source: hub('tag', tag),
        target: hub('tag', parent),
        kind: 'tag',
        label: parent,
        method: 'tag',
        strength: 1,
        evidence: [`#${tag}`]
      })
  }

  const bags = chosen.map(features)
  const postings = new Map<string, number[]>()
  bags.forEach((bag, i) => {
    for (const word of bag.keys())
      postings.set(word, [...(postings.get(word) ?? []), i])
  })
  const concepts = [...postings]
    .filter(
      ([, members]) =>
        members.length >= 2 &&
        members.length <= Math.max(3, chosen.length * 0.55)
    )
    .map(([word, members]) => ({
      word,
      members,
      score:
        members.length *
        Math.log(1 + chosen.length / members.length) *
        (word.includes(' ') ? 1.7 : 1)
    }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
  const topics: typeof concepts = []
  const topicCount = new Map<number, number>()

  for (const concept of concepts) {
    if (topics.length >= 48) break
    // Prefer a specific phrase over its redundant component words.
    if (
      topics.some(
        other =>
          other.word.includes(concept.word) &&
          concept.members.every(i => other.members.includes(i))
      )
    )
      continue

    const members = concept.members.filter(i => (topicCount.get(i) ?? 0) < 4)

    if (members.length < 2) continue
    topics.push({ ...concept, members })
    const target = hub('topic', concept.word)

    for (const i of members) {
      topicCount.set(i, (topicCount.get(i) ?? 0) + 1)
      edges.push({
        id: `topic:${nodes[i]!.key}:${target}`,
        source: nodes[i]!.key,
        target,
        kind: 'topic',
        label: concept.word,
        method: 'topic',
        strength: 1,
        evidence: [concept.word]
      })
    }
  }

  const vectors = new Map<string, number[]>()
  const samples = new Map<string, number[][]>()

  for (const passage of passages) {
    if (!passage.vector) continue

    const current = samples.get(passage.source.id) ?? []

    if (current.length < 4) current.push(passage.vector)
    samples.set(passage.source.id, current)
  }

  for (const source of chosen) {
    const current = samples.get(source.id)

    if (!current?.length) continue

    const mean = current[0]!.map(
      (_, i) =>
        current.reduce((sum, vector) => sum + vector[i]!, 0) / current.length
    )

    if (mean.every(Number.isFinite)) vectors.set(source.id, mean)
  }

  // Small locality-sensitive buckets bound vector comparisons. Keyword
  // candidates are included too, so this can run without a model host.
  const buckets = new Map<string, number[]>()
  const bands = (vector: number[]) =>
    Array.from(
      { length: 6 },
      (_, band) =>
        `${band}:` +
        Array.from({ length: 7 }, (_, bit) =>
          vector[(band * 127 + bit * 53) % vector.length]! >= 0 ? '1' : '0'
        ).join('')
    )
  chosen.forEach((source, i) => {
    const vector = vectors.get(source.id)

    if (vector)
      for (const band of bands(vector))
        buckets.set(band, [...(buckets.get(band) ?? []), i])
  })
  const weighted = bags.map(
    bag =>
      new Map(
        [...bag].map(([word, count]) => [
          word,
          (1 + Math.log(count)) *
            Math.log(1 + chosen.length / (postings.get(word)?.length ?? 1))
        ])
      )
  )
  const lengths = weighted.map(bag =>
    Math.sqrt([...bag.values()].reduce((sum, weight) => sum + weight ** 2, 0))
  )
  const candidates = new Map<string, ContextEdge>()
  chosen.forEach((source, i) => {
    const options = new Map<number, number>()
    const terms = [...weighted[i]!].sort((a, b) => b[1] - a[1]).slice(0, 24)

    for (const [word, weight] of terms)
      for (const j of (postings.get(word) ?? []).slice(0, 120))
        if (j !== i) options.set(j, (options.get(j) ?? 0) + weight)

    const vector = vectors.get(source.id)
    const shortlist = new Set(
      [...options]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([j]) => j)
    )

    if (vector)
      for (const band of bands(vector))
        for (const j of (buckets.get(band) ?? []).slice(0, 24))
          if (j !== i && shortlist.size < 70) shortlist.add(j)

    for (const j of shortlist) {
      const id = `context:${[source.id, chosen[j]!.id].sort().join(':')}`

      if (candidates.has(id)) continue

      const shared = [...weighted[i]!]
        .filter(([word]) => weighted[j]!.has(word))
        .sort((a, b) => b[1] - a[1])
      const dot = shared.reduce(
        (sum, [word, weight]) => sum + weight * weighted[j]!.get(word)!,
        0
      )
      const lexical =
        lengths[i] && lengths[j] ? dot / (lengths[i] * lengths[j]) : 0
      const other = vectors.get(chosen[j]!.id)
      const semantic = vector && other ? cosine(vector, other) : 0
      const method =
        semantic >= 0.64 && semantic > lexical ? 'embedding' : 'lexical'
      const strength = method === 'embedding' ? semantic : lexical

      if (strength < 0.28 || (method === 'lexical' && shared.length < 2))
        continue
      candidates.set(id, {
        id,
        source: nodes[i]!.key,
        target: nodes[j]!.key,
        kind: 'context',
        label:
          method === 'embedding' ? 'Semantic similarity' : 'Shared context',
        method,
        strength: Math.min(1, strength),
        evidence: shared.slice(0, 5).map(([word]) => word)
      })
    }
  })
  const connectionCounts = new Map<string, number>()

  for (const edge of [...candidates.values()].sort(
    (a, b) => b.strength! - a.strength! || a.id.localeCompare(b.id)
  )) {
    if (
      (connectionCounts.get(edge.source) ?? 0) >= 4 ||
      (connectionCounts.get(edge.target) ?? 0) >= 4
    )
      continue
    edges.push(edge)
    for (const key of [edge.source, edge.target])
      connectionCounts.set(key, (connectionCounts.get(key) ?? 0) + 1)
  }

  return {
    nodes,
    edges,
    unresolved: 0,
    coverage: {
      eligible: eligible.length,
      analyzed: chosen.length,
      embedded: vectors.size,
      topics: topics.length,
      tags: tags.length,
      omittedTags: Math.max(
        0,
        new Set(chosen.flatMap(sourceTags)).size - tags.length
      )
    }
  }
}
