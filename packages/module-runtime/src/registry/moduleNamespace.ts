// SPDX-License-Identifier: 0BSD
import lodash from 'lodash'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addonStorageId } from '@monolith/configs'

import { ModuleRegistry } from './ModuleRegistry'
import { getLoadingModuleId } from './loadingModule'

/** Resolve schema ownership without changing installed table identifiers. */
export function resolveCallerModuleId(
  stack = new Error().stack
): string | undefined {
  const active = getLoadingModuleId()
  if (active) return active
  for (const frame of stack?.split('\n') ?? []) {
    const location =
      /\((.*):\d+:\d+\)$/.exec(frame.trim())?.[1] ??
      /^at\s+(.*):\d+:\d+$/.exec(frame.trim())?.[1]
    if (!location) continue
    let filename: string
    try {
      filename = location.startsWith('file:')
        ? fileURLToPath(location)
        : location
    } catch {
      continue
    }
    filename = filename.replaceAll('\\', '/')
    const registered = ModuleRegistry.getModuleIdByPath(filename)
    if (registered) return registered
    const parts = filename.split('/')
    const index = parts.lastIndexOf('modules')
    if (index < 0 || !parts[index + 1] || parts.length <= index + 2) continue
    try {
      const root = parts.slice(0, index + 2).join('/')
      const manifest = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8')
      )
      if (typeof manifest.monolith?.id === 'string') return manifest.monolith.id
      if (typeof manifest.name === 'string')
        return addonStorageId(manifest.name)
    } catch {
      /* A stack frame outside an installed package is not an owner. */
    }
  }
}

export function deriveModuleNamespace(moduleId: string): string {
  const storage = addonStorageId(moduleId).split('/').at(-1) ?? ''
  const boundary = storage.indexOf('--')
  const author = boundary < 0 ? '' : storage.slice(0, boundary)
  const shortName = lodash.snakeCase(
    boundary < 0 ? storage : storage.slice(boundary + 2)
  )
  return author && author !== 'monolith'
    ? author + '___' + shortName
    : shortName
}
