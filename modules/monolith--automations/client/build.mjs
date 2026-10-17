import { fileURLToPath } from 'node:url'
import { build } from 'vite'

await build({
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url))
})
process.exit(0)
