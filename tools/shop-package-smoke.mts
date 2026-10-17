import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { coreAddonIds } from '@monolith/configs'

import { AddonShop } from '../apps/api/src/lib/modules/shop/service'

// Real release artifact, real module loader; only the network transport is local.
const root = process.cwd(),
  require = createRequire(path.join(root, 'apps/api/package.json'))
const { createModuleRuntime } = await import(
  pathToFileURL(require.resolve('@monolith/module-runtime/loader')).href
)
const { ModuleRegistry } = await import(
  pathToFileURL(require.resolve('@monolith/module-runtime/registry')).href
)
const express = require('express')
process.env.NODE_ENV = 'production'
const directory = await fs.mkdtemp(path.join(root, '.temp/shop-package-'))
const hostVersion = JSON.parse(
  await fs.readFile('package.json', 'utf8')
).version
const catalogFile = path.join(
  root,
  'dist/releases',
  process.env.MONOLITH_RELEASE_TAG || `v${hostVersion}`,
  'addon-catalog.json'
)
const shop = new AddonShop({
  root: directory,
  hostVersion,
  catalogFile,
  download: async (url, _limit, progress) => {
    const bytes = await fs.readFile(
      path.join(
        path.dirname(catalogFile),
        new URL(url).pathname.split('/').at(-1)!
      )
    )
    progress?.(bytes.length)
    return bytes
  }
})
const runtime = createModuleRuntime({
  modulesDir: path.join(root, 'modules'),
  bundledIds: coreAddonIds,
  hostPackageFile: path.join(root, 'apps/api/package.json'),
  additionalDirectories: () => shop.directories(),
  isProduction: true,
  outerRouter: express.Router(),
  buildRouter: () => express.Router()
})
try {
  await runtime.reload()
  shop.setReload(() => runtime.reload())
  if (ModuleRegistry.isAvailable('monolith--atlas'))
    throw Error('Atlas was incorrectly loaded as a core module')
  await shop.start('monolith--atlas')
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    const job = (await shop.snapshot()).jobs[0]!
    if (job.phase === 'failed') throw Error(job.error)
    if (job.phase === 'complete') {
      if (!ModuleRegistry.isAvailable('monolith--atlas'))
        throw Error('Atlas is missing after activation')
      await runtime.reload()
      if (!ModuleRegistry.isAvailable('monolith--atlas'))
        throw Error('Atlas disappeared after reload')
      console.info(
        'Real Atlas package verified, extracted, activated and reloaded from isolated managed storage. Core-only startup omitted Atlas.'
      )
      break
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  if ((await shop.snapshot()).jobs[0]?.phase !== 'complete')
    throw Error('Activation timed out')
} finally {
  runtime.dispose()
  if (
    path.dirname(directory) !== path.join(root, '.temp') ||
    !path.basename(directory).startsWith('shop-package-')
  )
    throw Error('Invalid fixture path')
  await fs.rm(directory, { recursive: true, force: true })
}
