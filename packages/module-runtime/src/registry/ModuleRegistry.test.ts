// SPDX-License-Identifier: 0BSD
import { afterEach, describe, expect, it } from 'vitest'

import type { ModuleEntry } from '@monolith/configs'

import { ModuleRegistry } from './ModuleRegistry'

const names = new Set<string>()
function entry(suffix: string): ModuleEntry {
  const name = '@monolith/registry-probe-' + suffix
  names.add(name)
  return {
    name,
    id: 'monolith--registry-probe-' + suffix,
    remoteId: suffix.padEnd(64, '0'),
    displayName: suffix,
    version: '1.0.0',
    description: 'Fixture',
    author: 'Monolith',
    icon: 'lucide:box',
    category: 'Tools',
    supportedLangs: ['en'],
    widgets: [],
    hasProvider: false,
    remoteEntryUrl: '/modules/probe/remoteEntry.js'
  }
}
afterEach(() => {
  for (const name of names) ModuleRegistry.unregister(name)
  names.clear()
})

describe('shared registry ownership', () => {
  it('resolves the most specific path across Windows separators and directory boundaries', () => {
    const parent = entry('parent'),
      nested = entry('nested'),
      sibling = entry('sibling')
    ModuleRegistry.register(parent, 'C:\\workspace\\modules\\probe\\')
    ModuleRegistry.register(nested, 'C:/workspace/modules/probe/child')
    ModuleRegistry.register(sibling, 'C:/workspace/modules/probe-two')
    expect(
      ModuleRegistry.getModuleIdByPath(
        'C:\\workspace\\modules\\probe\\child\\server.ts'
      )
    ).toBe(nested.id)
    expect(
      ModuleRegistry.getModuleByPath('C:/workspace/modules/probe-two/server.ts')
        ?.name
    ).toBe(sibling.name)
    expect(
      ModuleRegistry.getModuleIdByPath(
        'C:/workspace/modules/probe-unknown/server.ts'
      )
    ).toBeUndefined()
    expect(ModuleRegistry.getPath(parent.id)).toBe('C:/workspace/modules/probe')
  })

  it.each(['name', 'id', 'remoteId'] as const)(
    'rejects conflicting %s before modifying existing registrations',
    field => {
      const original = entry('installed'),
        conflicting = entry('conflict')
      ModuleRegistry.register(original)
      conflicting[field] = original[field]
      expect(() => ModuleRegistry.register(conflicting)).toThrow(
        'identity collision'
      )
      expect(
        ModuleRegistry.entries.find(item => item.name === original.name)
      ).toEqual(original)
      expect(
        ModuleRegistry.entries.filter(item => names.has(item.name))
      ).toHaveLength(1)
    }
  )

  it('returns detached lists and only exposes declared catalog fields', () => {
    const original = entry('catalog')
    ModuleRegistry.register(original)
    ModuleRegistry.entries.length = 0
    expect(ModuleRegistry.isRegistered(original.name)).toBe(true)
    expect(ModuleRegistry.isAvailable(original.id)).toBe(true)
    expect(
      ModuleRegistry.list.find(item => item.name === original.name)
    ).not.toHaveProperty('remoteEntryUrl')
    expect(
      ModuleRegistry.manifests.find(item => item.name === original.name)
    ).not.toHaveProperty('author')
    ModuleRegistry.register({ ...original, version: '2.0.0' })
    expect(
      ModuleRegistry.list.find(item => item.name === original.name)?.version
    ).toBe('2.0.0')
  })

  it('unregisters paths and schemas together without touching another add-on', () => {
    const first = entry('remove'),
      retained = entry('retained')
    for (const item of [first, retained]) {
      ModuleRegistry.register(item, '/workspace/' + item.id)
      ModuleRegistry.registerSchemaPart(item.id, {
        moduleId: item.id,
        tables: {},
        relations: () => ({}),
        keyMap: { record: item.id + '__record' }
      })
    }
    ModuleRegistry.unregister(first.name)
    expect(ModuleRegistry.getPath(first.id)).toBeUndefined()
    expect(ModuleRegistry.getModuleKeyMap(first.id)).toBeUndefined()
    expect(ModuleRegistry.getModuleKeyMap(retained.id)).toEqual({
      record: retained.id + '__record'
    })
  })
})
