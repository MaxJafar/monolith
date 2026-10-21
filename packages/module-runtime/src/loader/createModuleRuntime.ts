// SPDX-License-Identifier: 0BSD
import { Router } from 'express'

import type { ModuleEntry } from '@monolith/configs'

import {
  type ModuleLoaderOptions,
  createModuleLoader
} from './createModuleLoader'

export interface ModuleRuntimeOptions extends ModuleLoaderOptions {
  outerRouter: Router
  buildRouter: (routes: Record<string, ModuleEntry>) => Router
}

export function createModuleRuntime({
  outerRouter,
  buildRouter,
  ...options
}: ModuleRuntimeOptions) {
  const loader = createModuleLoader(options)
  const placeholder = Router()
  outerRouter.use('/', placeholder)
  const mount = outerRouter.stack.find(layer => layer.handle === placeholder)
  let pending: Promise<void> | undefined
  let disposed = false

  const reload = (): Promise<void> => {
    if (disposed) return Promise.resolve()
    if (!pending) {
      pending = loader
        .load()
        .then(routes => {
          if (disposed) return
          const replacement = buildRouter(routes)
          if (!mount || !outerRouter.stack.includes(mount))
            throw new Error('The add-on router mount was removed')
          // Build first; a failed build must leave the previous router serving.
          mount.handle = replacement
        })
        .finally(() => {
          pending = undefined
        })
    }
    return pending
  }
  return {
    reload,
    watch() {
      if (!disposed) loader.watch(reload)
    },
    dispose() {
      disposed = true
      loader.dispose()
    }
  }
}
export type ModuleRuntime = ReturnType<typeof createModuleRuntime>
