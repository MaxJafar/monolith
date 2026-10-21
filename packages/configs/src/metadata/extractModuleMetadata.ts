// SPDX-License-Identifier: 0BSD
import { readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

import type { ModuleBundledMetadata } from '../interfaces/bundledMetadata.types'
import { modulePackageJSONSchema } from '../interfaces/module.types'
import parseManifest from './parseManifest'

export default function extractModuleMetadata(
  moduleDir: string
): ModuleBundledMetadata {
  const pkg = modulePackageJSONSchema.parse(
    JSON.parse(readFileSync(join(moduleDir, 'package.json'), 'utf8'))
  )
  const { widgets, ...client } = parseManifest(
    join(moduleDir, 'client', 'manifest.ts')
  )
  let hasServer = false
  try {
    hasServer = statSync(join(moduleDir, 'server')).isDirectory()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return {
    ...client,
    package: pkg,
    hasServer,
    widgets: widgets.map(({ filePath, config }) => ({
      ...config,
      componentName: basename(filePath, extname(filePath))
    }))
  }
}
