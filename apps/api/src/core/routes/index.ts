// SPDX-License-Identifier: 0BSD
import { ROOT_DIR } from '@constants'
import { registerRoutes } from '@functions/routes/compileRoutes'
import { clientError } from '@functions/routes/utils/response'
import { Router } from 'express'
import { join } from 'node:path'

import { coreAddonIds } from '@monolith/configs'
import { createModuleRuntime } from '@monolith/module-runtime/loader'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineRoutes, traceRouteStack } from '@monolith/server-utils'

import { buildAgentCatalog } from '../../lib/integrations/catalog'
import { addonShop } from '../../lib/modules/shop'
import { initDrizzle } from '../drizzle'
import authMiddleware from '../middlewares/authMiddleware'
import { addonAssets } from './addonAssets'
import coreRoutes from './core.routes'

const api = Router()
api.use(
  '/modules/:moduleName/*',
  addonAssets(
    id => ModuleRegistry.getPath(id),
    id => addonShop.previousDirectory(id)
  )
)
const runtime = createModuleRuntime({
  outerRouter: api,
  modulesDir: join(ROOT_DIR, 'modules'),
  hostPackageFile: join(ROOT_DIR, 'apps/api/package.json'),
  isProduction: process.env.NODE_ENV === 'production',
  bundledIds: process.env.MONOLITH_CORE_ONLY === '1' ? coreAddonIds : undefined,
  additionalDirectories: () => addonShop.directories(),
  buildRouter(addons) {
    initDrizzle()
    const modules = defineRoutes({ ...coreRoutes.modules, ...addons })
    return registerRoutes(defineRoutes({ ...coreRoutes, modules }))
  }
})
const reload = () => runtime.reload()
await reload()
addonShop.setReload(reload)
api.get(
  '/integrations/catalog',
  authMiddleware(false),
  (_request, response) => {
    const catalog = buildAgentCatalog(traceRouteStack(api.stack))
    response
      .set('Cache-Control', 'no-store')
      .json({ state: 'success', data: catalog })
  }
)
api.get('*', (_request, response) => {
  response.set('Cache-Control', 'no-store')
  return clientError({
    res: response,
    moduleName: 'core',
    code: 404,
    message: 'The requested endpoint does not exist'
  })
})
export const startModuleWatcher = () => runtime.watch()
export default api
