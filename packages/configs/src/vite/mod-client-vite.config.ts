import { federation } from '@module-federation/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import {
  type Plugin,
  type UserConfig,
  defineConfig,
  loadEnv,
  mergeConfig
} from 'vite'

import { ADDON_SHARED, SHARED_PACKAGES } from '../constants/shared-packages'
import extractModuleMetadata from '../metadata/extractModuleMetadata'
import { resolveAddonIdentity } from '../utils/addonIdentity'
import { blocksuiteRuntime, blocksuiteSyntax } from './blocksuite'

/**
 * Emits the module's parsed metadata (`monolith-manifest.json`) alongside the
 * build output so the server can read it without parsing source.
 */
function emitModuleMetadataPlugin(moduleDir: string): Plugin {
  return {
    name: 'monolith:emit-addon-metadata',
    apply: 'build',
    generateBundle() {
      const metadata = extractModuleMetadata(moduleDir)

      this.emitFile({
        type: 'asset',
        fileName: 'monolith-manifest.json',
        source: JSON.stringify(
          {
            ...metadata,
            distribution: {
              portable: process.env.MONOLITH_ADDON_RELEASE === '1'
            }
          },
          null,
          2
        )
      })
    }
  }
}

interface ModuleConfigOptions {
  dirname: string
  pkg?: {
    name: string
    [key: string]: any
  }
}

/**
 * Creates a standard Vite configuration for Monolith addons.
 * Supports custom overrides via the second parameter.
 */
export function defineModuleClientConfig(
  { dirname, pkg: customPkg }: ModuleConfigOptions,
  overrides: UserConfig | ((env: any) => UserConfig) = {}
) {
  const isDocker = process.env.DOCKER_BUILD === 'true'
  const editor = blocksuiteRuntime(path.resolve(dirname, '../../..'))

  const outDir = isDocker ? 'dist-docker' : 'dist'

  const pkg =
    customPkg ||
    JSON.parse(
      fs.readFileSync(path.resolve(dirname, '../package.json'), 'utf8')
    )

  const moduleName = path.basename(path.resolve(dirname, '..'))
  const { remoteId } = resolveAddonIdentity(pkg)
  const remoteName = `m_${remoteId}`

  return defineConfig(configEnv => {
    const isDev = configEnv.command === 'serve'

    // 1. Resolve environment variables natively from the root env folder
    const envDir = path.resolve(dirname, '../../../env')

    const env = loadEnv(configEnv.mode, envDir, '')

    const apiHost = isDocker ? '/api' : env.VITE_API_HOST || ''

    // 2. Base default configuration
    const baseConfig: UserConfig = {
      base:
        process.env.MONOLITH_ADDON_RELEASE === '1'
          ? './'
          : `${apiHost}/modules/${moduleName}/`,
      envDir,
      plugins: [
        blocksuiteSyntax(),
        react(),
        vanillaExtractPlugin({
          unstable_pluginFilter: ({ name }) =>
            name === 'monolith-blocksuite-syntax'
        }) as any,
        !isDev &&
          federation({
            name: remoteName,
            filename: 'remoteEntry.js',
            dts: false,
            exposes: {
              './Manifest': './manifest.ts'
            },
            remotes: {},
            shared: ADDON_SHARED
          }),
        !isDev && emitModuleMetadataPlugin(path.resolve(dirname, '..'))
      ].filter(Boolean),
      resolve: {
        dedupe: ['react', 'react-dom', 'lit', 'yjs'],
        alias: [
          ...editor.aliases,
          ...(isDev
            ? Object.entries(SHARED_PACKAGES).map(
                ([, { aliasRegex, entryPoint }]) => ({
                  find: aliasRegex,
                  replacement: path.resolve(dirname, '/../../', entryPoint)
                })
              )
            : []),
          {
            find: /^@\/manifest$/,
            replacement: path.resolve(dirname, './manifest.ts')
          },
          { find: /^@\/(.*)$/, replacement: path.resolve(dirname, './src/$1') },
          { find: /^@$/, replacement: path.resolve(dirname, './src/index') }
        ]
      },
      optimizeDeps: {
        exclude: editor.exclude,
        rolldownOptions: { plugins: [blocksuiteSyntax()] }
      },
      build: {
        outDir,
        target: 'esnext',
        modulePreload: false
      }
    }

    // 3. Resolve custom overrides if they are passed as a function
    const resolvedOverrides =
      typeof overrides === 'function' ? overrides(configEnv) : overrides

    // 4. Merge base configuration with the module-specific overrides
    return mergeConfig(baseConfig, resolvedOverrides)
  })
}
