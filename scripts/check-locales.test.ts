// SPDX-License-Identifier: 0BSD
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { inspectLocales } from './check-locales'

const roots: string[] = []
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'monolith-locale-check-'))
  roots.push(root)
  for (const lang of ['en', 'ms']) mkdirSync(join(root, 'lang-' + lang))
  return root
}
function write(root: string, lang: string, name: string, value: unknown) {
  writeFileSync(join(root, 'lang-' + lang, name), JSON.stringify(value))
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    const target = resolve(root),
      base = resolve(tmpdir())
    if (
      !target.startsWith(base + sep) ||
      !target.split(sep).pop()?.startsWith('monolith-locale-check-')
    )
      throw Error('Unexpected test directory')
    rmSync(target, { recursive: true, force: true })
  }
})
it('compares nested translation keys without comparing translated values', () => {
  const root = fixture()
  write(root, 'en', 'common.json', {
    button: { save: 'Save' },
    choices: ['One', 'Two']
  })
  write(root, 'ms', 'common.json', {
    choices: ['Satu'],
    button: { save: 'Simpan' }
  })
  expect(inspectLocales(root)).toEqual([])
})
it('reports missing files instead of claiming a complete pack', () => {
  const root = fixture()
  write(root, 'en', 'common.json', { save: 'Save' })
  expect(inspectLocales(root)).toEqual([
    { file: 'lang-ms/common.json', kind: 'missing-file' }
  ])
})
it('finds missing and extra nested keys', () => {
  const root = fixture()
  write(root, 'en', 'common.json', { button: { save: 'Save' } })
  write(root, 'ms', 'common.json', { button: { cancel: 'Batal' } })
  expect(inspectLocales(root)).toEqual([
    {
      file: 'lang-ms/common.json',
      kind: 'missing-keys',
      keys: ['button.save']
    },
    { file: 'lang-ms/common.json', kind: 'extra-keys', keys: ['button.cancel'] }
  ])
})
it('reports invalid reference or translated JSON without silently skipping it', () => {
  const root = fixture()
  write(root, 'en', 'common.json', null)
  writeFileSync(join(root, 'lang-ms', 'common.json'), '{broken')
  expect(
    inspectLocales(root).filter(issue => issue.kind === 'invalid')
  ).toHaveLength(2)
})
it('ignores package metadata and identifies extra translation files', () => {
  const root = fixture()
  write(root, 'en', 'package.json', { name: 'English' })
  write(root, 'ms', 'extra.json', { extra: 'Extra' })
  expect(inspectLocales(root)).toEqual([
    { file: 'lang-ms/extra.json', kind: 'extra-file' }
  ])
})
it('reports a missing reference directory', () => {
  const root = fixture()
  expect(inspectLocales(root, 'lang-fr')).toEqual([
    expect.objectContaining({ kind: 'invalid' })
  ])
})
