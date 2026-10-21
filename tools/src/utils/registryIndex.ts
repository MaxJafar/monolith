// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import { fetchJson, rawRegistryUrl } from './github'

export type RegistryKind = 'modules' | 'locales'
const registryEntry = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][\w-]*$/),
  repo: z.string().regex(/^[\w-]+\/[\w.-]+$/),
  latest: z.string(),
  versions: z.record(z.string(), z.string().regex(/^[a-f\d]{40}$/i))
})
export type RegistryEntry = z.infer<typeof registryEntry>
export async function fetchRegistry(kind: RegistryKind) {
  return z
    .array(registryEntry)
    .parse(await fetchJson(rawRegistryUrl(kind + '.json')))
}
export async function resolveEntry(kind: RegistryKind, id: string) {
  const bare = id.replace(/^@[^/]+\//, '')
  return (await fetchRegistry(kind)).find(
    row => row.id === bare || row.id === 'monolith--' + bare
  )
}
