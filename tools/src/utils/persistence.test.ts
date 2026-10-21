// SPDX-License-Identifier: 0BSD
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import bump, { revertPackageVersion } from './bumpPackageVersion'
import { objectFile, replaceJSON } from './jsonFile'
import { getLocked, removeLocked, setLocked, verifyLocked } from './moduleLock'
import {
  addDependency,
  getDependencies,
  hasDependency,
  readPackageJson,
  removeDependency
} from './packageJson'

const fixture = vi.hoisted(() => ({ root: '' }))
vi.mock('@/utils/constants', () => ({
  get ROOT_DIR() {
    return fixture.root
  }
}))

const pin = {
  repo: 'example/addon',
  version: '1.0.0',
  commitSha: 'a'.repeat(40)
}
beforeEach(() => {
  fixture.root = mkdtempSync(join(tmpdir(), 'monolith-cli-state-'))
})
afterEach(() => {
  if (
    dirname(fixture.root) !== tmpdir() ||
    !basename(fixture.root).startsWith('monolith-cli-state-')
  )
    throw Error('Unexpected fixture path')
  rmSync(fixture.root, { recursive: true, force: true })
})
it('preserves existing lock records, both registries and extra metadata', () => {
  const path = join(fixture.root, 'modules-lock.json')
  writeFileSync(
    path,
    JSON.stringify({
      modules: { one: pin },
      locales: { english: pin },
      schemaVersion: 1
    })
  )
  setLocked('modules', 'two', { ...pin, version: '2.0.0' })
  expect(getLocked('modules', 'one')).toEqual(pin)
  expect(getLocked('locales', 'english')).toEqual(pin)
  removeLocked('modules', 'two')
  expect(getLocked('modules', 'two')).toBeUndefined()
  expect(objectFile(path).schemaVersion).toBe(1)
  expect(readdirSync(fixture.root)).toEqual(['modules-lock.json'])
})
it('rejects moved release pins but permits a new version', () => {
  setLocked('modules', 'one', pin)
  expect(() => verifyLocked('modules', 'one', '1.0.0', 'b'.repeat(40))).toThrow(
    'integrity mismatch'
  )
  expect(() =>
    verifyLocked('modules', 'one', '2.0.0', 'b'.repeat(40))
  ).not.toThrow()
  expect(() =>
    verifyLocked('modules', 'new', '1.0.0', pin.commitSha)
  ).not.toThrow()
})
it('does not interpret prototype properties as lock records or dependencies', () => {
  expect(getLocked('modules', 'constructor')).toBeUndefined()
  setLocked('modules', '__proto__', pin)
  expect(getLocked('modules', '__proto__')).toEqual(pin)
  expect(hasDependency('constructor')).toBe(false)
  addDependency('__proto__', 'modules', '1.0.0')
  expect(getDependencies()).toEqual(JSON.parse('{"__proto__":"1.0.0"}'))
  expect(Object.getPrototypeOf(getDependencies())).toBe(Object.prototype)
})
it('fails on malformed lock data without overwriting it', () => {
  const path = join(fixture.root, 'modules-lock.json'),
    input = '{"modules":{"one":{"version":1}}}'
  writeFileSync(path, input)
  expect(() => setLocked('modules', 'two', pin)).toThrow('Invalid lock entry')
  expect(readFileSync(path, 'utf8')).toBe(input)
})
it('bumps and restores only the version while preserving package fields', () => {
  const path = join(fixture.root, 'package.json')
  replaceJSON(path, {
    name: 'example',
    version: '1.4.9',
    custom: { keep: true }
  })
  expect(bump(fixture.root)).toEqual({
    oldVersion: '1.4.9',
    newVersion: '1.4.10'
  })
  revertPackageVersion(fixture.root, '1.4.9')
  expect(objectFile(path)).toEqual({
    name: 'example',
    version: '1.4.9',
    custom: { keep: true }
  })
  replaceJSON(path, { version: 'bad' })
  expect(() => bump(fixture.root)).toThrow('valid package version')
  expect(objectFile(path).version).toBe('bad')
})
it('creates package manifests and retains unrelated dependencies when editing', () => {
  expect(readPackageJson('modules')).toMatchObject({
    private: true,
    name: '@monolith/modules'
  })
  addDependency('@monolith/one')
  addDependency('@monolith/two', 'modules', '2.0.0')
  removeDependency('@monolith/one')
  expect(getDependencies()).toEqual({ '@monolith/two': '2.0.0' })
  expect(() => readPackageJson('root')).toThrow()
})
it('leaves existing JSON intact when serialization fails', () => {
  const file = join(fixture.root, 'state.json')
  replaceJSON(file, { kept: true })
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  expect(() => replaceJSON(file, cyclic)).toThrow()
  expect(objectFile(file)).toEqual({ kept: true })
  expect(readdirSync(fixture.root)).toEqual(['state.json'])
})
