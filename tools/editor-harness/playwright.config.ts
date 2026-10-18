import { defineConfig } from '@playwright/test'
import { resolve } from 'node:path'

export default defineConfig({
  testDir: './tests',
  outputDir: '../../.temp/editor-harness-results',
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5185',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  webServer: {
    cwd: resolve(__dirname, '../..'),
    command: 'pnpm editor:harness:preview',
    url: 'http://127.0.0.1:5185',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
