import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'

import desktopConfig from '../../apps/desktop/vite.config'
import { ADDON_SHARED } from '../../packages/configs/src/constants/shared-packages'

const directory = dirname(fileURLToPath(import.meta.url))

export default defineConfig(async env => {
  const remote = env.mode === 'remote'
  const base = remote
    ? {
        plugins: [
          react(),
          federation({
            name: 'probe',
            filename: 'remoteEntry.js',
            dts: false,
            exposes: { './Probe': resolve(directory, 'probe.tsx') },
            shared: ADDON_SHARED
          })
        ],
        build: { target: 'esnext', modulePreload: false }
      }
    : await (typeof desktopConfig === 'function'
        ? desktopConfig(env)
        : desktopConfig)
  return mergeConfig(base, {
    root: directory,
    publicDir: false,
    base: remote ? '/remote/' : '/',
    build: {
      outDir: resolve(
        directory,
        '../../.temp/federation-harness',
        remote ? 'remote' : 'host'
      ),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(directory, remote ? 'probe.tsx' : 'index.html')
      }
    }
  })
})
