import z from 'zod'

export const knowledgeLimits = {
  collections: 100,
  sources: 500,
  characters: 200_000,
  retrievalCharacters: 8_000_000,
  results: 20,
  chunkSize: 1_000,
  chunkOverlap: 120
} as const

export const knowledgeCollectionInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).default('')
})

export const knowledgeSourceInput = z.discriminatedUnion('kind', [
  z.object({
    collection_id: z.uuid(),
    kind: z.literal('page'),
    source_id: z.uuid()
  }),
  z.object({
    collection_id: z.uuid(),
    kind: z.literal('record'),
    source_id: z.uuid()
  }),
  z.object({
    collection_id: z.uuid(),
    kind: z.literal('text'),
    title: z.string().trim().min(1).max(255),
    content: z
      .string()
      .trim()
      .min(1)
      .max(knowledgeLimits.characters)
      .refine(
        value => !value.includes('\0'),
        'Binary content is not supported'
      ),
    media_type: z.enum(['text/plain', 'text/markdown']).default('text/plain')
  })
])

/** Omitted collection_ids searches all; an explicit empty array searches none. */
export const knowledgeSearchInput = z.object({
  query: z.string().trim().min(1).max(1_000),
  collection_ids: z.array(z.uuid()).max(knowledgeLimits.collections).optional(),
  limit: z.number().int().min(1).max(knowledgeLimits.results).default(8)
})

export const knowledgeCollectionDto = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  source_count: z.number().int(),
  updated: z.string()
})

export const knowledgeSourceDto = z.object({
  id: z.uuid(),
  collection_id: z.uuid(),
  kind: z.enum(['page', 'record', 'text']),
  title: z.string(),
  source_id: z.uuid().nullable(),
  media_type: z.enum(['text/plain', 'text/markdown']).nullable(),
  characters: z.number().int(),
  chunks: z.number().int(),
  updated: z.string(),
  href: z.string().nullable()
})

export const knowledgeCatalogDto = z.object({
  kind: z.enum(['page', 'record']),
  id: z.uuid(),
  title: z.string(),
  href: z.string()
})

export const knowledgeLibraryDto = z.object({
  collections: z.array(knowledgeCollectionDto),
  sources: z.array(knowledgeSourceDto),
  catalog: z.array(knowledgeCatalogDto),
  catalog_truncated: z.boolean(),
  role: z.enum(['owner', 'editor', 'viewer']),
  engine: z.literal('lexical')
})

export const knowledgeCitationDto = z.object({
  id: z.string(),
  source_id: z.uuid(),
  collection_id: z.uuid(),
  title: z.string(),
  kind: z.enum(['page', 'record', 'text']),
  href: z.string().nullable(),
  chunk_index: z.number().int(),
  text: z.string(),
  score: z.number(),
  updated: z.string()
})

export const knowledgeSearchDto = z.object({
  query: z.string(),
  engine: z.literal('lexical'),
  answer: z.string(),
  citations: z.array(knowledgeCitationDto),
  searched_sources: z.number().int(),
  total_chunks: z.number().int()
})

export type KnowledgeLibrary = z.infer<typeof knowledgeLibraryDto>

export type KnowledgeCitation = z.infer<typeof knowledgeCitationDto>

export type KnowledgeSearch = z.infer<typeof knowledgeSearchDto>

export type KnowledgeSourceInput = z.infer<typeof knowledgeSourceInput>
