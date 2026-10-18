import path from 'node:path'

import { prepare } from './preview-release.mjs'

await prepare(
  path.resolve(import.meta.dirname, '..'),
  process.argv[2],
  process.argv[3],
  { automatic: true }
)
