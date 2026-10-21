// SPDX-License-Identifier: 0BSD
import { randomUUID } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join } from 'node:path'

export function objectFile(
  filename: string,
  fallback?: () => Record<string, unknown>
): Record<string, unknown> {
  if (!existsSync(filename) && fallback) return fallback()
  const value: unknown = JSON.parse(readFileSync(filename, 'utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected a JSON object in ' + filename)
  return value as Record<string, unknown>
}
export function replaceJSON(filename: string, value: unknown) {
  const temporary = join(
    dirname(filename),
    '.' + basename(filename) + '.' + randomUUID() + '.tmp'
  )
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {
      flag: 'wx',
      mode: existsSync(filename) ? statSync(filename).mode & 0o777 : 0o666
    })
    renameSync(temporary, filename)
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}
