import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LocalStorageProvider } from './local'

let directory: string
let provider: LocalStorageProvider
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'monolith-storage-'))
  provider = new LocalStorageProvider(path.join(directory, 'objects'))
})
afterEach(async () => fs.rm(directory, { recursive: true, force: true }))

describe('atomic local object replacement', () => {
  it('retains the previous object and removes staging data when a stream fails', async () => {
    await provider.save('module/file.txt', Readable.from('original'))
    const broken = Readable.from(
      (async function* () {
        yield 'partial'
        throw new Error('stream failed')
      })()
    )
    await expect(provider.save('module/file.txt', broken)).rejects.toThrow(
      'stream failed'
    )
    expect(
      await fs.readFile(path.join(directory, 'objects/module/file.txt'), 'utf8')
    ).toBe('original')
    expect(await fs.readdir(path.join(directory, 'objects/module'))).toEqual([
      'file.txt'
    ])
  })

  it('does not follow an out-of-root directory junction on read, save or delete', async () => {
    const outside = path.join(directory, 'outside')
    await fs.mkdir(outside)
    await fs.writeFile(path.join(outside, 'keep.txt'), 'keep')
    await fs.mkdir(path.join(directory, 'objects'))
    await fs.symlink(outside, path.join(directory, 'objects/link'), 'junction')
    expect(await provider.get('link/keep.txt')).toBeNull()
    await expect(
      provider.save('link/keep.txt', Readable.from('replace'))
    ).rejects.toThrow('path traversal')
    await provider.delete('link/keep.txt')
    expect(await fs.readFile(path.join(outside, 'keep.txt'), 'utf8')).toBe(
      'keep'
    )
  })

  it('rejects absolute, empty and alternate-stream keys', async () => {
    for (const key of [
      '',
      '/outside',
      'C:/outside',
      'file.txt:stream',
      'nested/../file'
    ]) {
      expect(await provider.get(key)).toBeNull()
      await expect(provider.save(key, Readable.from('x'))).rejects.toThrow(
        'path traversal'
      )
    }
  })
})
