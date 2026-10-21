// SPDX-License-Identifier: 0BSD
import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { include: ['src/**/*.test.{ts,tsx}'] } })
