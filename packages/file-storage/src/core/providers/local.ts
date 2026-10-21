// SPDX-License-Identifier: 0BSD
import mime from 'mime-types'
import { randomUUID } from 'node:crypto'
import { constants, createWriteStream, promises as fs } from 'node:fs'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  resolve
} from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { findProjectRoot } from '@monolith/configs/node'

import type { FileStream, StorageProvider } from './types'

const absent = (error: unknown) =>
  ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException)?.code ?? '')
async function inspect(path: string) {
  try {
    return await fs.lstat(path)
  } catch (error) {
    if (absent(error)) return null
    throw error
  }
}
export class LocalStorageProvider implements StorageProvider {
  private readonly directory: string
  constructor(directory = './storage') {
    this.directory = resolve(
      isAbsolute(directory) ? directory : join(findProjectRoot(), directory)
    )
  }
  private async target(key: string, writable = false): Promise<string | null> {
    const pieces = key.split('/')
    if (
      isAbsolute(key) ||
      /[\\:\0]/.test(key) ||
      pieces.some(part => !part || part === '.' || part === '..')
    )
      return null
    if (writable) await fs.mkdir(this.directory, { recursive: true })
    let directory = this.directory
    for (const piece of pieces.slice(0, -1)) {
      directory = join(directory, piece)
      let information = await inspect(directory)
      if (!information && writable) {
        await fs.mkdir(directory).catch(error => {
          if (error.code !== 'EEXIST') throw error
        })
        information = await inspect(directory)
      }
      if (!information?.isDirectory() || information.isSymbolicLink())
        return null
    }
    const target = join(directory, pieces[pieces.length - 1]!)
    const information = await inspect(target)
    if (information && (!information.isFile() || information.isSymbolicLink()))
      return null
    return target
  }
  async save(key: string, input: Readable): Promise<void> {
    const target = await this.target(key, true)
    if (!target) throw new Error('Invalid storage key: path traversal detected')
    const pending = join(dirname(target), '.pending-' + randomUUID())
    try {
      await pipeline(
        input,
        createWriteStream(pending, { flags: 'wx', mode: 0o600 })
      )
      await fs.rename(pending, target)
    } finally {
      await fs.unlink(pending).catch(error => {
        if (!absent(error)) throw error
      })
    }
  }
  async get(key: string): Promise<FileStream | null> {
    const target = await this.target(key)
    if (!target) return null
    try {
      const descriptor = await fs.open(
        target,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)
      )
      try {
        const info = await descriptor.stat()
        if (info.isFile())
          return {
            stream: descriptor.createReadStream({ autoClose: true }),
            size: info.size,
            mimeType: mime.lookup(target) || 'application/octet-stream'
          }
      } catch (error) {
        await descriptor.close()
        throw error
      }
      await descriptor.close()
      return null
    } catch (error) {
      if (absent(error) || (error as NodeJS.ErrnoException).code === 'ELOOP')
        return null
      throw error
    }
  }
  async delete(key: string): Promise<void> {
    const target = await this.target(key)
    if (!target) return
    const folder = dirname(target)
    const filename = basename(target)
    const prefix = basename(target, extname(target)) + '-thumb-'
    try {
      const siblings = await fs.readdir(folder, { withFileTypes: true })
      for (const entry of siblings) {
        if (
          !entry.isFile() ||
          (entry.name !== filename && !entry.name.startsWith(prefix))
        )
          continue
        await fs.unlink(join(folder, entry.name)).catch(error => {
          if (!absent(error)) throw error
        })
      }
    } catch (error) {
      if (!absent(error)) throw error
    }
  }
}
