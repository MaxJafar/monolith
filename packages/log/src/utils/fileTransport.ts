import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { type RotatingFileStream, createStream } from 'rotating-file-stream'

import { type FileOptions, getConfig } from './config'

const destinations = new Map<string, RotatingFileStream>()

export function getFileStream(options: FileOptions = {}): RotatingFileStream {
  const defaults = getConfig()
  const directory = resolve(options.directory || defaults.directory)
  const retention = options.retention ?? defaults.retention
  const size = options.maxSize || '10M'
  const key = JSON.stringify([directory, retention, size])
  const existing = destinations.get(key)
  if (existing && !existing.destroyed) return existing
  mkdirSync(directory, { recursive: true })
  const stream = createStream(
    (time, index) => {
      if (!time) return 'monolith.log'
      const date = new Date(time).toISOString().slice(0, 10)
      return `monolith-${date}${index ? '-' + index : ''}.log`
    },
    {
      path: directory,
      size,
      interval: '1d',
      maxFiles: retention,
      compress: 'gzip'
    }
  )
  destinations.set(key, stream)
  stream.once('close', () => {
    if (destinations.get(key) === stream) destinations.delete(key)
  })
  return stream
}

export function closeFileStream(): void {
  for (const stream of destinations.values()) stream.end()
  destinations.clear()
}
