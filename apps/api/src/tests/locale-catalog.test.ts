// SPDX-License-Identifier: 0BSD
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { loadLanguageCatalog } from '../core/functions/initialization/localeService'
import { lookupLocale } from '../lib/locales/catalog'

const directories: string[] = []
function temporary() {
  const path = mkdtempSync(join(tmpdir(), 'monolith-locale-'))
  directories.push(path)
  return path
}
function write(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
function pack(
  root: string,
  folder = 'en',
  code = 'en',
  alternative?: string[]
) {
  write(join(root, folder, 'package.json'), {
    name: '@monolith/lang-' + folder,
    version: '1.0.0',
    description: 'Fixture',
    author: 'Fixture',
    monolith: {
      code,
      alternative,
      icon: 'tabler:language',
      displayName: folder
    }
  })
  write(join(root, folder, 'common.json'), {
    sidebar: { title: 'Workspace' },
    buttons: { save: 'Save' }
  })
}
afterEach(() => {
  for (const path of directories.splice(0)) {
    const target = resolve(path)
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith('monolith-locale-')
    )
      throw new Error('Unexpected fixture path')
    rmSync(target, { recursive: true, force: true })
  }
})
it('loads aliases and independent subnamespaces from language pack metadata', () => {
  const directory = temporary()
  pack(directory, 'en', 'en', ['en-US'])
  write(join(directory, 'en', 'calendar.json'), {
    title: 'Calendar',
    event: 'Event'
  })
  const loaded = loadLanguageCatalog(directory)
  expect(loaded.manifests[0]).toMatchObject({
    name: 'en',
    alternative: ['en-US']
  })
  expect(
    lookupLocale(loaded, [], {
      lang: 'en-US',
      namespace: 'common',
      subnamespace: 'calendar'
    })
  ).toMatchObject({ event: 'Event' })
  expect(
    lookupLocale(loaded, [], {
      lang: 'en',
      namespace: 'common',
      subnamespace: 'buttons'
    })
  ).toEqual({ save: 'Save' })
  expect(
    lookupLocale(loaded, [], {
      lang: 'missing',
      namespace: 'common',
      subnamespace: ''
    })
  ).toBeNull()
})
it('rejects duplicate aliases, invalid language paths and malformed locale objects', () => {
  const directory = temporary()
  pack(directory, 'en', 'en', ['en-US'])
  pack(directory, 'other', 'en-US')
  expect(() => loadLanguageCatalog(directory)).toThrow(
    'Duplicate language identifier'
  )
  const invalid = temporary()
  pack(invalid, 'en', '../outside')
  expect(() => loadLanguageCatalog(invalid)).toThrow()
  const array = temporary()
  pack(array)
  write(join(array, 'en', 'common.json'), ['not an object'])
  expect(() => loadLanguageCatalog(array)).toThrow()
  expect(() => loadLanguageCatalog(temporary())).toThrow(
    'At least one language pack'
  )
})
it('injects addon navigation labels without mutating the cached language catalog', () => {
  const directory = temporary()
  pack(directory)
  const addonRoot = temporary()
  write(join(addonRoot, 'locales', 'en.json'), {
    title: 'Focus',
    subsections: { timer: 'Timer' },
    controls: { start: 'Start' }
  })
  const loaded = loadLanguageCatalog(directory)
  const original = JSON.stringify(loaded)
  const addons = [
    {
      id: 'monolith--pomodoro-timer',
      name: '@monolith/pomodoro-timer',
      directory: addonRoot
    }
  ]
  const sidebar = lookupLocale(loaded, addons, {
    lang: 'en',
    namespace: 'common',
    subnamespace: 'sidebar'
  })
  expect(sidebar).toMatchObject({
    title: 'Workspace',
    apps: { '@monolith/pomodoro-timer': { title: 'Focus' } }
  })
  expect(
    lookupLocale(loaded, addons, {
      lang: 'en',
      namespace: 'apps',
      subnamespace: addons[0]!.id
    })
  ).toMatchObject({ controls: { start: 'Start' } })
  expect(
    lookupLocale(loaded, addons, {
      lang: 'en',
      namespace: 'apps',
      subnamespace: addons[0]!.name
    })
  ).toMatchObject({ title: 'Focus' })
  expect(JSON.stringify(loaded)).toBe(original)
  expect(
    lookupLocale(loaded, [], {
      lang: 'en',
      namespace: 'common',
      subnamespace: '__proto__'
    })
  ).toEqual({})
})
it('loads all currently shipped language packs without changing their stored content', () => {
  const root = resolve(process.cwd(), '../../locales')
  const loaded = loadLanguageCatalog(root)
  expect(loaded.manifests.map(item => item.name).sort()).toEqual([
    'en',
    'ms',
    'zh-CN',
    'zh-TW'
  ])
  for (const manifest of loaded.manifests) {
    expect(loaded.locales[manifest.name]?.common).toEqual(
      JSON.parse(
        readFileSync(join(root, manifest.packName, 'common.json'), 'utf8')
      )
    )
  }
})
