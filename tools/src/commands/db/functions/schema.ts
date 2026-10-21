// SPDX-License-Identifier: 0BSD
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

import { pushSchemaFiles } from './pushSchema'

export function resolveModuleSchemaFile(directory: string) {
  return (
    ['server/schema.drizzle.ts', 'server/dist/schema.js']
      .map(file => join(directory, file))
      .find(existsSync) ?? null
  )
}
export function collectAllSchemaFiles() {
  const files = new Set<string>()
  const core = join(ROOT_DIR, 'apps/api/src/lib')
  for (const entry of readdirSync(core, { withFileTypes: true })) {
    const file = join(core, entry.name, 'schema.drizzle.ts')
    if (entry.isDirectory() && existsSync(file)) files.add(file)
  }
  const storage = join(
    ROOT_DIR,
    'packages/file-storage/src/server/metadata/schema.drizzle.ts'
  )
  if (existsSync(storage)) files.add(storage)
  const addons = join(ROOT_DIR, 'modules')
  for (const entry of readdirSync(addons, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const file = resolveModuleSchemaFile(join(addons, entry.name))
    if (file) files.add(file)
  }
  return [...files].sort()
}
export async function syncModuleSchema(directory: string) {
  const file = resolveModuleSchemaFile(directory)
  if (!file) return
  const { failures } = await pushSchemaFiles([file])
  if (failures.length) throw Error(failures.join('\n'))
}
