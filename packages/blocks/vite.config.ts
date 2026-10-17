import { defineConfig } from 'vite'

import { externalDependencyRegex } from '@monolith/configs/vite'

export default defineConfig({
  build: {
    lib: { entry: './src/index.ts', formats: ['es'] },
    target: 'es2022',
    rollupOptions: {
      external: [externalDependencyRegex],
      output: { entryFileNames: 'index.js' }
    }
  }
})
