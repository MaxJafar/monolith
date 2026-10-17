import { stripVTControlCharacters } from 'node:util'
import pino from 'pino'
import pretty from 'pino-pretty'

import { type LogLevel, type LoggerOptions, getConfig } from '../utils/config'
import { getFileStream } from '../utils/fileTransport'

export interface Logger {
  instance: pino.Logger
  readonly level: LogLevel
  setLevel(level: LogLevel): void
  debug(message?: string, meta?: object): void
  info(message?: string, meta?: object): void
  warn(message?: string, meta?: object): void
  error(message?: string, meta?: object): void
  fatal(message?: string, meta?: object): void
  child(bindings: object): Logger
}

class ApplicationLogger implements Logger {
  constructor(readonly instance: pino.Logger) {}
  get level() {
    return this.instance.level as LogLevel
  }
  setLevel(level: LogLevel) {
    this.instance.level = level
  }
  private write(level: LogLevel, message?: string, metadata: object = {}) {
    if (message !== undefined)
      this.instance[level](metadata, stripVTControlCharacters(message))
  }
  debug(message?: string, meta?: object) {
    this.write('debug', message, meta)
  }
  info(message?: string, meta?: object) {
    this.write('info', message, meta)
  }
  warn(message?: string, meta?: object) {
    this.write('warn', message, meta)
  }
  error(message?: string, meta?: object) {
    this.write('error', message, meta)
  }
  fatal(message?: string, meta?: object) {
    this.write('fatal', message, meta)
  }
  child(bindings: object): Logger {
    return new ApplicationLogger(this.instance.child(bindings))
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const outputs: pino.StreamEntry[] = [
    {
      level: 'trace',
      stream:
        options.pretty === false
          ? process.stdout
          : pretty({
              colorize: Boolean(process.stdout.isTTY),
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat: '[{name}] {msg}',
              sync: true
            })
    }
  ]
  if (options.file?.enabled !== false)
    outputs.push({ level: 'trace', stream: getFileStream(options.file) })
  return new ApplicationLogger(
    pino(
      {
        name: options.name,
        level: options.level || getConfig().level,
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: { err: pino.stdSerializers.err }
      },
      pino.multistream(outputs)
    )
  )
}
