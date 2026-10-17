import { defineModuleServerConfig } from '@monolith/configs/vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export default defineModuleServerConfig(dirname(fileURLToPath(import.meta.url)))
