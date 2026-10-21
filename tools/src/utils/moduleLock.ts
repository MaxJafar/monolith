// SPDX-License-Identifier: 0BSD
import { join } from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

import { objectFile, replaceJSON } from './jsonFile'

export type LockKind = 'modules' | 'locales'
export interface LockEntry {
  repo: string
  version: string
  commitSha: string
}
function load() {
  const file = join(ROOT_DIR, 'modules-lock.json'),
    value = objectFile(file, () => ({}))
  const result = {
    modules: {} as Record<string, LockEntry>,
    locales: {} as Record<string, LockEntry>
  }
  for (const kind of ['modules', 'locales'] as const) {
    const entries = value[kind] ?? {}
    if (!entries || typeof entries !== 'object' || Array.isArray(entries))
      throw Error('Invalid ' + kind + ' lock data')
    for (const [id, entry] of Object.entries(entries)) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        !['repo', 'version', 'commitSha'].every(
          key => typeof (entry as Record<string, unknown>)[key] === 'string'
        )
      )
        throw Error('Invalid lock entry: ' + id)
    }
    result[kind] = Object.fromEntries(Object.entries(entries)) as Record<
      string,
      LockEntry
    >
  }
  return { file, value, result }
}
export function getLocked(kind: LockKind, id: string): LockEntry | undefined {
  const entries = load().result[kind]
  return Object.hasOwn(entries, id) ? entries[id] : undefined
}
export function setLocked(kind: LockKind, id: string, entry: LockEntry) {
  const { file, value, result } = load()
  replaceJSON(file, {
    ...value,
    ...result,
    [kind]: { ...result[kind], [id]: entry }
  })
}
export function removeLocked(kind: LockKind, id: string) {
  const { file, value, result } = load()
  if (!Object.hasOwn(result[kind], id)) return
  delete result[kind][id]
  replaceJSON(file, { ...value, ...result })
}
export function verifyLocked(
  kind: LockKind,
  id: string,
  version: string,
  commitSha: string
) {
  const saved = getLocked(kind, id)
  if (saved?.version === version && saved.commitSha !== commitSha)
    throw Error(
      'Release integrity mismatch for ' +
        id +
        '@' +
        version +
        ': expected ' +
        saved.commitSha +
        ', received ' +
        commitSha
    )
}
