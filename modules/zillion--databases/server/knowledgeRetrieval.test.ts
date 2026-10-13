import { describe, expect, it } from 'vitest'

import {
  knowledgeSearchInput,
  knowledgeSourceInput
} from '../knowledgeLibraryShared'
import {
  type RetrievalSource,
  chunkKnowledge,
  knowledgeTokens,
  retrieveKnowledge
} from './knowledgeRetrieval'

const source = (input: Partial<RetrievalSource> = {}): RetrievalSource => ({
  id: '00000000-0000-4000-8000-000000000001',
  collection_id: '00000000-0000-4000-8000-000000000002',
  title: 'Homelab runbook',
  kind: 'text',
  content:
    'Restart Minecraft after a scheduled backup. Backups are kept for seven days.',
  href: null,
  updated: '2026-10-13T00:00:00.000Z',
  ...input
})

describe('knowledge retrieval without external model credentials', () => {
  it('preserves small Markdown, normalizes line endings and ignores empty input', () => {
    expect(chunkKnowledge('')).toEqual([])
    expect(chunkKnowledge('  # Backup\r\n\r\nRestart Minecraft.  ')).toEqual([
      { index: 0, text: '# Backup\n\nRestart Minecraft.' }
    ])
  })
  it('bounds chunks and keeps all content through overlapping deterministic windows', () => {
    const value = 'word '.repeat(1_300).trim()
    const chunks = chunkKnowledge(value)
    expect(chunks.length).toBeGreaterThan(6)
    expect(chunks.every(chunk => chunk.text.length <= 1_000)).toBe(true)
    expect(chunks.map(chunk => chunk.index)).toEqual(
      chunks.map((_, index) => index)
    )
    expect(chunks.at(-1)?.text.endsWith('word')).toBe(true)
    expect(chunkKnowledge(value)).toEqual(chunks)
  })
  it('does not split surrogate pairs at hard boundaries or overlap starts', () => {
    const chunks = chunkKnowledge('a'.repeat(999) + '😀'.repeat(1_100))
    expect(
      chunks.every(
        chunk => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(chunk.text)
      )
    ).toBe(true)
  })
  it('normalizes Unicode and never gives tokenless queries false evidence', () => {
    expect(knowledgeTokens('THE Ｍｉｎｅｃｒａｆｔ server')).toEqual([
      'minecraft',
      'server'
    ])

    for (const query of ['???', 'the and of', 'unavailableterm']) {
      const result = retrieveKnowledge([source()], query)
      expect(result.citations).toEqual([])
      expect(result.answer).toBe('')
      expect(result.searched_sources).toBe(1)
    }
  })
  it('ranks matching evidence above unrelated content and preserves exact citation text', () => {
    const matching = source()
    const unrelated = source({
      id: '00000000-0000-4000-8000-000000000003',
      title: 'Gym log',
      content: 'Squats and running.'
    })
    const result = retrieveKnowledge([unrelated, matching], 'Minecraft backup')
    expect(result.citations[0]).toMatchObject({
      source_id: matching.id,
      collection_id: matching.collection_id,
      text: matching.content,
      kind: 'text',
      href: null,
      updated: matching.updated
    })
    expect(
      result.citations.every(citation => citation.source_id !== unrelated.id)
    ).toBe(true)
    expect(result.answer).toContain('[1] Restart Minecraft')
    expect(result.engine).toBe('lexical')
  })
  it('includes title matches and canonical links even when the document is empty', () => {
    const value = source({
      title: 'Minecraft server',
      kind: 'page',
      content: '',
      href: '/page/00000000-0000-4000-8000-000000000004?workspace=00000000-0000-4000-8000-000000000005'
    })
    expect(retrieveKnowledge([value], 'Minecraft').citations[0]).toMatchObject({
      text: value.title,
      href: value.href,
      kind: 'page'
    })
  })
  it('limits results and uses deterministic content-dependent citation identities', () => {
    const current = source({ content: 'Minecraft '.repeat(1_000) })
    expect(retrieveKnowledge([current], 'Minecraft', 2).citations).toHaveLength(
      2
    )
    const old = retrieveKnowledge([source()], 'Minecraft').citations[0]!
    expect(retrieveKnowledge([source()], 'Minecraft').citations[0]?.id).toBe(
      old.id
    )
    expect(
      retrieveKnowledge(
        [source({ content: 'Minecraft is stopped.' })],
        'Minecraft'
      ).citations[0]?.id
    ).not.toBe(old.id)
  })
  it('rejects oversized or binary imports and explicitly retains an empty collection scope', () => {
    expect(
      knowledgeSourceInput.safeParse({
        kind: 'text',
        collection_id: source().collection_id,
        title: 'Binary',
        content: 'x\0y'
      }).success
    ).toBe(false)
    expect(
      knowledgeSourceInput.safeParse({
        kind: 'text',
        collection_id: source().collection_id,
        title: 'Large',
        content: 'x'.repeat(200_001)
      }).success
    ).toBe(false)
    expect(
      knowledgeSearchInput.parse({ query: 'Minecraft', collection_ids: [] })
    ).toMatchObject({ collection_ids: [], limit: 8 })
    expect(
      knowledgeSearchInput.safeParse({ query: 'Minecraft', limit: 21 }).success
    ).toBe(false)
  })
})
