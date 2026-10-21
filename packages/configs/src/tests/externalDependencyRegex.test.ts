// SPDX-License-Identifier: 0BSD
import { describe, expect, it } from 'vitest'

import { externalDependencyRegex } from '../constants/external-dependency-regex'

describe('external dependency pattern', () => {
  it.each([
    'react',
    'react-dom/client',
    'socket.io-client',
    'underscore_pkg',
    '@scope/package',
    '@scope/package/a/b',
    'node:fs/promises',
    'fs/promises'
  ])('accepts public package specifier %s', name => {
    expect(externalDependencyRegex.test(name)).toBe(true)
    expect(externalDependencyRegex.test(name)).toBe(true)
  })
  it.each(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'])(
    'bundles explicit .%s source entries',
    extension => {
      for (const prefix of [
        'src/entry.',
        '@scope/package/entry.',
        'folder/nested/entry.'
      ])
        expect(externalDependencyRegex.test(prefix + extension)).toBe(false)
    }
  )
  it.each([
    '',
    '.',
    './file',
    '../file',
    '/absolute',
    'C:/source',
    'C:\\source',
    '@scope',
    '@/',
    '@scope/',
    'trailing/',
    'with spaces',
    'module?query',
    'module#fragment',
    'https://remote',
    'file:///source',
    'package/..',
    'package/./file',
    'package/../file',
    '.hidden',
    '~alias',
    'package\\path'
  ])('rejects path or malformed specifier %s', name => {
    expect(externalDependencyRegex.test(name)).toBe(false)
  })
})
