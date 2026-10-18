import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineModuleClientConfig } from '@monolith/configs/vite'

export default defineModuleClientConfig({
  dirname: dirname(fileURLToPath(import.meta.url))
})
