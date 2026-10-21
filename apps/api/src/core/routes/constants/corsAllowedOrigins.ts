// SPDX-License-Identifier: 0BSD
import '../../../loadEnv'
import { coreLogger } from '../../functions/logging'

export const CORS_ALLOWED_ORIGINS = [
  ...new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  )
]
coreLogger.info('Configured browser origins', {
  count: CORS_ALLOWED_ORIGINS.length
})
