// SPDX-License-Identifier: 0BSD
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clientAliasResolver } from '../resolvers/client-alias-resolver'

let root: string
function write(file: string) {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, 'export {}')
  return target.replaceAll('\\', '/')
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(tmpdir(), 'monolith-client-alias-'))
})
afterEach(() => {
  assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()))
  assert.ok(path.basename(root).startsWith('monolith-client-alias-'))
  fs.rmSync(root, { recursive: true, force: true })
  vi.restoreAllMocks()
})
describe('client source aliases', () => {
  it.each([
    ['modules/demo/client', '@/component', 'src/component.tsx'],
    ['modules/demo/client', '@/data', 'src/data.json'],
    ['modules/demo/client', '@/folder', 'src/folder/index.ts'],
    ['modules/demo/client', '@/manifest', 'manifest.ts'],
    ['modules/demo/client', '@/manifest.ts', 'manifest.ts'],
    ['apps/web', '@/component', 'src/component.ts'],
    ['packages/ui', '@/component', 'src/component.tsx']
  ])('resolves %s %s through its own module', (directory, alias, file) => {
    const expected = write(directory + '/' + file)
    expect(
      clientAliasResolver(
        alias,
        path.join(root, directory, 'src/nested/entry.tsx')
      )
    ).toBe(expected)
  })

  it('normalizes Vite filesystem prefixes, query suffixes and directory entries', () => {
    const directory = 'modules/demo/client'
    const expected = write(directory + '/src/index.ts')
    const importer = path
      .join(root, directory, 'src/entry.tsx')
      .replaceAll('\\', '/')
    expect(clientAliasResolver('@', '/@fs/' + importer + '?v=one')).toBe(
      expected
    )
    expect(clientAliasResolver('@', importer)).toBe(expected)
  })

  it('leaves unrelated imports alone and rejects aliases escaping their source root', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const importer = path.join(root, 'modules/demo/client/src/entry.ts')
    write('modules/demo/client/outside.ts')
    expect(clientAliasResolver('@/../outside', importer)).toBeNull()
    expect(clientAliasResolver('ordinary-package', importer)).toBeNull()
    expect(clientAliasResolver('@/value', undefined)).toBeNull()
    expect(
      clientAliasResolver('@/value', path.join(root, 'build.ts'))
    ).toBeNull()
    expect(clientAliasResolver('@/missing', importer)).toBeNull()
    expect(log).toHaveBeenCalledOnce()
  })
})
