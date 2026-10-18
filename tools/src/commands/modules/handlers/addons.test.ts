import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAddonHandler } from './createAddonHandler'
import { packAddonHandler } from './packAddonHandler'

const fixture = vi.hoisted(() => ({ root: '' }))
vi.mock('@/utils/constants', () => ({
  get ROOT_DIR() {
    return fixture.root
  }
}))

describe('source-first addons', () => {
  beforeAll(() => {
    fixture.root = fs.mkdtempSync(path.join(os.tmpdir(), 'monolith-addons-'))
    fs.mkdirSync(path.join(fixture.root, 'modules'))
  })
  afterAll(() => {
    if (
      fixture.root &&
      path.dirname(fixture.root) === os.tmpdir() &&
      path.basename(fixture.root).startsWith('monolith-addons-')
    )
      fs.rmSync(fixture.root, { recursive: true, force: true })
  })

  it('creates a localized addon and protects reserved routes and existing source', () => {
    createAddonHandler('tester--reading-list')
    const directory = path.join(fixture.root, 'modules', 'tester--reading-list')
    expect(
      JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
        .name
    ).toBe('@monolith/tester--reading-list')
    for (const language of ['en', 'ms', 'zh-CN', 'zh-TW'])
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(directory, 'locales', language + '.json'),
            'utf8'
          )
        ).welcome
      ).toBeTruthy()
    expect(() => createAddonHandler('tester--calendar')).toThrow(
      'already in use'
    )
    expect(() => createAddonHandler('tester--reading-list')).toThrow(
      'already exists'
    )
    expect(() => createAddonHandler('another--reading-list')).toThrow(
      'already in use'
    )
    expect(() => createAddonHandler('../escape')).toThrow('addon id')
  })

  it('packages portable source while excluding environment, keys and dependencies', () => {
    const directory = path.join(fixture.root, 'modules', 'tester--reading-list')
    fs.writeFileSync(path.join(directory, 'client', '.env'), 'SYNTHETIC=secret')
    fs.writeFileSync(
      path.join(directory, 'client', 'private.pem'),
      'synthetic private key'
    )
    fs.mkdirSync(path.join(directory, 'client', 'node_modules'))
    fs.writeFileSync(
      path.join(directory, 'client', 'node_modules', 'fixture.js'),
      ''
    )
    packAddonHandler('tester--reading-list')
    const archive = path.join(
      fixture.root,
      'dist',
      'addons',
      'tester--reading-list-0.1.0.tar.gz'
    )
    const listing = spawnSync('tar', ['-tzf', archive], {
      encoding: 'utf8',
      windowsHide: true
    })
    expect(listing.status).toBe(0)
    expect(listing.stdout).toContain('client/src/index.tsx')
    expect(listing.stdout).not.toMatch(/\.env|private\.pem|node_modules/)
    expect(() => packAddonHandler('tester--reading-list')).toThrow(
      'already exists'
    )
  })
})
