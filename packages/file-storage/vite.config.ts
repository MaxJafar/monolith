// SPDX-License-Identifier: 0BSD
import { isAbsolute } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    lib: {
      entry: { index: 'src/index.ts', 'server/index': 'src/server/index.ts' },
      formats: ['es'],
      fileName: (_format, entry) => entry + '.js'
    },
    rollupOptions: {
      external: name =>
        !isAbsolute(name) && !name.startsWith('.') && !name.startsWith('\u0000')
    }
  }
})
