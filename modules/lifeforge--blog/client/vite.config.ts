import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineModuleClientConfig } from '@lifeforge/configs/vite'

export default defineModuleClientConfig({
  dirname: dirname(fileURLToPath(import.meta.url))
})
