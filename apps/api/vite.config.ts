// SPDX-License-Identifier: 0BSD
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export const serverAliases = Object.fromEntries(
  [
    ['@', 'src'],
    ['@constants', 'src/core/constants'],
    ['@functions', 'src/core/functions'],
    ['@schema', 'src/core/schema'],
    ['@lib', 'src/lib'],
    ['@modules', '../../modules']
  ].map(([key, target]) => [
    key,
    fileURLToPath(new URL(target!, import.meta.url))
  ])
)

export default defineConfig({
  resolve: { alias: { ...serverAliases, crypto: 'node:crypto' } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    target: 'node22',
    ssr: 'src/index.ts',
    outDir: 'dist',
    minify: true,
    rollupOptions: {
      external: ['@monolith/drizzle', '@monolith/server-utils'],
      output: { entryFileNames: 'server.js' }
    }
  }
})
