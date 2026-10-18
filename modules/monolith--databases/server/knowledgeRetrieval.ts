import { createHash } from 'node:crypto'

import {
  type KnowledgeCitation,
  type KnowledgeSearch,
  knowledgeLimits
} from '../knowledgeLibraryShared'

export type RetrievalSource = {
  id: string
  collection_id: string
  title: string
  kind: 'page' | 'record' | 'text'
  content: string
  href: string | null
  updated: string
}

export type KnowledgeChunk = { index: number; text: string }

/** Deterministic paragraph/word boundaries, with bounded overlap and progress. */
export function chunkKnowledge(content: string): KnowledgeChunk[] {
  const value = content.replace(/\r\n?/g, '\n').trim()
  const chunks: KnowledgeChunk[] = []

  let start = 0

  while (start < value.length) {
    let end = Math.min(start + knowledgeLimits.chunkSize, value.length)

    if (end < value.length) {
      const window = value.slice(start, end)
      const boundary = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('\n'),
        window.lastIndexOf(' ')
      )

      if (boundary > knowledgeLimits.chunkSize / 2) end = start + boundary
      // Do not bisect a UTF-16 surrogate pair.
      if (/^[\uDC00-\uDFFF]$/.test(value[end]!)) end--
    }

    const text = value.slice(start, end).trim()

    if (text) chunks.push({ index: chunks.length, text })
    if (end >= value.length) break
    start = Math.max(start + 1, end - knowledgeLimits.chunkOverlap)
    if (/^[\uDC00-\uDFFF]$/.test(value[start]!)) start++
  }

  return chunks
}

const stopWords = new Set(
  'a an and are as at be by for from how i in is it of on or that the this to was what when where which who why with'.split(
    ' '
  )
)

export function knowledgeTokens(text: string): string[] {
  const words =
    text
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .match(/[\p{L}\p{N}]+/gu) ?? []

  return words.filter(word => !stopWords.has(word))
}

/** BM25-style lexical scoring; no embeddings, model calls or generated claims. */
export function retrieveKnowledge(
  sources: RetrievalSource[],
  query: string,
  limit = 8
): KnowledgeSearch {
  const queryTokens = [...new Set(knowledgeTokens(query))].slice(0, 64)
  const candidates = sources.flatMap(source => {
    const chunks = chunkKnowledge(source.content || source.title)

    return chunks.map(chunk => {
      const tokens = knowledgeTokens(chunk.text)
      const counts = new Map<string, number>()

      for (const token of tokens)
        counts.set(token, (counts.get(token) ?? 0) + 1)

      return {
        source,
        chunk,
        tokens,
        counts,
        titleTokens: new Set(knowledgeTokens(source.title))
      }
    })
  })
  const frequencies = new Map<string, number>()

  for (const candidate of candidates)
    for (const token of new Set([
      ...candidate.tokens,
      ...candidate.titleTokens
    ]))
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1)

  const average =
    candidates.reduce((sum, item) => sum + item.tokens.length, 0) /
      (candidates.length || 1) || 1
  const ranked = queryTokens.length
    ? candidates
        .map(candidate => {
          let score = 0
          let matched = 0

          for (const token of queryTokens) {
            const occurrences = candidate.counts.get(token) ?? 0
            const titleMatch = candidate.titleTokens.has(token)

            if (!occurrences && !titleMatch) continue
            matched++
            const idf = Math.log(
              1 +
                (candidates.length - (frequencies.get(token) ?? 0) + 0.5) /
                  ((frequencies.get(token) ?? 0) + 0.5)
            )
            score +=
              idf *
              ((occurrences * 2.2) /
                (occurrences +
                  1.2 * (0.25 + (0.75 * candidate.tokens.length) / average)) +
                (titleMatch ? 1.5 : 0))
          }

          return { ...candidate, score: score * (matched / queryTokens.length) }
        })
        .filter(candidate => candidate.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.source.id.localeCompare(b.source.id) ||
            a.chunk.index - b.chunk.index
        )
    : []
  const citations: KnowledgeCitation[] = ranked
    .slice(0, Math.min(knowledgeLimits.results, Math.max(1, limit)))
    .map(({ source, chunk, score }) => ({
      id: `${source.id}:${chunk.index}:${createHash('sha256').update(chunk.text).digest('hex').slice(0, 16)}`,
      source_id: source.id,
      collection_id: source.collection_id,
      title: source.title,
      kind: source.kind,
      href: source.href,
      chunk_index: chunk.index,
      text: chunk.text,
      score: Number(score.toFixed(6)),
      updated: source.updated
    }))

  return {
    query,
    engine: 'lexical',
    answer: citations
      .slice(0, 3)
      .map(
        (citation, index) =>
          `[${index + 1}] ${citation.text.length > 360 ? citation.text.slice(0, 360).trimEnd() + '…' : citation.text}`
      )
      .join('\n\n'),
    citations,
    searched_sources: sources.length,
    total_chunks: candidates.length
  }
}
