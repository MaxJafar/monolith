// SPDX-License-Identifier: 0BSD
import { federation } from '@module-federation/vite'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

import { SHARED_PACKAGES } from '../constants/shared-packages'
import { blocksuiteRuntime, blocksuiteSyntax } from './blocksuite'
import {
  HOST_SHARED,
  sharedSourceAliases,
  sourceAliasPlugin,
  stylesheetPlugin
} from './clientEnvironment'

export function defineCoreClientConfig(dirname: string) {
  const root = path.resolve(dirname, '../..')
  const editor = blocksuiteRuntime(root)
  return defineConfig(({ command }) => {
    const development = command === 'serve'
    const gateway =
      process.env.MONOLITH_GATEWAY_DEV_URL || 'http://127.0.0.1:8080'
    return {
      envDir: path.join(root, 'env'),
      plugins: [
        blocksuiteSyntax(),
        sourceAliasPlugin(),
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        stylesheetPlugin(),
        !development &&
          federation({
            name: 'host',
            dts: false,
            remotes: {},
            shared: HOST_SHARED
          })
      ].filter(Boolean),
      resolve: {
        dedupe: ['react', 'react-dom', 'lit', 'yjs'],
        alias: [
          ...editor.aliases,
          ...(development ? sharedSourceAliases(root) : []),
          { find: '@modules', replacement: path.join(root, 'modules') }
        ]
      },
      server: {
        fs: { strict: true },
        watch: { ignored: ['**/node_modules/**', '**/.git/**'] },
        proxy: Object.fromEntries(
          ['/.well-known/monolith', '/api/v1'].map(route => [
            route,
            { target: gateway }
          ])
        )
      },
      ssr: { noExternal: [/^@monolith\//, /[\\/](?:packages|modules)[\\/]/] },
      optimizeDeps: {
        exclude: [...Object.keys(SHARED_PACKAGES), ...editor.exclude],
        rolldownOptions: { plugins: [blocksuiteSyntax()] }
      },
      build: {
        target: 'esnext',
        sourcemap: false,
        commonjsOptions: { transformMixedEsModules: true },
        rollupOptions: { output: { codeSplitting: { minSize: 5000 } } }
      },
      css: {
        postcss: {
          plugins: [
            {
              postcssPlugin: 'monolith-remove-redundant-charset',
              AtRule: {
                charset: rule => {
                  rule.remove()
                }
              }
            }
          ]
        }
      }
    }
  })
}
