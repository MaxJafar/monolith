// SPDX-License-Identifier: 0BSD
import { fileTypeStream } from 'file-type'
import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { findProjectRoot } from '@monolith/configs/node'

import type { StagedFile } from '../../core/types'

export const STAGING_DIR = resolve(
  findProjectRoot(),
  process.env.FILE_STORAGE_LOCAL_PATH || './storage',
  '.staging'
)
const active = new Set<string>()
const expiration = 6 * 60 * 60 * 1000
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException)?.code === 'ENOENT'
const ownedName =
  /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}(?:\.[a-z\d]{1,20})?$/i

export async function ensureStagingDir(): Promise<void> {
  await fs.mkdir(STAGING_DIR, { recursive: true })
  const info = await fs.lstat(STAGING_DIR)
  if (info.isSymbolicLink() || !info.isDirectory())
    throw new Error('Upload staging must be a directory')
}
export async function stageStream(
  input: Readable,
  originalName: string,
  fallbackMimeType: string
): Promise<StagedFile> {
  await ensureStagingDir()
  const extension = extname(originalName)
  const path = join(
    STAGING_DIR,
    randomUUID() + (/^\.[a-z\d]{1,20}$/i.test(extension) ? extension : '.bin')
  )
  const bytes = Readable.from(
    (async function* () {
      for await (const chunk of input)
        yield typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    })(),
    { objectMode: false }
  )
  active.add(path)
  let size = 0
  try {
    const detected = await fileTypeStream(Readable.toWeb(bytes))
    const detectedMime = (detected as { fileType?: { mime: string } }).fileType
      ?.mime
    const counted = new Transform({
      transform(chunk, _encoding, callback) {
        size += chunk.length
        callback(null, chunk)
      }
    })
    await pipeline(
      Readable.fromWeb(
        detected as unknown as Parameters<typeof Readable.fromWeb>[0]
      ),
      counted,
      createWriteStream(path, { flags: 'wx', mode: 0o600 })
    )
    return {
      __staged: true,
      originalName,
      mimeType: detectedMime || fallbackMimeType || 'application/octet-stream',
      size,
      path,
      read: () => fs.readFile(path),
      stream: () => createReadStream(path)
    }
  } catch (error) {
    bytes.destroy()
    input.destroy()
    await fs.unlink(path).catch(() => {})
    throw error
  } finally {
    active.delete(path)
  }
}
export async function releaseStaged(file: StagedFile): Promise<void> {
  const target = resolve(file.path)
  if (dirname(target) !== STAGING_DIR)
    throw new Error('Cannot release a file outside upload staging')
  try {
    const info = await fs.lstat(target)
    if (info.isFile() && !info.isSymbolicLink()) await fs.unlink(target)
  } catch (error) {
    if (!missing(error)) throw error
  }
}
export async function sweepStagingDir(): Promise<void> {
  try {
    await ensureStagingDir()
    const deadline = Date.now() - expiration
    for (const name of await fs.readdir(STAGING_DIR)) {
      if (!ownedName.test(name)) continue
      const path = join(STAGING_DIR, name)
      if (active.has(path)) continue
      try {
        const info = await fs.lstat(path)
        if (info.isFile() && !info.isSymbolicLink() && info.mtimeMs < deadline)
          await fs.unlink(path)
      } catch {
        /* A concurrent request may already have released this upload. */
      }
    }
  } catch {
    /* Background reclamation must not prevent the server from starting. */
  }
}
