import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import {
  type ModuleBundledMetadata,
  type ModuleEntry,
  type ModuleWidget,
  moduleBundledMetadataSchema
} from '@monolith/configs'
import { resolveAddonIdentity } from '@monolith/configs/node'

import { loaderLogger } from './logger'

/**
 * Resolves a module's complete metadata from its bundle. In production this is
 * read from the build artifact (`client/dist/monolith-manifest.json`); otherwise
 * it is extracted live from source using the shared extractor.
 *
 * Returns `null` when the metadata cannot be resolved (a module is rejected).
 */
async function resolveBundledMetadata(
  moduleDir: string,
  displayName: string,
  isProduction: boolean
): Promise<ModuleBundledMetadata | null> {
  if (!isProduction) {
    const { extractModuleMetadata } = await import('@monolith/configs/metadata')

    return extractModuleMetadata(moduleDir)
  }

  const bundledPath = path.join(
    moduleDir,
    'client',
    'dist',
    'monolith-manifest.json'
  )

  if (!fs.existsSync(bundledPath)) {
    loaderLogger.error(
      `Skipping module ${displayName}: missing client/dist/monolith-manifest.json. Rebuild or reinstall the module.`
    )

    return null
  }

  try {
    return moduleBundledMetadataSchema.parse(
      JSON.parse(fs.readFileSync(bundledPath, 'utf-8'))
    )
  } catch (error) {
    loaderLogger.error(
      `Skipping module ${displayName}: invalid monolith-manifest.json - ${error}`
    )

    return null
  }
}

/**
 * Reads a module's bundle metadata and file structure to gather its entry
 * (module id, supported languages, widgets, provider info, etc.).
 *
 * @param moduleDir - Absolute path to the module directory.
 * @param isProduction - Whether the server is running in production.
 * @returns Module entry with server route flag, or `null` if the module is invalid.
 */
export default async function gatherModuleMetadata(
  moduleDir: string,
  isProduction: boolean
): Promise<(ModuleEntry & { hasServerRoutes: boolean }) | null> {
  const modDir = path.basename(moduleDir)

  try {
    const bundledMetadata = await resolveBundledMetadata(
      moduleDir,
      modDir,
      isProduction
    )

    if (!bundledMetadata) {
      return null
    }

    const { package: packageJSON } = bundledMetadata

    const { id, remoteId } = resolveAddonIdentity(packageJSON)

    const localesPath = path.join(moduleDir, 'locales')
    const supportedLangs =
      fs.existsSync(localesPath) && fs.statSync(localesPath).isDirectory()
        ? fs
            .readdirSync(localesPath)
            .filter(file => /^[a-z]{2,3}(-[A-Z]{2,3})?\.json$/.test(file))
            .map(file => file.substring(0, file.length - 5))
        : []

    // In production the client federation bundle must be present and valid.
    // (In development, modules are served from source instead.)
    if (isProduction) {
      const clientDistPath = path.join(
        moduleDir,
        'client',
        'dist',
        'remoteEntry.js'
      )

      let isValidDist = false

      if (
        fs.existsSync(clientDistPath) &&
        fs.statSync(clientDistPath).size > 0
      ) {
        try {
          execSync(`node --check "${clientDistPath}"`, { stdio: 'ignore' })
          isValidDist = true
        } catch {
          // syntax/check error
        }
      }

      if (!isValidDist) {
        loaderLogger.error(
          `Skipping module ${packageJSON.displayName}: client/dist/remoteEntry.js is missing or invalid. Rebuild the module.`
        )

        return null
      }
    }

    const widgets: ModuleWidget[] = bundledMetadata.widgets.map(widget => ({
      id: widget.id,
      icon: widget.icon,
      minW: widget.minW,
      minH: widget.minH,
      maxW: widget.maxW,
      maxH: widget.maxH,
      moduleName: packageJSON.name,
      componentName: widget.componentName
    }))

    return {
      id,
      remoteId,
      name: packageJSON.name,
      displayName: packageJSON.displayName,
      version: packageJSON.version,
      description: packageJSON.description,
      author: packageJSON.author,
      icon: packageJSON.monolith.icon,
      category: packageJSON.monolith.category,
      experience: packageJSON.monolith.experience,
      supportedLangs,
      remoteEntryUrl: `/modules/${id}/remoteEntry.js?v=${packageJSON.version}`,
      APIKeyAccess: packageJSON.monolith.APIKeyAccess,
      subsection: bundledMetadata.subsection,
      hasProvider: bundledMetadata.hasProvider,
      hidden: bundledMetadata.hidden,
      widgets,
      hasServerRoutes: bundledMetadata.hasServer
    }
  } catch (error) {
    loaderLogger.error(`Failed to process module ${modDir}: ${error}`)

    return null
  }
}
