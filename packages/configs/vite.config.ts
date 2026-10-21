// SPDX-License-Identifier: 0BSD
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { externalDependencyRegex } from './src/constants/external-dependency-regex'

const entry = Object.fromEntries(
  ['index', 'vite', 'node', 'metadata'].map(name => [
    name,
    fileURLToPath(new URL('./src/' + name + '.ts', import.meta.url))
  ])
)
export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false,
    sourcemap: true,
    lib: { entry, formats: ['es'], fileName: '[name]' },
    rollupOptions: { external: [/^node:/, externalDependencyRegex] }
  }
})
