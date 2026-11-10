import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineModuleClientConfig } from '@monolith/configs/vite'

const moduleClientDir = dirname(fileURLToPath(import.meta.url))

export default defineModuleClientConfig(
  { dirname: moduleClientDir },
  { root: moduleClientDir }
)
