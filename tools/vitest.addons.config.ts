import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: [
      'tools/src/commands/modules/handlers/addons.test.ts',
      'tools/src/utils/sourceInstall.test.ts',
      'tools/src/commands/db/functions/schemaPolicy.test.ts'
    ],
    maxWorkers: 1,
    fileParallelism: false
  }
})
