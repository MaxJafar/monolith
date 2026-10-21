// SPDX-License-Identifier: 0BSD
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, esmExternalRequirePlugin } from 'vite'
import declarations from 'vite-plugin-dts'

import { externalDependencyRegex } from '@monolith/configs/vite'

const local = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url))
export default defineConfig({
  resolve: { alias: { '@': local('./src/') } },
  plugins: [
    react(),
    declarations({ entryRoot: local('./src/') }),
    esmExternalRequirePlugin({
      external: [externalDependencyRegex],
      skipDuplicateCheck: true
    })
  ],
  build: {
    lib: {
      entry: local('./src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.mjs' : 'index.js')
    },
    rollupOptions: { external: [externalDependencyRegex] },
    minify: true,
    sourcemap: false
  }
})
