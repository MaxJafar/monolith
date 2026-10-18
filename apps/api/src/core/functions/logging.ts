import { LOG_LEVELS, type LogLevel, createLogger } from '@monolith/log'

export const coreLogger = createLogger({ name: 'Server Core' })

export function createServiceLogger(serviceName: string) {
  return coreLogger.child({ service: serviceName })
}

export { LOG_LEVELS, type LogLevel }
