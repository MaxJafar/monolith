import { type ModuleEntry } from '@monolith/configs'

import { loadModuleRoutes } from './loadModuleRoutes'
import { watchModules } from './watchModules'

export interface ModuleLoaderOptions {
  /** Absolute path to the directory containing module folders. */
  modulesDir: string
  additionalDirectories?: () => Promise<Record<string, string>>
  hostPackageFile?: string
  bundledIds?: readonly string[]
  /** Whether the server is running in production. */
  isProduction: boolean
}

/**
 * Owns the module lifecycle: scanning the modules directory, importing server
 * route trees, keeping `ModuleRegistry` in sync, and watching for changes.
 */
export function createModuleLoader({
  modulesDir,
  additionalDirectories,
  hostPackageFile,
  bundledIds,
  isProduction
}: ModuleLoaderOptions) {
  let disposeWatcher: (() => void) | null = null

  return {
    /**
     * Scans `modulesDir`, reconciles `ModuleRegistry`, imports new module
     * server routes, and returns the full map of module route trees.
     */
    load(): Promise<Record<string, ModuleEntry>> {
      return loadModuleRoutes({
        modulesDir,
        isProduction,
        additionalDirectories,
        bundledIds,
        hostPackageFile
      })
    },

    /** Watches `modulesDir` and invokes `onReload` when it changes. */
    watch(onReload: () => void | Promise<void>): void {
      disposeWatcher?.()
      disposeWatcher = watchModules(modulesDir, onReload)
    },

    /** Stops watching for module changes. */
    dispose(): void {
      disposeWatcher?.()
      disposeWatcher = null
    }
  }
}

export type ModuleLoader = ReturnType<typeof createModuleLoader>
