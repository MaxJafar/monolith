import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

import type { ModuleEntry } from '@monolith/configs'

import { ModuleRegistry } from '../registry/ModuleRegistry'
import { setLoadingModuleId } from '../registry/loadingModule'
import gatherModuleMetadata from './gatherModuleMetadata'
import { loaderLogger } from './logger'
import registerDevResolverHooks from './registerDevResolverHooks'
import { registerManagedResolver } from './registerManagedResolver'

/** Cache of remoteId -> imported server route tree, reused across reloads. */
const routeTrees = new Map<string, ModuleEntry>()
const loadedFiles = new Map<string, string>()
// Node caches imported modules. Retain their schema too so returning to an
// earlier immutable slot restores registrations without re-running its code.
const artifacts = new Map<
  string,
  { routes: ModuleEntry; schema?: (typeof ModuleRegistry.schemaParts)[number] }
>()

let hooksRegistered = false

/**
 * Dynamically loads (and reconciles) module routes.
 * - In production: loads from pre-bundled dist/index.js
 * - In development: loads from TypeScript source (Pnpm runs TS natively)
 *
 * Safe to call repeatedly at runtime: modules already imported are reused,
 * modules whose directory disappeared are unregistered, and newly installed
 * modules are imported.
 */
export async function loadModuleRoutes(options: {
  modulesDir: string
  additionalDirectories?: () => Promise<Record<string, string>>
  hostPackageFile?: string
  bundledIds?: readonly string[]
  isProduction: boolean
}): Promise<Record<string, ModuleEntry>> {
  const { modulesDir, isProduction } = options

  if (!isProduction && !hooksRegistered) {
    registerDevResolverHooks()
    hooksRegistered = true
  }

  if (!fs.existsSync(modulesDir)) {
    for (const entry of ModuleRegistry.entries) {
      ModuleRegistry.unregister(entry.name)
      routeTrees.delete(entry.remoteId)
    }

    loaderLogger.warn('Modules directory not found, no module routes loaded')

    return {}
  }

  const managed = (await options.additionalDirectories?.()) ?? {}
  registerManagedResolver(Object.values(managed), options.hostPackageFile)
  const directories = new Map(
    fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter(
        entry =>
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          (!options.bundledIds || options.bundledIds.includes(entry.name))
      )
      .map(entry => [entry.name, path.join(modulesDir, entry.name)])
  )
  for (const [id, directory] of Object.entries(managed))
    directories.set(id, directory)
  // Drop removed or replaced modules before importing their immutable replacement.
  for (const entry of ModuleRegistry.entries) {
    const moduleDir = ModuleRegistry.getPath(entry.id)

    if (
      !moduleDir ||
      !fs.existsSync(moduleDir) ||
      directories.get(entry.id)?.replace(/\\/g, '/') !== moduleDir
    ) {
      ModuleRegistry.unregister(entry.name)
      routeTrees.delete(entry.remoteId)
      loadedFiles.delete(entry.remoteId)

      loaderLogger.info(
        `Unregistered removed module ${chalk.yellow(entry.displayName)}`
      )
    }
  }

  for (const [modDir, moduleDir] of directories) {
    const managedPackage = managed[modDir] === moduleDir
    const metadata = await gatherModuleMetadata(
      moduleDir,
      isProduction || managedPackage
    )

    if (metadata && managedPackage) metadata.remoteEntryUrl += '&managed=1'

    // Continue if failing to parse metadata
    if (!metadata) {
      continue
    }

    // If module doesn't have server routes (client only module),
    // simply register the entry, no further action needed.
    if (!metadata.hasServerRoutes) {
      const { hasServerRoutes: _, ...entry } = metadata
      ModuleRegistry.register(entry, moduleDir)
      continue
    }

    const distPath = path.join(moduleDir, 'server', 'dist', 'index.js')
    const sourcePath = path.join(moduleDir, 'server', 'index.ts')

    // In production, always load distPath.
    // In development, prefer source path, falling back to dist path if exists.
    const modulePath = (() => {
      if (isProduction || managedPackage) {
        return fs.existsSync(distPath) ? distPath : null
      } else {
        return fs.existsSync(sourcePath)
          ? sourcePath
          : fs.existsSync(distPath)
            ? distPath
            : null
      }
    })()

    if (!modulePath) {
      loaderLogger.warn(
        `Skipping module ${chalk.yellow(metadata.displayName)}: No available server file found.`
      )

      continue
    }

    const { hasServerRoutes: _, ...entry } = metadata
    ModuleRegistry.register(entry, moduleDir)

    // Already imported in a previous load: reuse the cached route tree.
    const fingerprint = `${modulePath}:${fs.statSync(modulePath).mtimeMs}`
    const cached = artifacts.get(fingerprint)
    if (cached) {
      if (cached.schema)
        ModuleRegistry.registerSchemaPart(entry.id, cached.schema)
      routeTrees.set(metadata.remoteId, cached.routes)
      loadedFiles.set(metadata.remoteId, fingerprint)
      continue
    }
    if (
      routeTrees.has(metadata.remoteId) &&
      loadedFiles.get(metadata.remoteId) === fingerprint
    ) {
      continue
    }

    routeTrees.delete(metadata.remoteId)
    try {
      const version = fs.statSync(modulePath).mtimeMs

      // Expose the module id to the code that runs during the import (schema
      // registration, route definitions) so it doesn't need stack parsing.
      setLoadingModuleId(entry.id)

      let mod

      try {
        mod = await import(`${pathToFileURL(modulePath).href}?v=${version}`)
      } finally {
        setLoadingModuleId(undefined)
      }

      if (mod.default) {
        routeTrees.set(metadata.remoteId, mod.default)
        loadedFiles.set(metadata.remoteId, fingerprint)
        artifacts.set(fingerprint, {
          routes: mod.default,
          schema: ModuleRegistry.schemaParts.find(
            part => part.moduleId === entry.id
          )
        })
      } else {
        ModuleRegistry.unregister(entry.name)
        loaderLogger.warn(
          `Skipping module ${chalk.yellow(metadata.displayName)}: The server file has no default export`
        )
      }
    } catch (importError) {
      ModuleRegistry.unregister(metadata.name)
      loaderLogger.warn(
        `Skipping module ${chalk.yellow(metadata.displayName)}: ${importError}`
      )
    }
  }

  loaderLogger.info(
    `Loaded ${chalk.green(Object.keys(ModuleRegistry.entries).length)} module(s): ${chalk.dim(
      Object.values(ModuleRegistry.entries)
        .map(e => e.displayName)
        .sort()
        .join(', ')
    )}`
  )

  return Object.fromEntries(routeTrees)
}
