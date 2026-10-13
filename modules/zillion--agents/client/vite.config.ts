import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineModuleClientConfig } from '@lifeforge/configs/vite'

const dir = dirname(fileURLToPath(import.meta.url))
export default defineModuleClientConfig({ dirname: dir }, { root: dir })
