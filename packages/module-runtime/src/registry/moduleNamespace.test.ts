// SPDX-License-Identifier: 0BSD
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { ModuleRegistry } from './ModuleRegistry'
import { setLoadingModuleId } from './loadingModule'
import { deriveModuleNamespace, resolveCallerModuleId } from './moduleNamespace'

afterEach(() => {
  setLoadingModuleId(undefined)
})

describe('durable table namespaces', () => {
  it.each([
    ['@monolith/calendar', 'calendar'],
    ['@monolith/monolith--idea-box', 'idea_box'],
    ['workspace', 'workspace'],
    ['guest--account-book', 'guest___account_book'],
    ['@monolith/guest--account-book', 'guest___account_book']
  ])('%s keeps the installed namespace %s', (id, expected) => {
    expect(deriveModuleNamespace(id)).toBe(expected)
  })

  it('uses the active import owner before inspecting call frames', () => {
    setLoadingModuleId('monolith--active-probe')
    expect(
      resolveCallerModuleId('Error\n at ignored (file:///outside.ts:1:2)')
    ).toBe('monolith--active-probe')
    setLoadingModuleId(undefined)
    expect(
      resolveCallerModuleId('Error\n at ignored (file:///outside.ts:1:2)')
    ).toBeUndefined()
  })

  it('resolves registered file URLs with spaces and Windows call frames', () => {
    const managed = resolve('workspace with spaces/managed')
    ModuleRegistry.registerPath(managed, 'url-probe')
    ModuleRegistry.registerPath('C:/workspace/modules/probe', 'windows-probe')
    expect(
      resolveCallerModuleId(
        'Error\n at load (' +
          pathToFileURL(resolve(managed, 'index.ts')).href +
          ':8:9)'
      )
    ).toBe('url-probe')
    expect(
      resolveCallerModuleId(
        'Error\n at C:\\workspace\\modules\\probe\\index.ts:8:9'
      )
    ).toBe('windows-probe')
  })
})
