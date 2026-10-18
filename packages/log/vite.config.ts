import { defineConfig } from 'vite'

import { externalDependencyRegex } from '@monolith/configs/vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: './src/index.ts'
      },
      formats: ['es']
    },
    outDir: 'dist',
    target: 'node22',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
      external: [externalDependencyRegex]
    }
  }
})
