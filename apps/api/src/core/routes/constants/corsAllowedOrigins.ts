import { coreLogger } from '@functions/logging'
import chalk from 'chalk'

import '../../../loadEnv'

export const CORS_ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) || []

if (!CORS_ALLOWED_ORIGINS.length) {
  coreLogger.warn('No CORS allowed origins detected.')
} else {
  coreLogger.info(
    `Detected ${chalk.green(CORS_ALLOWED_ORIGINS.length)} CORS allowed origins`
  )
}
