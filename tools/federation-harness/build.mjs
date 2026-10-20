import { fileURLToPath } from 'node:url'
import { build } from 'vite'

await build({
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
  root: fileURLToPath(new URL('../../apps/desktop', import.meta.url)),
  mode: 'remote'
})
// Federation inspects React's browser renderer to discover its exports, which
// retains a MessagePort. Exit only after Vite has finished writing all output.
process.exit(0)
