// SPDX-License-Identifier: 0BSD
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { readStream, sandbox } from '../../testing'
import { LocalStorageProvider } from './local'

let area: Awaited<ReturnType<typeof sandbox>>, provider: LocalStorageProvider
beforeEach(async () => {
  area = await sandbox()
  provider = new LocalStorageProvider(area.root)
})
afterEach(async () => {
  await area.dispose()
})

it('round-trips binary bytes under a nested namespace with file metadata', async () => {
  const content = Buffer.from([0, 1, 127, 255])
  await provider.save('notes/deep/sample.bin', Readable.from(content))
  const result = await provider.get('notes/deep/sample.bin')
  expect(result).toMatchObject({
    size: 4,
    mimeType: 'application/octet-stream'
  })
  expect(await readStream(result!.stream)).toEqual(content)
  expect(await provider.get('notes/deep/missing.bin')).toBeNull()
  expect(await provider.get('notes/deep')).toBeNull()
})
it('deletes only an object and its previews, retaining similarly named originals', async () => {
  await mkdir(join(area.root, 'notes'))
  for (const name of [
    'photo.png',
    'photo-thumb-32x32.png',
    'photo2.png',
    'photograph.png'
  ])
    await writeFile(join(area.root, 'notes', name), name)
  await provider.delete('notes/photo.png')
  await provider.delete('notes/photo.png')
  expect((await readdir(join(area.root, 'notes'))).sort()).toEqual([
    'photo2.png',
    'photograph.png'
  ])
})
it('rejects traversal, alternate streams and malformed keys before touching stored files', async () => {
  await writeFile(join(area.root, 'retained.txt'), 'keep')
  for (const key of [
    '../retained.txt',
    'notes/../../retained.txt',
    'notes//file',
    '/absolute',
    'C:/outside',
    'file:stream'
  ]) {
    expect(await provider.get(key)).toBeNull()
    await expect(provider.save(key, Readable.from('replace'))).rejects.toThrow(
      'path traversal'
    )
    await provider.delete(key)
  }
  expect(await readFile(join(area.root, 'retained.txt'), 'utf8')).toBe('keep')
})
