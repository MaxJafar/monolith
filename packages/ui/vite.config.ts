// SPDX-License-Identifier: 0BSD
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, esmExternalRequirePlugin } from 'vite'
import dts from 'vite-plugin-dts'

import { externalDependencyRegex } from '@monolith/configs/vite'

const source = fileURLToPath(new URL('./src/', import.meta.url))
export default defineConfig(() => ({
  resolve: { alias: { '@': source } },
  plugins: [
    react(),
    vanillaExtractPlugin({
      unstable_pluginFilter: ({ name }) =>
        ['monolith-blocksuite-syntax', 'vite-tsconfig-paths'].includes(name)
    }),
    dts({ entryRoot: source }),
    esmExternalRequirePlugin({
      skipDuplicateCheck: true,
      external: [externalDependencyRegex]
    })
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.mjs' : 'index.js')
    },
    rollupOptions: {
      external: [externalDependencyRegex],
      output: { assetFileNames: 'index.[ext]' }
    },
    minify: true,
    sourcemap: false
  }
}))
