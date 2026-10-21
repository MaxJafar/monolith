// SPDX-License-Identifier: 0BSD
import type { StorybookConfig } from '@storybook/react-vite'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { blocksuiteRuntime, blocksuiteSyntax } from '@monolith/configs/vite'

const require = createRequire(import.meta.url)
const packageRoot = (name: string) =>
  dirname(require.resolve(name + '/package.json'))
const remoteModule = 'virtual:__federation__'
const fixture: Plugin = {
  name: 'monolith-preview-remotes',
  resolveId: id => (id === remoteModule ? '\0' + remoteModule : null),
  load: id =>
    id === '\0' + remoteModule
      ? [
          'export function __federation_method_setRemote() {}',
          'export async function __federation_method_getRemote() { throw new Error("Remote addons require a Monolith host"); }',
          'export function __federation_method_unwrapDefault(value) { return value?.default ?? value; }'
        ].join('\n')
      : null
}
const config: StorybookConfig = {
  framework: { name: packageRoot('@storybook/react-vite'), options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],
  staticDirs: [{ from: '../../../apps/web/public/fonts', to: '/fonts' }],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    'storybook-addon-deep-controls'
  ].map(packageRoot),
  typescript: {
    reactDocgen: 'react-docgen',
    reactDocgenTypescriptOptions: {
      tsconfigPath: './tsconfig.json',
      shouldExtractLiteralValuesFromEnum: true,
      include: ['./src/**/*.tsx']
    },
    check: false
  },
  viteFinal(config) {
    const editor = blocksuiteRuntime(
      fileURLToPath(new URL('../../..', import.meta.url))
    )
    const aliases = config.resolve?.alias ?? {}
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: [
          ...editor.aliases,
          ...(Array.isArray(aliases)
            ? aliases
            : Object.entries(aliases).map(([find, replacement]) => ({
                find,
                replacement
              })))
        ]
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        exclude: [...(config.optimizeDeps?.exclude ?? []), ...editor.exclude]
      },
      plugins: [
        blocksuiteSyntax(),
        ...(config.plugins ?? []).filter(
          plugin =>
            !(
              plugin &&
              typeof plugin === 'object' &&
              'name' in plugin &&
              ['vite:dts', 'unplugin-dts'].includes(plugin.name)
            )
        ),
        fixture,
        tsconfigPaths()
      ]
    }
  }
}
export default config
