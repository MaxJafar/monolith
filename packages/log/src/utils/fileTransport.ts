// SPDX-License-Identifier: 0BSD
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { type RotatingFileStream, createStream } from 'rotating-file-stream'

import { type FileOptions, getConfig, positiveInteger } from './config'

type Destination = {
  path: string
  size: string
  maxFiles: number
}
type OpenFile = { settings: Destination; stream: RotatingFileStream }
const openFiles = new Set<OpenFile>()

function settingsFor(options: FileOptions): Destination {
  const defaults = getConfig()
  return {
    path: resolve(options.directory || defaults.directory),
    size: options.maxSize || '10M',
    maxFiles: positiveInteger(options.retention, defaults.retention)
  }
}
function archiveName(date: Date | number, sequence?: number): string {
  if (!date) return 'monolith.log'
  const day = new Date(date).toISOString().substring(0, 10)
  return ['monolith', day, ...(sequence ? [sequence] : [])].join('-') + '.log'
}
function usable(file: OpenFile) {
  return !file.stream.destroyed && !file.stream.writableEnded
}
export function getFileStream(options: FileOptions = {}): RotatingFileStream {
  const settings = settingsFor(options)
  for (const candidate of openFiles) {
    if (!usable(candidate)) {
      openFiles.delete(candidate)
      continue
    }
    if (
      Object.keys(settings).every(key => {
        const field = key as keyof Destination
        return candidate.settings[field] === settings[field]
      })
    )
      return candidate.stream
  }
  mkdirSync(settings.path, { recursive: true })
  const stream = createStream(archiveName, {
    ...settings,
    interval: '1d',
    compress: 'gzip'
  })
  const opened = { settings, stream }
  openFiles.add(opened)
  const release = () => {
    openFiles.delete(opened)
  }
  stream.once('finish', release)
  stream.once('close', release)
  return stream
}
export function closeFileStream(): void {
  const closing = Array.from(openFiles)
  openFiles.clear()
  for (const { stream } of closing) {
    if (!stream.destroyed && !stream.writableEnded) stream.end()
  }
}
