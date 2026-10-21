import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: [
      'src/core/providers/**/*.test.{ts,tsx}',
      'src/core/utils/*.test.ts',
      'src/system/personalization/*.test.{ts,tsx}',
      'src/core/routing/components/*.test.tsx',
      'src/core/routing/hooks/*.test.tsx',
      'src/core/routing/utils/*.test.tsx',
      'src/core/routing/utils/*.test.ts',
      'src/system/accountSettings/*.test.ts',
      'src/system/apiKeys/*.test.ts',
      'src/system/auth/*.test.ts',
      'src/system/auth/utils/*.test.ts',
      'src/system/auth/modals/QRLoginModal/utils/*.test.ts',
      'src/core/routing/components/Sidebar/*.test.ts',
      'src/system/dashboard/utils/*.test.ts',
      'src/system/dashboard/providers/*.test.ts',
      'src/core/appearance/*.test.{ts,tsx}',
      'src/core/overlays/*.test.{ts,tsx}',
      'src/core/updates/*.test.{ts,tsx}',
      'src/system/moduleManager/pages/Modules/*.test.ts',
      'src/system/moduleManager/pages/Categories/*.test.ts'
    ],
    environment: 'node'
  }
})
