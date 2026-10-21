// SPDX-License-Identifier: 0BSD
import { execFileSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'

import {
  type ModuleBundledMetadata,
  type ModuleEntry,
  moduleBundledMetadataSchema
} from '@monolith/configs'
import { resolveAddonIdentity } from '@monolith/configs/node'

import { loaderLogger } from './logger'

async function metadataAt(
  root: string,
  production: boolean
): Promise<ModuleBundledMetadata> {
  if (!production) {
    const { extractModuleMetadata } = await import('@monolith/configs/metadata')
    return extractModuleMetadata(root)
  }
  const manifest = await readFile(
    join(root, 'client/dist/monolith-manifest.json'),
    'utf8'
  )
  const metadata = moduleBundledMetadataSchema.parse(JSON.parse(manifest))
  const entry = join(root, 'client/dist/remoteEntry.js')
  if (!(await stat(entry)).size) throw new Error('The client entry is empty')
  // Argument-array execution keeps module paths out of shell interpretation.
  execFileSync(process.execPath, ['--check', entry], {
    stdio: 'pipe',
    timeout: 15000
  })
  return metadata
}

async function languagesAt(root: string) {
  try {
    const files = await readdir(join(root, 'locales'), { withFileTypes: true })
    return files
      .filter(
        file =>
          file.isFile() && /^[a-z]{2,3}(?:-[A-Z]{2,3})?\.json$/.test(file.name)
      )
      .map(file => file.name.slice(0, -5))
      .sort()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export default async function gatherModuleMetadata(
  moduleDir: string,
  isProduction: boolean
): Promise<(ModuleEntry & { hasServerRoutes: boolean }) | null> {
  try {
    const metadata = await metadataAt(moduleDir, isProduction)
    const pkg = metadata.package
    const identity = resolveAddonIdentity(pkg)
    const info = pkg.monolith
    return {
      ...identity,
      name: pkg.name,
      displayName: pkg.displayName,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      icon: info.icon,
      category: info.category,
      experience: info.experience,
      APIKeyAccess: info.APIKeyAccess,
      supportedLangs: await languagesAt(moduleDir),
      remoteEntryUrl:
        '/modules/' +
        identity.id +
        '/remoteEntry.js?v=' +
        encodeURIComponent(pkg.version),
      subsection: metadata.subsection,
      hasProvider: metadata.hasProvider,
      hidden: metadata.hidden,
      widgets: metadata.widgets.map(widget => ({
        ...widget,
        moduleName: pkg.name
      })),
      hasServerRoutes: metadata.hasServer
    }
  } catch (error) {
    loaderLogger.error(
      'Cannot load add-on metadata for ' + basename(moduleDir),
      { error: String(error) }
    )
    return null
  }
}
