import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/core/routing/utils/*.test.ts',
      'src/system/dashboard/utils/*.test.ts'
    ],
    environment: 'node'
  }
})
