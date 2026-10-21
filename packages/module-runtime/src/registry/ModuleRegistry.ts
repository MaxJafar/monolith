// SPDX-License-Identifier: 0BSD
import {
  type Module,
  type ModuleEntry,
  type ModuleManifest,
  type ModuleWidget,
  addonPackageName
} from '@monolith/configs'

import type { ResolvedModuleSchema } from './types'

interface SharedRegistry {
  registeredModules: ModuleEntry[]
  modulePaths: Map<string, string>
  registeredSchemaParts: Map<string, ResolvedModuleSchema>
}
const registryKey = Symbol.for('monolith.module-registry.state')
const globals = globalThis as unknown as Record<
  symbol,
  SharedRegistry | undefined
>
const store = (): SharedRegistry =>
  (globals[registryKey] ??= {
    registeredModules: [],
    modulePaths: new Map(),
    registeredSchemaParts: new Map()
  })
const directory = (value: string) =>
  value.replaceAll('\\', '/').replace(/\/+$/, '')

const manifestKeys = [
  'name',
  'id',
  'remoteId',
  'displayName',
  'experience',
  'icon',
  'category',
  'remoteEntryUrl',
  'APIKeyAccess',
  'hasProvider',
  'hidden',
  'subsection'
] as const
const catalogKeys = [
  'name',
  'id',
  'remoteId',
  'displayName',
  'experience',
  'version',
  'description',
  'author',
  'icon',
  'category'
] as const
function fields<K extends keyof ModuleEntry>(
  entry: ModuleEntry,
  keys: readonly K[]
): Pick<ModuleEntry, K> {
  return Object.fromEntries(keys.map(key => [key, entry[key]])) as Pick<
    ModuleEntry,
    K
  >
}

/** One process-wide registry is shared by source imports and bundled consumers. */
export class ModuleRegistry {
  static register(entry: ModuleEntry, absolutePath?: string): void {
    const state = store()
    for (const installed of state.registeredModules) {
      const sameName = installed.name === entry.name
      const sameId = installed.id === entry.id
      const sameRemote =
        Boolean(entry.remoteId) && installed.remoteId === entry.remoteId
      if ((sameName && !sameId) || (!sameName && (sameId || sameRemote))) {
        throw new Error(
          'Addon identity collision between ' +
            entry.name +
            ' and ' +
            installed.name
        )
      }
    }
    const position = state.registeredModules.findIndex(
      item => item.name === entry.name
    )
    if (position < 0) state.registeredModules.push(entry)
    else state.registeredModules.splice(position, 1, entry)
    if (absolutePath) this.registerPath(absolutePath, entry.id)
  }

  static unregister(name: string): void {
    const state = store()
    const position = state.registeredModules.findIndex(
      item => item.name === name
    )
    if (position < 0) return
    const [removed] = state.registeredModules.splice(position, 1)
    for (const [path, id] of state.modulePaths) {
      if (id === removed.id) state.modulePaths.delete(path)
    }
    state.registeredSchemaParts.delete(removed.id)
  }

  static isRegistered(name: string) {
    return store().registeredModules.some(item => item.name === name)
  }
  static isAvailable(nameOrId: string) {
    const packageName = addonPackageName(nameOrId)
    return store().registeredModules.some(
      item => item.id === nameOrId || item.name === packageName
    )
  }
  static get entries(): ModuleEntry[] {
    return store().registeredModules.slice()
  }
  static get manifests(): ModuleManifest[] {
    return this.entries.map(entry => fields(entry, manifestKeys))
  }
  static get list(): Module[] {
    return this.entries.map(entry => fields(entry, catalogKeys))
  }
  static get widgets(): ModuleWidget[] {
    return this.entries.flatMap(entry => entry.widgets ?? [])
  }

  static registerPath(moduleDir: string, id: string): void {
    store().modulePaths.set(directory(moduleDir), id)
  }
  static getPath(id: string): string | undefined {
    for (const [path, owner] of store().modulePaths)
      if (owner === id) return path
  }
  static getModuleIdByPath(filePath: string): string | undefined {
    const candidate = directory(filePath)
    let longest = -1
    let owner: string | undefined
    for (const [root, id] of store().modulePaths) {
      if (
        root.length > longest &&
        (candidate === root || candidate.startsWith(root + '/'))
      ) {
        longest = root.length
        owner = id
      }
    }
    return owner
  }
  static getModuleByPath(filePath: string): ModuleEntry | undefined {
    const id = this.getModuleIdByPath(filePath)
    return id ? this.entries.find(entry => entry.id === id) : undefined
  }
  static registerSchemaPart(id: string, part: ResolvedModuleSchema): void {
    store().registeredSchemaParts.set(id, part)
  }
  static unregisterSchemaPart(id: string): void {
    store().registeredSchemaParts.delete(id)
  }
  static getModuleKeyMap(id: string): Record<string, string> | undefined {
    return store().registeredSchemaParts.get(id)?.keyMap
  }
  static get schemaParts(): readonly ResolvedModuleSchema[] {
    return Array.from(store().registeredSchemaParts.values())
  }
}
