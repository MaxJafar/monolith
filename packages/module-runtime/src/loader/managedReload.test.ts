import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'

import { ModuleRegistry } from '../registry/ModuleRegistry'
import { loadModuleRoutes } from './loadModuleRoutes'

it('restores a cached schema and routes when rolling back an immutable package', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'monolith-managed-'))
  const modulesDir = path.join(root, 'modules'),
    original = path.join(root, 'original'),
    broken = path.join(root, 'broken')
  const id = 'monolith--shop-test',
    name = '@monolith/shop-test'
  const metadata = {
    package: {
      name,
      displayName: 'Shop test',
      version: '1.0.0',
      description: 'Fixture',
      author: 'Monolith',
      monolith: { id, icon: 'lucide:box', category: 'Tools' }
    },
    hasServer: true,
    hasProvider: false,
    widgets: []
  }
  await fs.mkdir(modulesDir)
  for (const directory of [original, broken]) {
    await fs.mkdir(path.join(directory, 'client/dist'), { recursive: true })
    await fs.mkdir(path.join(directory, 'server/dist'), { recursive: true })
    await fs.writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ type: 'module' })
    )
    await fs.writeFile(
      path.join(directory, 'client/dist/monolith-manifest.json'),
      JSON.stringify(metadata)
    )
    await fs.writeFile(
      path.join(directory, 'client/dist/remoteEntry.js'),
      'export const ok = true'
    )
    await fs.writeFile(
      path.join(directory, 'server/dist/index.js'),
      directory === broken
        ? 'throw Error("Broken candidate")'
        : `globalThis[Symbol.for('monolith.module-registry.state')].registeredSchemaParts.set('${id}', { moduleId: '${id}', tables: {}, keyMap: { test: 'kept' }, relations: () => ({}) }); export default { working: true }`
    )
  }
  let selected = original
  const options = {
    modulesDir,
    isProduction: true,
    additionalDirectories: async () => ({ [id]: selected })
  }
  try {
    await loadModuleRoutes(options)
    expect(ModuleRegistry.getModuleKeyMap(id)).toEqual({ test: 'kept' })
    await loadModuleRoutes(options)
    expect(ModuleRegistry.getModuleKeyMap(id)).toEqual({ test: 'kept' })
    selected = broken
    await loadModuleRoutes(options)
    expect(ModuleRegistry.isAvailable(id)).toBe(false)
    selected = original
    const routes = await loadModuleRoutes(options)
    expect(Object.values(routes)).toContainEqual({ working: true })
    expect(ModuleRegistry.getModuleKeyMap(id)).toEqual({ test: 'kept' })
    expect(
      ModuleRegistry.entries.find(entry => entry.id === id)?.remoteEntryUrl
    ).toContain(`/modules/${id}/remoteEntry.js`)
  } finally {
    ModuleRegistry.unregister(name)
    await fs.rm(root, { recursive: true, force: true })
  }
})
