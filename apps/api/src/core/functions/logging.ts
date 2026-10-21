// SPDX-License-Identifier: 0BSD
import { createLogger } from '@monolith/log'

export { LOG_LEVELS, type LogLevel } from '@monolith/log'
export const coreLogger = createLogger({ name: 'monolith-api' })
export const createServiceLogger = (service: string) =>
  coreLogger.child({ service })
