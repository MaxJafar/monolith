import type { GraphEdge, KnowledgeSnapshot } from '@monolith/blocks'

import type {
  Field,
  RecordPage,
  RelationLink,
  SavedView,
  Snapshot
} from '../../../shared'

function append<T>(index: Map<string, T[]>, key: string, value: T) {
  const group = index.get(key)

  if (group) group.push(value)
  else index.set(key, [value])
}

export function indexSnapshot(snapshot: Snapshot) {
  const fieldsByBase = new Map<string, Field[]>()
  const recordsByBase = new Map<string, RecordPage[]>()
  const viewsByBase = new Map<string, SavedView[]>()
  const linksByField = new Map<string, Map<string, RelationLink[]>>()

  for (const field of snapshot.fields)
    append(fieldsByBase, field.base_id, field)
  for (const fields of fieldsByBase.values())
    fields.sort((a, b) => a.position - b.position)
  for (const record of snapshot.records)
    append(recordsByBase, record.base_id, record)
  for (const view of snapshot.views) append(viewsByBase, view.base_id, view)

  for (const link of snapshot.links) {
    let sources = linksByField.get(link.field_id)

    if (!sources) {
      sources = new Map()
      linksByField.set(link.field_id, sources)
    }
    append(sources, link.source_record_id, link)
  }

  return {
    basesById: new Map(snapshot.bases.map(base => [base.id, base])),
    recordsById: new Map(snapshot.records.map(record => [record.id, record])),
    fieldsByBase,
    recordsByBase,
    viewsByBase,
    linksByField
  }
}

export type SnapshotIndex = ReturnType<typeof indexSnapshot>

export function indexKnowledge(snapshot: KnowledgeSnapshot) {
  const backlinks = new Map<string, GraphEdge[]>()
  const references = new Map<string, GraphEdge[]>()
  const related = new Map<string, GraphEdge[]>()

  for (const edge of snapshot.edges) {
    if (edge.kind === 'mention') {
      append(backlinks, edge.target, edge)
      append(references, edge.source, edge)
    } else {
      append(related, edge.source, edge)
      if (edge.target !== edge.source) append(related, edge.target, edge)
    }
  }

  return {
    nodesByKey: new Map(snapshot.nodes.map(node => [node.key, node])),
    backlinks,
    references,
    related
  }
}

export type KnowledgeIndex = ReturnType<typeof indexKnowledge>
