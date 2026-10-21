// SPDX-License-Identifier: 0BSD
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { serverAliasResolver } from '../resolvers/mod-server-alias-resolver'

let root: string
let plugin: any
function write(file: string, contents: string) {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents)
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(tmpdir(), 'monolith-server-alias-'))
  vi.stubEnv('ROOT_DIR', root)
  write('pnpm-workspace.yaml', 'packages: []')
  write(
    'apps/api/package.json',
    JSON.stringify({
      dependencies: { 'shared-helper': '1', 'mapped-helper': '1' }
    })
  )
  write(
    'node_modules/shared-helper/package.json',
    JSON.stringify({ name: 'shared-helper', main: 'index.js' })
  )
  write('node_modules/shared-helper/index.js', 'module.exports = {}')
  write('node_modules/shared-helper/plugins/clock.js', 'module.exports = {}')
  write('node_modules/shared-helper/subfolder/index.js', 'module.exports = {}')
  write(
    'node_modules/mapped-helper/package.json',
    JSON.stringify({
      name: 'mapped-helper',
      exports: {
        './tool': './internal/implementation.js',
        './*': './internal/*-compiled.js'
      }
    })
  )
  write(
    'node_modules/mapped-helper/internal/implementation.js',
    'module.exports = {}'
  )
  write(
    'node_modules/mapped-helper/internal/worker-compiled.js',
    'module.exports = {}'
  )
  plugin = serverAliasResolver(path.join(root, 'modules/demo/server'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()))
  assert.ok(path.basename(root).startsWith('monolith-server-alias-'))
  fs.rmSync(root, { recursive: true, force: true })
})

describe('server dependency boundaries', () => {
  it.each([
    './local',
    '../local',
    '/absolute/source',
    'C:/absolute/source',
    '\0virtual:probe',
    'virtual:probe',
    '@',
    '@/local',
    '',
    'private-addon-library',
    'https://example.test/code.js'
  ])('keeps %s out of the host dependency list', source => {
    expect(plugin.resolveId(source)).toBeNull()
  })
  it.each([
    'node:fs',
    'node:fs/promises',
    'fs/promises',
    'path',
    '@monolith/server-utils',
    'shared-helper'
  ])('keeps shared dependency %s external', source => {
    expect(plugin.resolveId(source)).toEqual({ id: source, external: true })
  })
  it('honors configured aliases including stateful regular expressions on repeated lookups', () => {
    plugin.configResolved({
      resolve: {
        alias: [
          { find: /^shared-helper/g, replacement: '/source' },
          { find: '@monolith/server-utils', replacement: '/sdk' }
        ]
      }
    })
    expect(plugin.resolveId('shared-helper/subpath')).toBeNull()
    expect(plugin.resolveId('shared-helper/subpath')).toBeNull()
    expect(plugin.resolveId('@monolith/server-utils')).toBeNull()
  })
  it('resolves file and directory subpaths with suffixes while preserving export maps', () => {
    expect(plugin.resolveId('shared-helper/plugins/clock?raw#one')).toEqual({
      id: 'shared-helper/plugins/clock.js?raw#one',
      external: true
    })
    expect(plugin.resolveId('shared-helper/subfolder')).toEqual({
      id: 'shared-helper/subfolder/index.js',
      external: true
    })
    expect(plugin.resolveId('shared-helper/plugins/clock.js')).toEqual({
      id: 'shared-helper/plugins/clock.js',
      external: true
    })
    expect(plugin.resolveId('mapped-helper/tool')).toEqual({
      id: 'mapped-helper/tool',
      external: true
    })
    expect(plugin.resolveId('mapped-helper/worker?raw#one')).toEqual({
      id: 'mapped-helper/worker?raw#one',
      external: true
    })
  })
  it('lets Node diagnose unavailable shared subpaths at runtime', () => {
    expect(plugin.resolveId('shared-helper/missing')).toEqual({
      id: 'shared-helper/missing',
      external: true
    })
  })
})
