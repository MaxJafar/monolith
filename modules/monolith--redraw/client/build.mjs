import { fileURLToPath } from 'node:url'
import { build } from 'vite'

await build({
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url))
})
// Federation's shared-module prebuild server retains a handle after Vite finishes.
// Exit only after the build promise has resolved and all output has been written.
process.exit(0)
