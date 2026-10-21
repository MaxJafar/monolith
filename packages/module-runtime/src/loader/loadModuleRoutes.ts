// SPDX-License-Identifier: 0BSD
import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { ModuleEntry } from '@monolith/configs'

import { ModuleRegistry } from '../registry/ModuleRegistry'
import {
  getLoadingModuleId,
  setLoadingModuleId
} from '../registry/loadingModule'
import type { ResolvedModuleSchema } from '../registry/types'
import gatherModuleMetadata from './gatherModuleMetadata'
import { loaderLogger } from './logger'
import registerDevResolverHooks from './registerDevResolverHooks'
import { registerManagedResolver } from './registerManagedResolver'

export interface LoadRoutesOptions {
  modulesDir: string
  additionalDirectories?: () => Promise<Record<string, string>>
  hostPackageFile?: string
  bundledIds?: readonly string[]
  isProduction: boolean
}

interface LoadedArtifact {
  routes: ModuleEntry
  schema?: ResolvedModuleSchema
}
const imported = new Map<string, LoadedArtifact>()
let scanQueue: Promise<unknown> = Promise.resolve()
const canonical = (path: string) => resolve(path).replaceAll('\\', '/')

async function candidates(options: LoadRoutesOptions) {
  const directories = new Map<string, { path: string; managed: boolean }>()
  try {
    for (const item of await readdir(options.modulesDir, {
      withFileTypes: true
    })) {
      if (!item.isDirectory() || item.name.startsWith('.')) continue
      if (options.bundledIds && !options.bundledIds.includes(item.name))
        continue
      directories.set(item.name, {
        path: resolve(options.modulesDir, item.name),
        managed: false
      })
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  // Managed packages can exist independently of the bundled modules directory.
  const managed = (await options.additionalDirectories?.()) ?? {}
  registerManagedResolver(Object.values(managed), options.hostPackageFile)
  for (const [id, path] of Object.entries(managed))
    directories.set(id, { path: resolve(path), managed: true })
  return directories
}

async function entryFile(root: string, production: boolean) {
  const paths = production
    ? ['server/dist/index.js']
    : ['server/index.ts', 'server/dist/index.js']
  for (const name of paths) {
    const filename = join(root, name)
    try {
      if ((await stat(filename)).isFile()) return filename
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  throw new Error('No server entry exists for the add-on')
}

async function importRoutes(
  filename: string,
  owner: string
): Promise<LoadedArtifact> {
  const hash = createHash('sha256')
    .update(await readFile(filename))
    .digest('hex')
  const url = pathToFileURL(filename)
  url.searchParams.set('v', hash)
  const key = owner + ':' + url.href
  const cached = imported.get(key)
  if (cached) {
    if (cached.schema) ModuleRegistry.registerSchemaPart(owner, cached.schema)
    return cached
  }
  const previous = getLoadingModuleId()
  setLoadingModuleId(owner)
  try {
    const module = await import(url.href)
    if (!module.default)
      throw new Error('The server entry needs a default route export')
    const artifact = {
      routes: module.default as ModuleEntry,
      schema: ModuleRegistry.schemaParts.find(part => part.moduleId === owner)
    }
    imported.set(key, artifact)
    return artifact
  } finally {
    setLoadingModuleId(previous)
  }
}

async function scan(
  options: LoadRoutesOptions
): Promise<Record<string, ModuleEntry>> {
  if (!options.isProduction) registerDevResolverHooks()
  const discovered: Array<{
    entry: ModuleEntry
    directory: string
    server: boolean
    production: boolean
  }> = []
  for (const candidate of (await candidates(options)).values()) {
    const production = options.isProduction || candidate.managed
    const result = await gatherModuleMetadata(candidate.path, production)
    if (!result) continue
    const { hasServerRoutes, ...entry } = result
    if (candidate.managed) entry.remoteEntryUrl += '&managed=1'
    discovered.push({
      entry,
      directory: candidate.path,
      server: hasServerRoutes,
      production
    })
  }
  for (const installed of ModuleRegistry.entries) {
    const current = discovered.find(
      candidate =>
        candidate.entry.name === installed.name &&
        candidate.entry.id === installed.id
    )
    if (
      !current ||
      canonical(current.directory) !== ModuleRegistry.getPath(installed.id)
    ) {
      ModuleRegistry.unregister(installed.name)
    }
  }
  const routes: Record<string, ModuleEntry> = Object.create(null)
  for (const candidate of discovered) {
    const { entry, directory, server, production } = candidate
    try {
      ModuleRegistry.register(entry, directory)
      // Remove the previous schema before evaluating an updated package.
      ModuleRegistry.unregisterSchemaPart(entry.id)
      if (server) {
        const artifact = await importRoutes(
          await entryFile(directory, production),
          entry.id
        )
        routes[entry.remoteId] = artifact.routes
      }
    } catch (error) {
      // Never unregister somebody else's package on an identity collision.
      const registered = ModuleRegistry.entries.find(
        item => item.name === entry.name
      )
      if (registered === entry) ModuleRegistry.unregister(entry.name)
      loaderLogger.warn('Add-on unavailable: ' + entry.displayName, {
        error: String(error)
      })
    }
  }
  loaderLogger.info('Add-on registry loaded', {
    count: ModuleRegistry.entries.length
  })
  return routes
}

/** Serialize imports because module initialization exposes a shared owner id. */
export function loadModuleRoutes(
  options: LoadRoutesOptions
): Promise<Record<string, ModuleEntry>> {
  const next = scanQueue.then(() => scan(options))
  scanQueue = next.catch(() => undefined)
  return next
}
