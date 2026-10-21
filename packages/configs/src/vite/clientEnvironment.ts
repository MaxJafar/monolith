// SPDX-License-Identifier: 0BSD
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import path from 'node:path'
import type { Alias, Plugin } from 'vite'

import { SHARED_DEPS, SHARED_PACKAGES } from '../constants/shared-packages'
import { clientAliasResolver } from '../resolvers/client-alias-resolver'

export function sharedSourceAliases(root: string): Alias[] {
  return Object.values(SHARED_PACKAGES).map(entry => ({
    find: entry.aliasRegex,
    replacement: path
      .resolve(root, entry.entryPoint.replace(/^\.\.\//, ''))
      .replaceAll('\\', '/')
  }))
}
export function sourceAliasPlugin(): Plugin {
  return {
    name: 'alias-resolver',
    enforce: 'pre',
    resolveId: clientAliasResolver
  }
}
export function stylesheetPlugin() {
  return vanillaExtractPlugin({
    unstable_pluginFilter: ({ name }) =>
      [
        'alias-resolver',
        'vite-tsconfig-paths',
        'monolith-blocksuite-syntax'
      ].includes(name)
  })
}
export const HOST_SHARED = Object.fromEntries(
  Object.entries({
    ...SHARED_DEPS,
    ...Object.fromEntries(Object.keys(SHARED_PACKAGES).map(name => [name, {}]))
  }).map(([name, options]) => [name, { ...options, singleton: true }])
)
