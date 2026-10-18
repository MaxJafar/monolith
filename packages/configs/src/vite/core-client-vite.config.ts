import { federation } from '@module-federation/vite'
import babel from '@rolldown/plugin-babel'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

import { SHARED_DEPS, SHARED_PACKAGES } from '../constants/shared-packages'
import { clientAliasResolver } from '../resolvers/client-alias-resolver'
import { blocksuiteRuntime, blocksuiteSyntax } from './blocksuite'

/**
 * Creates the standard client/host Vite configuration for Monolith.
 */
export function defineCoreClientConfig(dirname: string) {
  const editor = blocksuiteRuntime(path.resolve(dirname, '../..'))
  const aliasList = [
    ...Object.entries(SHARED_PACKAGES).map(
      ([, { aliasRegex, entryPoint }]) => ({
        find: aliasRegex,
        replacement: path.resolve(dirname, '../', entryPoint)
      })
    ),
    { find: '@modules', replacement: path.resolve(dirname, '../../modules') }
  ]

  return defineConfig(({ command }) => {
    const isDev = command === 'serve'

    const sharedAliases = new Set(
      Object.values(SHARED_PACKAGES).map(p => p.aliasRegex.toString())
    )

    const activeAlias = isDev
      ? aliasList
      : aliasList.filter(a => !sharedAliases.has(a.find.toString()))

    return {
      envDir: path.resolve(dirname, '../../env'),
      plugins: [
        blocksuiteSyntax(),
        {
          name: 'alias-resolver',
          enforce: 'pre',
          resolveId(source: string, importer: string | undefined) {
            if (source === '@' || source.startsWith('@/')) {
              return clientAliasResolver(source, importer)
            }
            return null
          }
        },
        react(),
        babel({
          presets: [reactCompilerPreset()]
        }),
        vanillaExtractPlugin({
          unstable_pluginFilter: ({ name }) => {
            return [
              'vite-tsconfig-paths',
              'alias-resolver',
              'monolith-blocksuite-syntax'
            ].includes(name)
          }
        }),
        !isDev &&
          federation({
            name: 'host',
            dts: false,
            // Addons are registered from the installed catalog at runtime.
            remotes: {},
            shared: {
              ...Object.fromEntries(
                Object.entries(SHARED_DEPS).map(([name, config]) => [
                  name,
                  { ...config, singleton: true }
                ])
              ),
              ...Object.fromEntries(
                Object.keys(SHARED_PACKAGES).map(name => [
                  name,
                  { singleton: true }
                ])
              )
            }
          })
      ].filter(Boolean),
      server: {
        proxy: {
          '/.well-known/monolith': {
            target:
              process.env.MONOLITH_GATEWAY_DEV_URL || 'http://127.0.0.1:8080'
          },
          '/api/v1': {
            target:
              process.env.MONOLITH_GATEWAY_DEV_URL || 'http://127.0.0.1:8080'
          }
        },
        fs: {
          strict: true
        },
        watch: {
          ignored: ['**/node_modules/**', '**/.git/**']
        }
      },
      resolve: {
        alias: [...editor.aliases, ...activeAlias],
        dedupe: ['react', 'react-dom', 'lit', 'yjs']
      },
      ssr: {
        noExternal: [
          /^@monolith\//,
          new RegExp(path.resolve(dirname, '../../packages')),
          new RegExp(path.resolve(dirname, '../../modules'))
        ]
      },
      build: {
        commonjsOptions: {
          transformMixedEsModules: true
        },
        target: 'esnext',
        sourcemap: false,
        rollupOptions: {
          output: {
            codeSplitting: {
              minSize: 5000
            }
          }
        }
      },
      optimizeDeps: {
        exclude: [...Object.keys(SHARED_PACKAGES), ...editor.exclude],
        rolldownOptions: { plugins: [blocksuiteSyntax()] }
      },
      css: {
        postcss: {
          plugins: [
            {
              postcssPlugin: 'internal:charset-removal',
              AtRule: {
                charset: atRule => {
                  if (atRule.name === 'charset') {
                    atRule.remove()
                  }
                }
              }
            }
          ]
        }
      }
    }
  })
}
