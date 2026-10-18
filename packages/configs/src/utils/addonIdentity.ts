import { createHash } from 'node:crypto'

import { addonStorageId, findAddonIdentity } from '../addonIdentity'

export interface AddonIdentitySource {
  name: string
  monolith?: { id?: string; routeId?: string }
}

/** One identity contract shared by the server loader, bundler and CLI. */
export function resolveAddonIdentity(pkg: AddonIdentitySource) {
  const existing = findAddonIdentity(pkg.name)
  const id = pkg.monolith?.id ?? addonStorageId(pkg.name)
  const remoteId =
    pkg.monolith?.routeId ??
    existing?.remoteId ??
    createHash('sha256').update(pkg.name).digest('hex')

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id))
    throw new Error(`Invalid addon storage ID: ${id}`)
  if (!/^[a-f0-9]{64}$/.test(remoteId))
    throw new Error(`Invalid addon route ID for ${pkg.name}`)
  if (existing && (id !== existing.id || remoteId !== existing.remoteId))
    throw new Error(`Cannot change the persisted identity of ${pkg.name}`)

  return { id, remoteId }
}
