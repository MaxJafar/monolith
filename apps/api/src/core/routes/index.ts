import { ROOT_DIR } from '@constants'
import { registerRoutes } from '@functions/routes/compileRoutes'
import { clientError } from '@functions/routes/utils/response'
import express from 'express'
import path from 'path'

import { coreAddonIds } from '@monolith/configs'
import { createModuleRuntime } from '@monolith/module-runtime/loader'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineRoutes, traceRouteStack } from '@monolith/server-utils'

import { buildAgentCatalog } from '../../lib/integrations/catalog'
import { addonShop } from '../../lib/modules/shop'
import { initDrizzle } from '../drizzle'
import authMiddleware from '../middlewares/authMiddleware'
import coreRoutes from './core.routes'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const router = express.Router()

// Serve module client bundles before the module API routes.
router.use('/modules/:moduleName/*', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  const moduleName = req.params.moduleName

  // Strict whitelist check for moduleName to prevent traversal, spaces, or special characters
  const MODULE_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

  if (!MODULE_NAME_REGEX.test(moduleName)) {
    return next()
  }

  const filePath = req.params[0 as any as keyof typeof req.params] || ''

  // Block null byte injection in filePath
  if (filePath.includes('\0')) {
    return next()
  }

  const current = ModuleRegistry.getPath(moduleName)
  if (!current) return next()
  const moduleDistPath = path.resolve(current, 'client', 'dist')

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  // Public, credential-free bundles also load in the native client's local
  // webview origin. Authenticated API routes keep their existing CORS policy.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.removeHeader('Access-Control-Allow-Credentials')
  if (filePath === 'remoteEntry.js' || filePath === 'monolith-manifest.json')
    res.setHeader('Cache-Control', 'no-store')

  // Serve file securely using the root sandbox parameter
  res.sendFile(filePath, { root: moduleDistPath }, err => {
    // Only fall through when the file could not be sent. Calling next() after a
    // successful response (or a client abort mid-stream) would let later
    // handlers respond again and raise ERR_HTTP_HEADERS_SENT.
    if (err && !res.headersSent) {
      const previous = addonShop.previousDirectory(moduleName)
      if (previous && filePath.startsWith('assets/')) {
        res.sendFile(
          filePath,
          { root: path.join(previous, 'client', 'dist') },
          previousError => {
            if (previousError && !res.headersSent) next()
          }
        )
      } else next()
    }
  })
})

const moduleRuntime = createModuleRuntime({
  modulesDir: path.join(ROOT_DIR, 'modules'),
  additionalDirectories: () => addonShop.directories(),
  hostPackageFile: path.join(ROOT_DIR, 'apps/api/package.json'),
  bundledIds: process.env.MONOLITH_CORE_ONLY === '1' ? coreAddonIds : undefined,
  isProduction: IS_PRODUCTION,
  outerRouter: router,
  buildRouter: appRoutes => {
    initDrizzle()

    return registerRoutes(
      defineRoutes({
        ...coreRoutes,
        modules: defineRoutes({
          ...coreRoutes.modules,
          ...appRoutes
        })
      })
    )
  }
})

// Initial module load + drizzle init.
await moduleRuntime.reload()
addonShop.setReload(() => moduleRuntime.reload())

// Discovery is authenticated; operations still execute through their original
// handlers, including validation, workspace permissions, RLS and observers.
router.get('/integrations/catalog', authMiddleware(false), (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({
    state: 'success',
    data: buildAgentCatalog(traceRouteStack(router.stack))
  })
})

router.get('*', (_, res) => {
  res.set('Cache-Control', 'no-store')

  return clientError({
    res,
    message: 'The requested endpoint does not exist',
    code: 404,
    moduleName: 'core'
  })
})

/** Starts watching the modules directory and reloading on changes. */
export function startModuleWatcher(): void {
  moduleRuntime.watch()
}

export default router
