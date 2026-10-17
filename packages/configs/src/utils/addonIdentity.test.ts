import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  addonPackageName,
  addonStorageId,
  addonWireName,
  bundledAddonIdentities
} from '../addonIdentity'
import { modulePackageJSONSchema } from '../interfaces/module.types'
import { resolveAddonIdentity } from './addonIdentity'

describe('Monolith addon identities', () => {
  it('uses canonical folders and preserves explicit API route identities', () => {
    for (const entry of bundledAddonIdentities) {
      const pkg = JSON.parse(
        fs.readFileSync(
          path.resolve(
            import.meta.dirname,
            '../../../../modules',
            entry.id,
            'package.json'
          ),
          'utf8'
        )
      )
      expect(modulePackageJSONSchema.safeParse(pkg).success).toBe(true)
      expect(pkg.name).toBe(entry.name)
      expect(resolveAddonIdentity(pkg)).toEqual({
        id: entry.id,
        remoteId: entry.remoteId
      })
      expect(resolveAddonIdentity({ name: entry.name })).toEqual(
        resolveAddonIdentity(pkg)
      )
      expect(addonPackageName(entry.id)).toBe(pkg.name)
      expect(addonStorageId(pkg.name)).toBe(entry.id)
      expect(addonWireName(pkg.name, false)).toBe(pkg.name)
      expect(addonWireName(entry.id, true)).toBe(pkg.name)
    }
  })

  it('gives independent community addons identities without an upstream namespace', () => {
    const pkg = { name: '@monolith/alex--reading' }
    expect(resolveAddonIdentity(pkg)).toEqual({
      id: 'alex--reading',
      remoteId: createHash('sha256').update(pkg.name).digest('hex')
    })
  })

  it('rejects identity drift and unsafe IDs before an addon can register', () => {
    expect(() =>
      resolveAddonIdentity({
        name: '@monolith/calendar',
        monolith: { id: 'other' }
      })
    ).toThrow('persisted identity')
    expect(() =>
      resolveAddonIdentity({
        name: '@monolith/new',
        monolith: { id: '../escape' }
      })
    ).toThrow('storage ID')
    expect(() =>
      resolveAddonIdentity({
        name: '@monolith/new',
        monolith: { routeId: 'bad' }
      })
    ).toThrow('route ID')
  })
})
