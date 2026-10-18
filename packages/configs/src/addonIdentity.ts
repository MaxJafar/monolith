import identities from './compatibility/addons.json'

// Explicit route IDs keep saved links stable across package and folder renames.
export const bundledAddonIdentities = identities

export function findAddonIdentity(name: string) {
  return identities.find(
    entry =>
      entry.name === name ||
      entry.id === name ||
      `@monolith/${entry.id}` === name
  )
}

export function addonPackageName(name: string): string {
  return findAddonIdentity(name)?.name ?? name
}

export function addonStorageId(name: string): string {
  return findAddonIdentity(name)?.id ?? name.replace(/^@[^/]+\//, '')
}

/** Every client receives the canonical Monolith package name. */
export function addonWireName(name: string, _currentProtocol = true): string {
  return addonPackageName(name)
}
