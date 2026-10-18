import { randomUUID } from 'node:crypto'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { basename, resolve } from 'node:path'

import type { ITempFileManager } from '@monolith/server-utils'

export default class TempFileManager implements ITempFileManager {
  private readonly filePath: string
  constructor(
    fileName: `${string}.json`,
    jsonType: 'object' | 'array' = 'array'
  ) {
    if (
      !fileName.endsWith('.json') ||
      basename(fileName) !== fileName ||
      /[\\/:\0]/.test(fileName)
    )
      throw new Error('Temp file name must be a plain .json filename')
    const directory = resolve('.temp')
    mkdirSync(directory, { recursive: true })
    this.filePath = resolve(directory, fileName)
    try {
      const handle = openSync(this.filePath, 'wx', 0o600)
      try {
        writeFileSync(handle, jsonType === 'array' ? '[]' : '{}')
      } finally {
        closeSync(handle)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  read<T>(): T {
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf8')) as T
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new Error('Invalid JSON in temp file', { cause: error })
      throw error
    }
  }
  write(data: Buffer | string): void {
    const pending = this.filePath + '.' + randomUUID() + '.pending'
    try {
      writeFileSync(pending, data, { flag: 'wx', mode: 0o600 })
      renameSync(pending, this.filePath)
    } finally {
      rmSync(pending, { force: true })
    }
  }
}
