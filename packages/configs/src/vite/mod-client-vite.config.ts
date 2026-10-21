// SPDX-License-Identifier: 0BSD
import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  type ConfigEnv,
  type Plugin,
  type UserConfig,
  defineConfig,
  loadEnv,
  mergeConfig
} from 'vite'

import { ADDON_SHARED } from '../constants/shared-packages'
import extractModuleMetadata from '../metadata/extractModuleMetadata'
import { resolveAddonIdentity } from '../utils/addonIdentity'
import { blocksuiteRuntime, blocksuiteSyntax } from './blocksuite'
import { sharedSourceAliases, stylesheetPlugin } from './clientEnvironment'

function metadataAsset(directory: string, portable: boolean): Plugin {
  return {
    name: 'monolith:emit-addon-metadata',
    apply: 'build',
    generateBundle() {
      const metadata = {
        ...extractModuleMetadata(directory),
        distribution: { portable }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'monolith-manifest.json',
        source: JSON.stringify(metadata, null, 2)
      })
    }
  }
}
interface ModuleConfigOptions {
  dirname: string
  pkg?: { name: string; [key: string]: any }
}

export function defineModuleClientConfig(
  { dirname, pkg }: ModuleConfigOptions,
  overrides: UserConfig | ((env: ConfigEnv) => UserConfig) = {}
) {
  const directory = path.resolve(dirname, '..')
  const root = path.resolve(directory, '../..')
  const manifest =
    pkg ??
    JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'))
  const { remoteId } = resolveAddonIdentity(manifest)
  const editor = blocksuiteRuntime(root)
  const docker = process.env.DOCKER_BUILD === 'true'
  const portable = process.env.MONOLITH_ADDON_RELEASE === '1'
  return defineConfig(environment => {
    const development = environment.command === 'serve'
    const envDir = path.join(root, 'env')
    const apiHost = docker
      ? '/api'
      : loadEnv(environment.mode, envDir, '').VITE_API_HOST || ''
    const config: UserConfig = {
      envDir,
      base: portable
        ? './'
        : apiHost.replace(/\/+$/, '') +
          '/modules/' +
          path.basename(directory) +
          '/',
      plugins: [
        blocksuiteSyntax(),
        react(),
        stylesheetPlugin(),
        !development &&
          federation({
            name: 'm_' + remoteId,
            filename: 'remoteEntry.js',
            dts: false,
            exposes: { './Manifest': './manifest.ts' },
            remotes: {},
            shared: ADDON_SHARED
          }),
        !development && metadataAsset(directory, portable)
      ].filter(Boolean),
      resolve: {
        dedupe: ['react', 'react-dom', 'lit', 'yjs'],
        alias: [
          ...editor.aliases,
          ...(development ? sharedSourceAliases(root) : []),
          {
            find: /^@\/manifest$/,
            replacement: path.join(dirname, 'manifest.ts')
          },
          { find: /^@\/(.*)$/, replacement: path.join(dirname, 'src/$1') },
          { find: /^@$/, replacement: path.join(dirname, 'src/index') }
        ]
      },
      optimizeDeps: {
        exclude: editor.exclude,
        rolldownOptions: { plugins: [blocksuiteSyntax()] }
      },
      build: {
        outDir: docker ? 'dist-docker' : 'dist',
        target: 'esnext',
        modulePreload: false
      }
    }
    return mergeConfig(
      config,
      typeof overrides === 'function' ? overrides(environment) : overrides
    )
  })
}
