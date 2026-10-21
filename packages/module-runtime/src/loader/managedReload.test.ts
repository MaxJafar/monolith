// SPDX-License-Identifier: 0BSD
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ModuleRegistry } from '../registry/ModuleRegistry'
import { getLoadingModuleId } from '../registry/loadingModule'
import { loadModuleRoutes } from './loadModuleRoutes'

const fixtures: string[] = []
afterEach(async () => {
  for (const entry of ModuleRegistry.entries)
    if (entry.name.startsWith('@monolith/loader-probe'))
      ModuleRegistry.unregister(entry.name)
  for (const root of fixtures.splice(0)) {
    const target = resolve(root)
    assert.equal(dirname(target), resolve(tmpdir()))
    assert.ok(basename(target).startsWith('monolith-loader-probe-'))
    await fs.rm(target, { recursive: true, force: true })
  }
})

async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), 'monolith-loader-probe-'))
  fixtures.push(root)
  return root
}

async function packageAt(
  root: string,
  id: string,
  code: string,
  hasServer = true
) {
  const directory = join(root, id + '-' + (await fs.readdir(root)).length)
  const name = '@monolith/' + id
  const storage = 'monolith--' + id
  const manifest = {
    package: {
      name,
      displayName: id,
      version: '2.0.0',
      description: 'Loader test fixture',
      author: 'Monolith',
      monolith: { id: storage, icon: 'lucide:box', category: 'Tools' }
    },
    hasServer,
    hasProvider: false,
    widgets: []
  }
  await fs.mkdir(join(directory, 'client/dist'), { recursive: true })
  await fs.mkdir(join(directory, 'server/dist'), { recursive: true })
  await fs.writeFile(join(directory, 'package.json'), '{"type":"module"}')
  await fs.writeFile(
    join(directory, 'client/dist/remoteEntry.js'),
    'export const ready = true'
  )
  const manifestPath = join(directory, 'client/dist/monolith-manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest))
  await fs.writeFile(join(directory, 'server/dist/index.js'), code)
  return { directory, storage, name, manifest, manifestPath }
}

const schemaAndRoutes = (id: string) => `
const owner = globalThis[Symbol.for('monolith.module-runtime.loading-module')];
await new Promise(resolve => setTimeout(resolve, 10));
if (owner !== globalThis[Symbol.for('monolith.module-runtime.loading-module')]) throw Error('Owner changed during import');
globalThis[Symbol.for('monolith.module-registry.state')].registeredSchemaParts.set(owner, {
  moduleId: owner, tables: {}, relations: () => ({}), keyMap: { records: 'persistent__records' }
});
export default { owner, marker: ${JSON.stringify(id)} };`

describe('add-on package activation', () => {
  it('rolls back to the cached package with its table mapping intact', async () => {
    const root = await fixture()
    const good = await packageAt(
      root,
      'loader-probe-rollback',
      schemaAndRoutes('working')
    )
    const bad = await packageAt(
      root,
      'loader-probe-rollback',
      "throw new Error('Rejected package')"
    )
    let selected = good
    const options = {
      modulesDir: join(root, 'absent'),
      isProduction: true,
      additionalDirectories: async () => ({
        [good.storage]: selected.directory
      })
    }
    const initial = await loadModuleRoutes(options)
    expect(Object.values(initial)).toContainEqual({
      owner: good.storage,
      marker: 'working'
    })
    expect(ModuleRegistry.getModuleKeyMap(good.storage)).toEqual({
      records: 'persistent__records'
    })
    selected = bad
    expect(await loadModuleRoutes(options)).toEqual({})
    expect(ModuleRegistry.isRegistered(good.name)).toBe(false)
    selected = good
    expect(await loadModuleRoutes(options)).toEqual(initial)
    expect(ModuleRegistry.getModuleKeyMap(good.storage)).toEqual({
      records: 'persistent__records'
    })
    expect(
      ModuleRegistry.manifests.find(item => item.name === good.name)
        ?.remoteEntryUrl
    ).toContain('&managed=1')
    expect(getLoadingModuleId()).toBeUndefined()
  })

  it('removes stale routes when a manifest is invalidated in place', async () => {
    const root = await fixture()
    const pkg = await packageAt(
      root,
      'loader-probe-invalid',
      schemaAndRoutes('valid')
    )
    const options = {
      modulesDir: join(root, 'bundled'),
      isProduction: true,
      additionalDirectories: async () => ({ [pkg.storage]: pkg.directory })
    }
    expect(Object.keys(await loadModuleRoutes(options))).toHaveLength(1)
    await fs.writeFile(pkg.manifestPath, '{invalid')
    expect(await loadModuleRoutes(options)).toEqual({})
    expect(ModuleRegistry.isRegistered(pkg.name)).toBe(false)
    expect(ModuleRegistry.getModuleKeyMap(pkg.storage)).toBeUndefined()
  })

  it('activates client-only packages without retaining an earlier server schema', async () => {
    const root = await fixture()
    const pkg = await packageAt(
      root,
      'loader-probe-client',
      schemaAndRoutes('server')
    )
    const options = {
      modulesDir: join(root, 'bundled'),
      isProduction: true,
      additionalDirectories: async () => ({ [pkg.storage]: pkg.directory })
    }
    await loadModuleRoutes(options)
    await fs.writeFile(
      pkg.manifestPath,
      JSON.stringify({ ...pkg.manifest, hasServer: false })
    )
    expect(await loadModuleRoutes(options)).toEqual({})
    expect(ModuleRegistry.isAvailable(pkg.storage)).toBe(true)
    expect(ModuleRegistry.getModuleKeyMap(pkg.storage)).toBeUndefined()
  })

  it('serializes simultaneous scans and imports changed bytes even if the timestamp is unchanged', async () => {
    const root = await fixture()
    const a = await packageAt(
      root,
      'loader-probe-first',
      schemaAndRoutes('first')
    )
    const b = await packageAt(
      root,
      'loader-probe-second',
      schemaAndRoutes('second')
    )
    const options = {
      modulesDir: join(root, 'bundled'),
      isProduction: true,
      additionalDirectories: async () => ({
        [a.storage]: a.directory,
        [b.storage]: b.directory
      })
    }
    const results = await Promise.all([
      loadModuleRoutes(options),
      loadModuleRoutes(options)
    ])
    expect(results[0]).toEqual(results[1])
    expect(Object.values(results[0])).toEqual(
      expect.arrayContaining([
        { owner: a.storage, marker: 'first' },
        { owner: b.storage, marker: 'second' }
      ])
    )
    const entry = join(a.directory, 'server/dist/index.js')
    const before = await fs.stat(entry)
    await fs.writeFile(entry, schemaAndRoutes('revised'))
    await fs.utimes(entry, before.atime, before.mtime)
    expect(Object.values(await loadModuleRoutes(options))).toContainEqual({
      owner: a.storage,
      marker: 'revised'
    })
    expect(getLoadingModuleId()).toBeUndefined()
  })
})
