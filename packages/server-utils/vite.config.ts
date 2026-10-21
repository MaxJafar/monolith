// SPDX-License-Identifier: 0BSD
import { isAbsolute } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'node22',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: {
      external: name =>
        !isAbsolute(name) && !name.startsWith('.') && !name.startsWith('\u0000')
    }
  }
})
