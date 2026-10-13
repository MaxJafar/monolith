import { createHash } from 'node:crypto'

export const limits = {
  sources: 6000,
  characters: 4_000_000,
  document: 100_000,
  chunks: 12000,
  batch: 8,
  chunk: 1000,
  overlap: 120
}

export type Source = {
  id: string
  title: string
  module: string
  workspace: string | null
  href: string
  text: string
  file?: { key: string; mime: string; size: number }
  fingerprint: string
}

export type Passage = {
  id: string
  source: Source
  ordinal: number
  text: string
  inferred: boolean
  vector?: number[]
}

export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')

/** Fixed Unicode-safe windows keep every character, including unbroken code. */
export function chunks(text: string): string[] {
  const characters = Array.from(text.trim())
  const result: string[] = []

  for (
    let start = 0;
    start < characters.length;
    start += limits.chunk - limits.overlap
  ) {
    result.push(characters.slice(start, start + limits.chunk).join(''))
    if (start + limits.chunk >= characters.length) break
  }

  return result
}

export function tokens(text: string): string[] {
  const normalized = text.normalize('NFKC').toLocaleLowerCase('en')
  // Include CJK bigrams so unspaced multilingual text remains searchable.
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  const cjk =
    normalized.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu
    ) ?? []

  return [
    ...words,
    ...cjk.flatMap(word => {
      const c = Array.from(word)

      return c.slice(1).map((_, i) => c[i]! + c[i + 1]!)
    })
  ]
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0
  let dot = 0,
    aa = 0,
    bb = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    aa += a[i]! ** 2
    bb += b[i]! ** 2
  }

  return aa && bb ? dot / Math.sqrt(aa * bb) : 0
}

/** BM25 and cosine ranks are fused, avoiding incompatible raw score scales. */
export function retrieve(
  passages: Passage[],
  query: string,
  vector?: number[]
): (Passage & { score: number })[] {
  const terms = [...new Set(tokens(query))]
  const bags = passages.map(p => tokens(p.source.title + '\n' + p.text))
  const average =
    bags.reduce((sum, bag) => sum + bag.length, 0) / Math.max(1, bags.length)
  const frequencies = terms.map(
    term => bags.filter(bag => bag.includes(term)).length
  )
  const lexical = passages
    .map((p, index) => ({
      p,
      score: terms.reduce((score, term, ti) => {
        const bag = bags[index]!,
          frequency = bag.filter(word => word === term).length

        if (!frequency) return score

        const idf = Math.log(
          1 +
            (passages.length - frequencies[ti]! + 0.5) /
              (frequencies[ti]! + 0.5)
        )

        return (
          score +
          (idf * (frequency * 2.2)) /
            (frequency +
              1.2 * (0.25 + (0.75 * bag.length) / Math.max(1, average)))
        )
      }, 0)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)
  const semantic = vector
    ? passages
        .filter(p => p.vector)
        .map(p => ({ p, score: cosine(vector, p.vector!) }))
        .filter(item => item.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 60)
    : []
  const fused = new Map<string, Passage & { score: number }>()

  for (const list of [lexical, semantic])
    list.forEach(({ p }, rank) => {
      const current = fused.get(p.id)
      fused.set(p.id, {
        ...p,
        score: (current?.score ?? 0) + 1 / (60 + rank + 1)
      })
    })

  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, 12)
}

export function isFresh(
  source: Source | undefined,
  fingerprint: string,
  model: string,
  expected: string
): boolean {
  return !!source && source.fingerprint === fingerprint && model === expected
}
