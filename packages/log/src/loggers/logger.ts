// SPDX-License-Identifier: 0BSD
import { stripVTControlCharacters } from 'node:util'
import pino from 'pino'
import pretty from 'pino-pretty'

import { LOG_LEVELS, getConfig, isLogLevel } from '../utils/config'
import type { LogLevel, LoggerOptions } from '../utils/config'
import { getFileStream } from '../utils/fileTransport'

type WriteMessage = (message?: string, meta?: object) => void
export type Logger = Record<LogLevel, WriteMessage> & {
  instance: pino.Logger
  readonly level: LogLevel
  setLevel(level: LogLevel): void
  child(bindings: object): Logger
}

function facade(engine: pino.Logger): Logger {
  const methods = Object.fromEntries(
    LOG_LEVELS.map(level => [
      level,
      (message?: string, metadata?: object) => {
        if (message === undefined || !engine.isLevelEnabled(level)) return
        engine[level](metadata ?? {}, stripVTControlCharacters(message))
      }
    ])
  ) as Record<LogLevel, WriteMessage>
  return {
    ...methods,
    instance: engine,
    get level() {
      return engine.level as LogLevel
    },
    setLevel(level) {
      if (!isLogLevel(level)) throw new TypeError('Unsupported log level')
      engine.level = level
    },
    child: bindings => facade(engine.child(bindings))
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const { name, file, pretty: readable = true } = options
  const level = options.level ?? getConfig().level
  if (!isLogLevel(level)) throw new TypeError('Unsupported log level')
  const consoleOutput = readable
    ? pretty({
        sync: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
        colorize: process.stdout.isTTY === true,
        messageFormat: '[{name}] {msg}'
      })
    : process.stdout
  const destinations: pino.StreamEntry[] = [
    { stream: consoleOutput, level: 'debug' }
  ]
  if (file?.enabled !== false)
    destinations.push({ stream: getFileStream(file), level: 'debug' })
  const engine = pino(
    {
      name,
      level,
      serializers: { err: pino.stdSerializers.err },
      timestamp: pino.stdTimeFunctions.isoTime
    },
    pino.multistream(destinations)
  )
  return facade(engine)
}
