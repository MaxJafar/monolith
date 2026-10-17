export type AddonFilter = {
  search: string
  status: 'all' | 'enabled' | 'available'
  category: string
  kind: string
}
export function addonSlug(name: string) {
  return (
    name
      .replace(/^@[^/]+\//, '')
      .split('--')
      .pop() ?? name
  )
}
export function filterAddons<
  T extends {
    title: string
    description: string
    category: string
    kind: string
    enabled: boolean
  }
>(addons: T[], filter: AddonFilter): T[] {
  const terms = filter.search
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  return addons
    .filter(
      addon =>
        (filter.status === 'all' ||
          addon.enabled === (filter.status === 'enabled')) &&
        (filter.category === 'all' || addon.category === filter.category) &&
        (filter.kind === 'all' || addon.kind === filter.kind) &&
        terms.every(term =>
          (addon.title + ' ' + addon.description)
            .toLocaleLowerCase()
            .includes(term)
        )
    )
    .sort((a, b) => a.title.localeCompare(b.title))
}
