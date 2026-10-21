// SPDX-License-Identifier: 0BSD
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'node22',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: {
      // Runtime dependencies remain installed packages, including Node built-ins.
      external: id =>
        !id.startsWith('.') &&
        !id.startsWith('/') &&
        !/^[A-Za-z]:[/\\\\]/.test(id)
    }
  }
})
