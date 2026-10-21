// SPDX-License-Identifier: 0BSD
import { beforeEach, describe, expect, it, vi } from 'vitest'

import defineAddon from '../api/defineAddon'
import type { FederatedModule } from '../utils/fetchModuleData'
import { sortRoutes } from '../utils/sortRoutes'
import { bootstrapModules } from './bootstrapModules'
import { configureBundledModules } from './bundledModules'
import {
  loadRemoteModuleConfig,
  registeredRemotesSet
} from './loadRemoteModuleConfig'
import { resolveRemoteEntry } from './remoteEntry'

const mocks = vi.hoisted(() => ({
  native: null as null | { profile: { origin: string } },
  running: false,
  init: vi.fn(),
  register: vi.fn(),
  load: vi.fn(),
  manifest: vi.fn(),
  categories: vi.fn(),
  registrations: new WeakMap<object, unknown>(),
  apiHost: 'https://workspace.example/api'
}))
vi.mock('@module-federation/runtime', () => ({
  getInstance: () => (mocks.running ? {} : null),
  init: mocks.init,
  registerRemotes: mocks.register,
  loadRemote: mocks.load
}))
vi.mock('@monolith/api', () => ({
  getNativeRuntime: () => mocks.native,
  globalProxyRegistry: {
    get apiHost() {
      return mocks.apiHost
    },
    set: (contract: object, route: unknown) =>
      mocks.registrations.set(contract, route)
  },
  contract: {},
  createApiClient: () => ({
    modules: {
      manifest: { setHost: () => ({ query: mocks.manifest }) },
      categories: { list: { setHost: () => ({ query: mocks.categories }) } }
    }
  })
}))

const manifest = (id: string): FederatedModule => ({
  name: '@monolith/' + id,
  id: 'monolith--' + id,
  remoteId: id,
  displayName: id,
  icon: 'lucide:box',
  category: 'Tools',
  hasProvider: false,
  remoteEntryUrl: '/modules/monolith--' + id + '/remoteEntry.js?v=1'
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.running = false
  mocks.native = null
  mocks.apiHost = 'https://workspace.example/api'
  mocks.init.mockImplementation(() => {
    mocks.running = true
  })
  mocks.load.mockResolvedValue({ default: { routes: {} } })
  mocks.manifest.mockResolvedValue({ modules: [] })
  mocks.categories.mockResolvedValue({})
  registeredRemotesSet.clear()
  configureBundledModules({})
})

describe('trusted add-on entries', () => {
  it('uses the selected web host and the HTTPS native connection', () => {
    const entry =
      '/modules/monolith--probe/remoteEntry.js?v=2.0.0%2Bnext&managed=1'
    expect(resolveRemoteEntry(entry)).toBe(
      'https://workspace.example/api' + entry
    )
    expect(resolveRemoteEntry(entry, '/api/')).toBe('/api' + entry)
    mocks.native = { profile: { origin: 'https://native.example' } }
    expect(resolveRemoteEntry(entry, 'https://ignored.example')).toBe(
      'https://native.example/api' + entry
    )
    mocks.native.profile.origin = 'http://native.example'
    expect(() => resolveRemoteEntry(entry)).toThrow('HTTPS')
  })
  it.each([
    'https://foreign.example/remoteEntry.js',
    '//foreign.example/remoteEntry.js',
    '/modules/probe/../remoteEntry.js',
    '/modules/probe/remoteEntry.js#fragment',
    '/modules/probe/remoteEntry.js?redirect=https://foreign.example'
  ])('rejects executable entry %s', entry => {
    expect(() => resolveRemoteEntry(entry)).toThrow('Invalid addon entry')
  })
})

describe('manifest activation', () => {
  it('loads bundled modules and registers their exact contract identity', async () => {
    const module = manifest('bundled-probe'),
      contract = { endpoint: {} }
    const config = { routes: {}, contract }
    configureBundledModules({
      [module.name]: async () => ({ default: config })
    })
    const result = await loadRemoteModuleConfig(module)
    expect(result.contract).toBe(contract)
    expect(mocks.registrations.get(contract)).toEqual({
      remoteId: module.remoteId
    })
    expect(mocks.load).not.toHaveBeenCalled()
    expect(defineAddon({ routes: {} }).workspaceAPI).toBeUndefined()
  })

  it('retries failed remote loads and invalidates a previous version registration', async () => {
    const module = manifest('version-probe')
    mocks.load.mockResolvedValueOnce(null)
    await expect(loadRemoteModuleConfig(module)).rejects.toThrow(
      'could not be loaded'
    )
    await expect(loadRemoteModuleConfig(module)).resolves.toMatchObject({
      name: module.name,
      routes: {}
    })
    expect(mocks.init).toHaveBeenCalledOnce()
    await loadRemoteModuleConfig({
      ...module,
      remoteEntryUrl: module.remoteEntryUrl.replace('v=1', 'v=2')
    })
    expect(mocks.register).toHaveBeenLastCalledWith(
      [expect.objectContaining({ entry: expect.stringContaining('v=2') })],
      { force: true }
    )
  })

  it('validates before adding a contract to the proxy registry', async () => {
    const contract = {}
    mocks.load.mockResolvedValue({ default: { routes: 'invalid', contract } })
    await expect(
      loadRemoteModuleConfig(manifest('invalid-probe'))
    ).rejects.toThrow('Invalid add-on configuration')
    expect(mocks.registrations.get(contract)).toBeUndefined()
  })

  it('uses development source but keeps managed packages on their installed version', async () => {
    const module = manifest('source-probe')
    const load = vi
      .fn()
      .mockResolvedValue({ default: { routes: {}, hidden: true } })
    const imports = { '/modules/source/client/manifest.ts': load }
    const packages = { '/modules/source/package.json': { name: module.name } }
    expect(
      await loadRemoteModuleConfig(module, imports, packages)
    ).toMatchObject({ hidden: true })
    await loadRemoteModuleConfig(
      { ...module, remoteEntryUrl: module.remoteEntryUrl + '&managed=1' },
      imports,
      packages
    )
    expect(load).toHaveBeenCalledOnce()
    expect(mocks.load).toHaveBeenCalledOnce()
  })

  it('builds ordered groups without mutating the source route list', async () => {
    const module = manifest('boot-probe')
    mocks.manifest.mockResolvedValue({ modules: [module] })
    mocks.categories.mockResolvedValue({ tools: { en: 'Tools' } })
    const provider = () => null
    const core = {
      name: 'system',
      category: '<START>',
      icon: 'lucide:box',
      routes: {},
      provider
    }
    const result = await bootstrapModules('https://selected.example/api', [
      core
    ])
    expect(result.moduleGroups.map(group => group.title)).toEqual(['', 'Tools'])
    expect(result.globalProviders).toEqual([provider])
    expect(mocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        remotes: [
          expect.objectContaining({
            entry: 'https://selected.example/api' + module.remoteEntryUrl
          })
        ]
      })
    )
    const source = [
      { title: 'Settings', items: [] },
      { title: '<START>', items: [] },
      { title: 'Tools', items: [] }
    ]
    expect(sortRoutes(source, {}).map(group => group.title)).toEqual([
      '',
      'Tools',
      'Settings'
    ])
    expect(source.map(group => group.title)).toEqual([
      'Settings',
      '<START>',
      'Tools'
    ])
  })
})
