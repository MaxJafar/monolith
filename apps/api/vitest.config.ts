// SPDX-License-Identifier: 0BSD
import { config as loadEnvironment } from 'dotenv'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

import { serverAliases } from './vite.config'

const environmentFile = fileURLToPath(
  new URL('../../env/.env.local', import.meta.url)
)
if (existsSync(environmentFile))
  loadEnvironment({ path: environmentFile, quiet: true })
export default defineConfig({
  resolve: {
    alias: {
      ...serverAliases,
      '@tests': fileURLToPath(new URL('src/tests', import.meta.url))
    }
  },
  test: {
    // Disabled integration suites import the models but never open a connection.
    // Their opt-in guards reject this sentinel when a real fixture DB is needed.
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgres://127.0.0.1:1/monolith_tests_disabled'
    },
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false
  }
})
