import { createHash } from 'node:crypto'
import { z } from 'zod'

import { serviceJSON } from '../../core/functions/external/serviceRequest'

export const fontDescriptor = z.object({
  family: z.string(),
  category: z.enum([
    'display',
    'handwriting',
    'monospace',
    'sans-serif',
    'serif'
  ]),
  variants: z.array(z.string()),
  subsets: z.array(z.string()),
  files: z.record(z.string(), z.string()),
  version: z.string(),
  lastModified: z.string(),
  kind: z.literal('webfonts#webfont'),
  menu: z.string(),
  colorCapabilities: z.array(z.enum(['COLRv0', 'COLRv1', 'SVG'])).optional()
})

export const catalogResult = z.object({
  enabled: z.boolean(),
  items: z.array(fontDescriptor)
})

type Catalog = z.infer<typeof catalogResult>
type Entry = { until: number; value: Catalog }

/** Credentials are resolved on every call; revocation cannot hit an old cache entry. */
export function createFontCatalog() {
  const cache = new Map<string, Entry>()
  const pending = new Map<string, Promise<Catalog>>()

  return async (
    credential: string | null | undefined,
    family?: string
  ): Promise<Catalog> => {
    if (!credential) return { enabled: false, items: [] }

    const identity = createHash('sha256').update(credential).digest('hex')
    const cacheKey = JSON.stringify([identity, family ?? null])
    const entry = cache.get(cacheKey)

    if (entry && entry.until > Date.now()) return structuredClone(entry.value)
    cache.delete(cacheKey)
    let request = pending.get(cacheKey)

    if (!request) {
      request = (async () => {
        const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts')
        url.searchParams.set('key', credential)
        if (family) url.searchParams.set('family', family)

        const payload = await serviceJSON(
          'Google Fonts',
          url,
          z.object({ items: z.array(fontDescriptor) })
        )
        const value: Catalog = { enabled: true, items: payload.items }

        if (cache.size >= 32) cache.delete(cache.keys().next().value!)
        cache.set(cacheKey, { value, until: Date.now() + 86_400_000 })

        return value
      })()
      pending.set(cacheKey, request)
    }

    try {
      return structuredClone(await request)
    } finally {
      if (pending.get(cacheKey) === request) pending.delete(cacheKey)
    }
  }
}
