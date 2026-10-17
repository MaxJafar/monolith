import { describe, expect, it } from 'vitest'

import type { ModuleEntry } from '@monolith/configs'

import { ModuleRegistry } from './ModuleRegistry'

const entry = (name: string): ModuleEntry =>
  ({ name, id: name.replace(/^@monolith\//, '') }) as ModuleEntry

describe('ModuleRegistry path resolution', () => {
  it('resolves the module id only at a directory boundary', () => {
    ModuleRegistry.register(
      entry('@monolith/monolith--foo'),
      '/repo/modules/foo'
    )
    ModuleRegistry.register(
      entry('@monolith/monolith--foo-bar'),
      '/repo/modules/foo-bar'
    )

    expect(
      ModuleRegistry.getModuleIdByPath('/repo/modules/foo-bar/server/index.ts')
    ).toBe('monolith--foo-bar')

    expect(
      ModuleRegistry.getModuleIdByPath('/repo/modules/foo/server/index.ts')
    ).toBe('monolith--foo')
  })

  it('returns undefined for paths outside any module', () => {
    expect(
      ModuleRegistry.getModuleIdByPath('/repo/packages/drizzle/src/index.ts')
    ).toBeUndefined()
  })

  it('maps a module id back to its path', () => {
    ModuleRegistry.register(
      entry('@monolith/monolith--bar'),
      '/repo/modules/bar'
    )

    expect(ModuleRegistry.getPath('monolith--bar')).toBe('/repo/modules/bar')
  })
})

describe('ModuleRegistry schema parts', () => {
  it('rejects a package trying to take an existing name with a new identity', () => {
    const original = entry('@monolith/monolith--shop-owner')
    ModuleRegistry.register(original)
    try {
      expect(() =>
        ModuleRegistry.register({ ...original, id: 'monolith--impostor' })
      ).toThrow('identity collision')
      expect(
        ModuleRegistry.entries.find(item => item.name === original.name)?.id
      ).toBe(original.id)
    } finally {
      ModuleRegistry.unregister(original.name)
    }
  })
  it('rejects duplicate storage and route identities without replacing an installed addon', () => {
    const first = {
      ...entry('@monolith/alex--first'),
      remoteId: 'a'.repeat(64)
    }
    ModuleRegistry.register(first)
    try {
      expect(() =>
        ModuleRegistry.register({ ...first, name: '@monolith/alex--second' })
      ).toThrow('identity collision')
      expect(() =>
        ModuleRegistry.register({
          ...entry('@monolith/alex--third'),
          remoteId: first.remoteId
        })
      ).toThrow('identity collision')
      expect(
        ModuleRegistry.entries.find(item => item.name === first.name)
      ).toEqual(first)
    } finally {
      ModuleRegistry.unregister(first.name)
    }
  })

  it('registers and resolves a schema part by the short module id', () => {
    ModuleRegistry.registerSchemaPart('monolith--baz', {
      tables: {},
      relations: () => ({}),
      keyMap: { items: 'baz__items' }
    })

    expect(ModuleRegistry.getModuleKeyMap('monolith--baz')).toEqual({
      items: 'baz__items'
    })
  })

  it('removes the schema part on unregister (keyed by short id)', () => {
    ModuleRegistry.register(
      entry('@monolith/monolith--baz'),
      '/repo/modules/baz'
    )
    ModuleRegistry.registerSchemaPart('monolith--baz', {
      tables: {},
      relations: () => ({}),
      keyMap: { items: 'baz__items' }
    })

    ModuleRegistry.unregister('@monolith/monolith--baz')

    expect(ModuleRegistry.getModuleKeyMap('monolith--baz')).toBeUndefined()
  })
})
