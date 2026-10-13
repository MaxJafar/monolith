import { sql } from 'drizzle-orm'

import { ClientError } from '@lifeforge/server-utils'

import { enrichFile } from './files'
import { embed, embeddingVersion } from './inference'
import {
  type Passage,
  type Source,
  chunks,
  digest,
  isFresh,
  limits
} from './retrieval'
import { type Scope, type Store, collectSources } from './sources'

type Document = {
  source_id: string
  fingerprint: string
  model: string
  content: string
  inferred: boolean
  warning: string
  chunk_count: number
}
type Vector = {
  source_id: string
  ordinal: number
  fingerprint: string
  model: string
  vector: number[]
}

export async function snapshot(db: Store, actor: string, scope: Scope = {}) {
  const sources = await collectSources(db, actor, scope)
  const documents = await db.execute<Document>(
    sql`select source_id,fingerprint,model,content,inferred,warning,chunk_count from search__documents where owner_id=${actor} limit ${limits.sources + 1}`
  )
  const vectors = await db.execute<Vector>(
    sql`select source_id,ordinal,fingerprint,model,vector from search__chunks where owner_id=${actor} limit ${limits.chunks + 1}`
  )

  if (documents.length > limits.sources || vectors.length > limits.chunks)
    throw new ClientError(
      'Search index limit exceeded. Clear the index and index fewer modules.',
      413
    )

  const docs = new Map(documents.map(d => [d.source_id, d]))
  const embeddings = new Map(
    vectors.map(v => [`${v.source_id}:${v.ordinal}`, v])
  )
  const model = embeddingVersion()
  const passages: Passage[] = [],
    pending: { source: Source; document?: Document; missing: number[] }[] = []
  const warnings: { source: string; code: string }[] = []

  let ready = 0

  for (const source of sources) {
    const cached = docs.get(source.id)
    const document =
      cached && isFresh(source, cached.fingerprint, cached.model, model)
        ? cached
        : undefined
    const windows = chunks(document?.content ?? source.text)
    const missing: number[] = []

    if (document?.warning)
      warnings.push({ source: source.title, code: document.warning })
    windows.forEach((text, ordinal) => {
      const stored = embeddings.get(`${source.id}:${ordinal}`)
      const vector =
        document &&
        stored &&
        isFresh(source, stored.fingerprint, stored.model, model) &&
        stored.vector.length === 768 &&
        stored.vector.every(Number.isFinite)
          ? stored.vector
          : undefined

      if (!vector) missing.push(ordinal)
      passages.push({
        id: digest(source.id + ':' + source.fingerprint + ':' + ordinal),
        source,
        ordinal,
        text,
        inferred: document?.inferred ?? false,
        vector
      })
    })
    if (document && !missing.length) ready++
    else pending.push({ source, document, missing })
    if (passages.length > limits.chunks)
      throw new ClientError(
        'Search passage limit exceeded. Narrow your workspace or module.',
        413
      )
  }

  return { sources, documents, passages, pending, ready, warnings }
}

export async function indexBatch(db: Store, actor: string, scope: Scope) {
  // Requests for the same actor serialize; no task outlives its RLS transaction.
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${actor + ':system-search'},0))`
  )
  const before = await snapshot(db, actor, scope)

  if (!scope.workspace_id && !scope.module) {
    const ids = new Set(before.sources.map(s => s.id))

    for (const stale of before.documents.filter(d => !ids.has(d.source_id))) {
      await db.execute(
        sql`delete from search__chunks where owner_id=${actor} and source_id=${stale.source_id}`
      )
      await db.execute(
        sql`delete from search__documents where owner_id=${actor} and source_id=${stale.source_id}`
      )
    }
  }

  const item = before.pending[0]

  if (!item)
    return {
      total: before.sources.length,
      ready: before.ready,
      pending: 0,
      processed: 0,
      source: '',
      warnings: before.warnings
    }

  const { source } = item
  const model = embeddingVersion()
  const enrichment = item.document
    ? {
        text: item.document.content,
        inferred: item.document.inferred,
        warning: item.document.warning
      }
    : await enrichFile(source)
  const windows = chunks(enrichment.text)
  const ordinals = item.document
    ? item.missing.slice(0, limits.batch)
    : windows.map((_, i) => i).slice(0, limits.batch)
  const vectors = ordinals.length
    ? await embed(
        ordinals.map(i => windows[i]!),
        'document',
        source.title
      )
    : []
  // Content or sharing can change while inference is running. Never commit the
  // old snapshot as the current index after that change.
  const latest = (await collectSources(db, actor, scope)).find(
    s => s.id === source.id
  )

  if (!latest || latest.fingerprint !== source.fingerprint)
    throw new ClientError(
      'Source changed while indexing. Retry to use its latest version.',
      409
    )
  if (!item.document)
    await db.execute(
      sql`delete from search__chunks where owner_id=${actor} and source_id=${source.id}`
    )
  await db.execute(sql`insert into search__documents(owner_id,source_id,fingerprint,model,content,inferred,warning,chunk_count) values(${actor},${source.id},${source.fingerprint},${model},${enrichment.text},${enrichment.inferred},${enrichment.warning},${windows.length})
    on conflict(owner_id,source_id) do update set fingerprint=excluded.fingerprint,model=excluded.model,content=excluded.content,inferred=excluded.inferred,warning=excluded.warning,chunk_count=excluded.chunk_count,updated=now()`)
  for (let i = 0; i < ordinals.length; i++)
    await db.execute(sql`insert into search__chunks(owner_id,source_id,ordinal,fingerprint,model,vector) values(${actor},${source.id},${ordinals[i]!},${source.fingerprint},${model},${JSON.stringify(vectors[i]!)}::jsonb)
    on conflict(owner_id,source_id,ordinal) do update set fingerprint=excluded.fingerprint,model=excluded.model,vector=excluded.vector`)

  const completed =
    ordinals.length === (item.document ? item.missing.length : windows.length)
  const ready = before.ready + (completed ? 1 : 0)

  return {
    total: before.sources.length,
    ready,
    pending: before.sources.length - ready,
    processed: ordinals.length,
    source: source.title,
    warnings: [
      ...before.warnings.filter(w => w.source !== source.title),
      ...(enrichment.warning
        ? [{ source: source.title, code: enrichment.warning }]
        : [])
    ]
  }
}
