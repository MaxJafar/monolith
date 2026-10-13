import dotenv from 'dotenv'
import path from 'node:path'

import { findProjectRoot } from '@lifeforge/configs/node'

// Load before modules that capture environment settings during evaluation.
dotenv.config({
  path: path.join(findProjectRoot(), 'env/.env.local'),
  quiet: true
})
