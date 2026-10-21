// SPDX-License-Identifier: 0BSD
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]
export type FileOptions = {
  enabled?: boolean
  directory?: string
  maxSize?: string
  retention?: number
}
export type LoggerOptions = {
  name: string
  level?: LogLevel
  pretty?: boolean
  file?: FileOptions
}
export type LogConfig = {
  level: LogLevel
  directory: string
  retention: number
  isProduction: boolean
}

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && LOG_LEVELS.some(level => level === value)
}
export function positiveInteger(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}
export function getConfig(): LogConfig {
  const environment = process.env
  const candidate = environment.LOG_LEVEL?.trim().toLowerCase()
  return {
    isProduction: environment.NODE_ENV === 'production',
    retention: positiveInteger(environment.LOG_RETENTION_DAYS, 7),
    directory: environment.LOG_DIR?.trim() || 'logs',
    level: isLogLevel(candidate) ? candidate : 'info'
  }
}
