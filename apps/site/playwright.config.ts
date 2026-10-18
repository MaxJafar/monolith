import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  testDir: './tests',
  outputDir: '../../.temp/site-test-results',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: process.env.SITE_TEST_URL || 'http://127.0.0.1:4321',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  webServer: process.env.SITE_TEST_URL
    ? undefined
    : {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        command: 'pnpm --filter @monolith/site preview',
        url: 'http://127.0.0.1:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
      }
})
