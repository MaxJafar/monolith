import { federation } from '@module-federation/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import {
  SHARED_DEPS,
  SHARED_PACKAGES
} from '../../packages/configs/src/constants/shared-packages'
import { clientAliasResolver } from '../../packages/configs/src/resolvers/client-alias-resolver'
import {
  blocksuiteRuntime,
  blocksuiteSyntax
} from '../../packages/configs/src/vite/blocksuite'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../..')
const editor = blocksuiteRuntime(root)
export default defineConfig({
  root: directory,
  publicDir: '../web/public',
  define: { 'import.meta.env.VITE_API_HOST': JSON.stringify('/api') },
  plugins: [
    blocksuiteSyntax(),
    {
      name: 'alias-resolver',
      enforce: 'pre',
      resolveId(source, importer) {
        return source === '@' || source.startsWith('@/')
          ? clientAliasResolver(source, importer)
          : null
      }
    },
    react(),
    federation({
      name: 'host',
      dts: false,
      remotes: {},
      shared: {
        ...Object.fromEntries(
          Object.entries(SHARED_DEPS).map(([name, config]) => [
            name,
            { ...config, singleton: true }
          ])
        ),
        ...Object.fromEntries(
          Object.keys(SHARED_PACKAGES).map(name => [name, { singleton: true }])
        )
      }
    }),
    vanillaExtractPlugin({
      unstable_pluginFilter: ({ name }) =>
        ['alias-resolver', 'monolith-blocksuite-syntax'].includes(name)
    })
  ],
  resolve: {
    alias: [
      ...editor.aliases,
      ...['api', 'ui', 'federation', 'localization', 'blocks'].map(name => ({
        find: new RegExp(`^@monolith/${name}$`),
        replacement: path.resolve(root, `packages/${name}/src/index.ts`)
      }))
    ],
    dedupe: [
      'react',
      'react-dom',
      'yjs',
      'lit',
      'i18next',
      '@tanstack/react-query'
    ]
  },
  server: { host: 'localhost', port: 5186, strictPort: true },
  build: {
    target: ['chrome120', 'safari17'],
    outDir: 'dist',
    emptyOutDir: true
  },
  optimizeDeps: {
    exclude: [
      ...editor.exclude,
      '@monolith/ui',
      '@monolith/api',
      '@monolith/federation'
    ],
    rolldownOptions: { plugins: [blocksuiteSyntax()] }
  }
})
