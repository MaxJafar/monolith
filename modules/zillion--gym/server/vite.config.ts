import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineModuleServerConfig } from '@lifeforge/configs/vite'

export default defineModuleServerConfig(dirname(fileURLToPath(import.meta.url)))
