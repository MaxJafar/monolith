import { findProjectRoot } from '@lifeforge/configs/node'

import '../loadEnv'

export const PORT = process.env.PORT || 3636

export const ROOT_DIR = findProjectRoot()
