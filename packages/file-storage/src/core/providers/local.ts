import mime from 'mime-types'
import { randomUUID } from 'node:crypto'
import { constants, createWriteStream, promises as fs } from 'node:fs'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { findProjectRoot } from '@monolith/configs/node'

import type { StorageProvider } from './types'

const missing = (error: unknown) =>
  error !== null &&
  typeof error === 'object' &&
  'code' in error &&
  (error.code === 'ENOENT' || error.code === 'ENOTDIR')

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string

  constructor(directory = './storage') {
    this.root = path.resolve(
      path.isAbsolute(directory)
        ? directory
        : path.join(findProjectRoot(), directory)
    )
  }

  private keyParts(key: string): string[] | null {
    if (!key || /[\\:\0]/.test(key) || path.isAbsolute(key)) return null

    const parts = key.split('/')

    return parts.every(part => part && part !== '.' && part !== '..')
      ? parts
      : null
  }

  /** Refuse links below the configured root before accessing an object. */
  private async locate(key: string, create: boolean): Promise<string | null> {
    const parts = this.keyParts(key)

    if (!parts) return null
    if (create) await fs.mkdir(this.root, { recursive: true })
    let current = this.root

    for (let index = 0; index < parts.length; index++) {
      current = path.join(current, parts[index]!)
      const directory = index < parts.length - 1

      try {
        const info = await fs.lstat(current)

        if (info.isSymbolicLink() || (directory && !info.isDirectory()))
          return null
      } catch (error) {
        if (!missing(error)) throw error
        if (!create && directory) return null

        if (create && directory) {
          try {
            await fs.mkdir(current)
          } catch (creationError) {
            if ((creationError as NodeJS.ErrnoException).code !== 'EEXIST')
              throw creationError
          }

          const created = await fs.lstat(current)

          if (created.isSymbolicLink() || !created.isDirectory()) return null
        }
      }
    }

    return current
  }

  async save(key: string, data: Readable) {
    const target = await this.locate(key, true)

    if (!target) throw new Error('Invalid storage key: path traversal detected')

    const staging = path.join(
      path.dirname(target),
      '.' + randomUUID() + '.pending'
    )

    try {
      await pipeline(
        data,
        createWriteStream(staging, { flags: 'wx', mode: 0o600 })
      )
      await fs.rename(staging, target)
    } finally {
      await fs.unlink(staging).catch(error => {
        if (!missing(error)) throw error
      })
    }
  }

  async get(key: string) {
    const target = await this.locate(key, false)

    if (!target) return null

    try {
      const handle = await fs.open(
        target,
        constants.O_RDONLY |
          ((constants as Partial<typeof constants>).O_NOFOLLOW ?? 0)
      )

      try {
        const info = await handle.stat()

        if (!info.isFile()) {
          await handle.close()

          return null
        }

        return {
          stream: handle.createReadStream({ autoClose: true }),
          size: info.size,
          mimeType: mime.lookup(target) || 'application/octet-stream'
        }
      } catch (error) {
        await handle.close()
        throw error
      }
    } catch (error) {
      if (missing(error) || (error as NodeJS.ErrnoException).code === 'ELOOP')
        return null
      throw error
    }
  }

  async delete(key: string) {
    const target = await this.locate(key, false)

    if (!target) return

    const directory = path.dirname(target)
    const prefix = path.basename(target, path.extname(target)) + '-thumb-'

    let siblings: string[]

    try {
      siblings = await fs.readdir(directory)
    } catch (error) {
      if (missing(error)) return
      throw error
    }

    const candidates = [
      path.basename(target),
      ...siblings.filter(name => name.startsWith(prefix))
    ]

    for (const name of candidates) {
      const candidate = path.join(directory, name)

      try {
        const info = await fs.lstat(candidate)

        if (info.isFile() && !info.isSymbolicLink()) await fs.unlink(candidate)
      } catch (error) {
        if (!missing(error)) throw error
      }
    }
  }
}
