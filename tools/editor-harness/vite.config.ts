import ts from '@typescript/typescript6'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

import { blocksuiteAliases } from './blocksuite-compat.mjs'

function accessors() {
  return {
    name: 'monolith-blocksuite-syntax',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      if (!/[\\/]@blocksuite[\\/].*\.ts(?:$|\?)/.test(id)) return
      const result = ts.transpileModule(code, {
        fileName: id.split('?')[0],
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          useDefineForClassFields: false,
          experimentalDecorators: false,
          sourceMap: true
        }
      })
      return { code: result.outputText, map: result.sourceMapText }
    }
  }
}

export default defineConfig({
  root: resolve(import.meta.dirname),
  publicDir: resolve(import.meta.dirname, '../../apps/web/public'),
  plugins: [
    accessors(),
    vanillaExtractPlugin({
      unstable_pluginFilter: ({ name }) => name === 'monolith-blocksuite-syntax'
    }),
    react()
  ],
  optimizeDeps: {
    exclude: blocksuiteAliases().map(alias => alias.find),
    rolldownOptions: { plugins: [accessors()] }
  },
  oxc: { target: 'es2022' },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(import.meta.dirname, '../../packages/ui/src')
      },
      {
        find: /^yjs$/,
        replacement: resolve(
          import.meta.dirname,
          '../../packages/ui/node_modules/yjs/dist/yjs.mjs'
        )
      },
      ...blocksuiteAliases().map(alias => ({
        ...alias,
        replacement: alias.replacement
          .replace('/dist/', '/src/')
          .replace(/\.js$/, '.ts')
      }))
    ],
    dedupe: ['react', 'react-dom', 'lit', 'yjs']
  },
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, '../..')] }
  },
  build: {
    target: 'es2022',
    outDir: '../../.temp/editor-harness-dist',
    emptyOutDir: true
  }
})
