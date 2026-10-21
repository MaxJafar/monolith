// SPDX-License-Identifier: 0BSD
import catalogData from '@iconify/collections/collections.json'
import type { IconifyInfo } from '@iconify/types'

export const iconCollections: Record<string, IconifyInfo> = catalogData
export const collectionList = Object.entries(iconCollections).sort((a, b) =>
  a[1].name.localeCompare(b[1].name)
)
export type IconPage = { icons: string[]; more: boolean; next: number }
export type IconRequest = { prefix: string; query: string; start?: number }
const identifier = /^[a-z0-9-]+:[a-z0-9-]+$/
const uniqueIcons = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (icon): icon is string =>
              typeof icon === 'string' && identifier.test(icon)
          )
        )
      ]
    : []

export async function fetchIconPage(
  request: IconRequest,
  signal: AbortSignal
): Promise<IconPage> {
  const query = request.query.trim(),
    start = request.start ?? 0
  if (!query && !request.prefix) {
    return {
      icons: collectionList.flatMap(([prefix, info]) =>
        (info.samples ?? []).slice(0, 3).map(name => prefix + ':' + name)
      ),
      more: false,
      next: 0
    }
  }
  const url = new URL(
    query
      ? 'https://api.iconify.design/search'
      : 'https://api.iconify.design/collection'
  )
  if (request.prefix) url.searchParams.set('prefix', request.prefix)
  if (query) {
    url.searchParams.set('query', query)
    url.searchParams.set('limit', '192')
    url.searchParams.set('start', String(start))
  }
  const response = await fetch(url, { signal })
  if (!response.ok)
    throw new Error('Icon catalog request failed (' + response.status + ')')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object')
    throw new Error('Invalid icon catalog response')
  if (query) {
    if (!('icons' in data) || !Array.isArray(data.icons))
      throw new Error('Invalid icon search response')
    const icons = uniqueIcons(data.icons)
    const limit =
      'limit' in data && typeof data.limit === 'number' && data.limit > 0
        ? data.limit
        : 192
    return {
      icons,
      more: data.icons.length >= limit,
      next: start + data.icons.length
    }
  }
  const collection = data as {
    prefix?: unknown
    uncategorized?: unknown
    categories?: unknown
  }
  if (collection.prefix !== request.prefix)
    throw new Error('Invalid icon collection response')
  const names = [
    ...(Array.isArray(collection.uncategorized)
      ? collection.uncategorized
      : []),
    ...Object.values(
      collection.categories && typeof collection.categories === 'object'
        ? collection.categories
        : {}
    ).flatMap(value => (Array.isArray(value) ? value : []))
  ]
  return {
    icons: uniqueIcons(
      names
        .filter(name => typeof name === 'string')
        .map(name => request.prefix + ':' + name)
    ),
    more: false,
    next: 0
  }
}
export function attributionLink(value: string | undefined): string | undefined {
  if (!value) return
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return
  }
}
