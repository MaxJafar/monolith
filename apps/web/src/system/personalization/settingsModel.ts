// SPDX-License-Identifier: 0BSD
export const accents = [
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
  'brown',
  'grey'
]
export const surfaces = [
  'zillion',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'mauve',
  'olive',
  'mist',
  'taupe'
]
export const blurSteps = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 40,
  '3xl': 64
}
export const defaultFilters = {
  blur: 'none' as const,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  overlayOpacity: 50
}
export function displayToken(value: string) {
  return value === 'zillion'
    ? 'Monolith'
    : value.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
export type CatalogFont = {
  family: string
  category: string
  variants: string[]
  files: Record<string, string>
}
export function browseFonts(
  fonts: CatalogFont[],
  search: string,
  category: string,
  pins: readonly string[]
) {
  const favorites = new Set(pins),
    term = search.trim().toLocaleLowerCase()
  return fonts
    .filter(
      font =>
        (!category || font.category === category) &&
        font.family.toLocaleLowerCase().includes(term)
    )
    .sort(
      (a, b) =>
        Number(favorites.has(b.family)) - Number(favorites.has(a.family)) ||
        a.family.localeCompare(b.family)
    )
}
export function fontPreviewSource(
  files: Record<string, string>
): string | null {
  const raw = files.regular ?? files['400'] ?? Object.values(files)[0]
  if (!raw) return null
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol)
      ? 'url(' + JSON.stringify(url.href) + ')'
      : null
  } catch {
    return null
  }
}
export async function inspectFont(file: File) {
  const { parse } = await import('opentype.js')
  const parsed = parse(await file.arrayBuffer())
  const tables = parsed.names as unknown as Record<string, any>
  const platforms = [
    tables,
    tables.windows,
    tables.macintosh,
    tables.unicode
  ].filter(Boolean)
  const name = (field: string) =>
    platforms
      .map(table => table[field])
      .filter(Boolean)
      .map(
        values =>
          values.en ??
          Object.values(values).find(value => typeof value === 'string')
      )
      .find(value => typeof value === 'string' && value.trim())
  const family = name('fontFamily') ?? name('fullName')
  if (!family)
    throw new Error('This font does not contain a readable family name.')
  const raw = Number(parsed.tables.os2?.usWeightClass)
  return {
    family: String(family),
    weight: Number.isFinite(raw)
      ? Math.min(900, Math.max(100, Math.round(raw / 100) * 100))
      : 400
  }
}
