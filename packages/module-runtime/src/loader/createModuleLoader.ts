// SPDX-License-Identifier: 0BSD
import type { LoadRoutesOptions } from './loadModuleRoutes'
import { loadModuleRoutes } from './loadModuleRoutes'
import { watchModules } from './watchModules'

export interface ModuleLoaderOptions extends LoadRoutesOptions {}

export function createModuleLoader(options: ModuleLoaderOptions) {
  let stop: (() => void) | undefined
  const dispose = () => {
    stop?.()
    stop = undefined
  }
  return {
    load: () => loadModuleRoutes(options),
    watch(onReload: () => void | Promise<void>) {
      dispose()
      stop = watchModules(options.modulesDir, onReload)
    },
    dispose
  }
}
export type ModuleLoader = ReturnType<typeof createModuleLoader>
