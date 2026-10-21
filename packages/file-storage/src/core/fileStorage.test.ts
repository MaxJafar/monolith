// SPDX-License-Identifier: 0BSD
import { createReadStream } from 'node:fs'
import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { memoryIndex, readStream, sandbox } from '../testing'
import { fileReferenceSchema } from './contract/fileReference'
import { FileStorage } from './fileStorage'
import { LocalStorageProvider } from './providers/local'
import type { StagedFile } from './types'

let area: Awaited<ReturnType<typeof sandbox>>,
  storage: FileStorage,
  provider: LocalStorageProvider
beforeEach(async () => {
  area = await sandbox()
  provider = new LocalStorageProvider(join(area.root, 'objects'))
  storage = new FileStorage(provider, memoryIndex(), 'notes')
})
afterEach(async () => {
  await area.dispose()
})
const upload = (text: string) => ({
  buffer: Buffer.from(text),
  originalName: 'note.txt',
  mimeType: 'text/plain'
})

it('supports create, keep, replace and remove while preserving the public reference contract', async () => {
  const first = (await storage.save({ file: upload('first') }))!
  expect(fileReferenceSchema.parse(first)).toEqual(first)
  for (const file of ['keep', null, undefined] as const)
    expect(await storage.save({ file, currentKey: first.key })).toEqual(first)
  const second = (await storage.save({
    file: upload('second'),
    currentKey: first.key
  }))!
  expect(await storage.get(first.key)).toBeNull()
  expect(await storage.getReference(first.key)).toBeNull()
  expect(
    (await readStream((await storage.get(second.key))!.stream)).toString()
  ).toBe('second')
  expect(
    await storage.save({ file: 'removed', currentKey: second.key })
  ).toBeNull()
  expect(await storage.get(second.key)).toBeNull()
})
it('rejects cross-module and malformed keys without forwarding them to the provider', async () => {
  const get = vi.spyOn(provider, 'get'),
    remove = vi.spyOn(provider, 'delete')
  for (const key of [
    'wallet/a.txt',
    'notes/../a.txt',
    'notes//a.txt',
    'notes/a.txt:stream'
  ]) {
    expect(await storage.get(key)).toBeNull()
    expect(await storage.getReference(key)).toBeNull()
    await storage.delete(key)
  }
  expect(get).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
})
it('generates deduplicated previews and ignores invalid dimensions without losing the original', async () => {
  const image = await sharp({
    create: { width: 40, height: 20, channels: 3, background: '#496860' }
  })
    .png()
    .toBuffer()
  const result = (await storage.save({
    file: { buffer: image, originalName: 'cover.png', mimeType: 'image/png' },
    thumbs: ['16x0', '16x0', 'invalid']
  }))!
  expect(result.thumbs).toHaveLength(1)
  expect(result.thumbs[0]).toMatchObject({ width: 16, height: 8, size: '16x0' })
  const preview = await storage.get(result.key, { thumb: '16x0' })
  expect(
    (await sharp(await readStream(preview!.stream)).metadata()).width
  ).toBe(16)
  expect(await readStream((await storage.get(result.key))!.stream)).toEqual(
    image
  )
})
it('commits a staged source before removing its temporary file', async () => {
  const path = join(area.root, 'staged.txt'),
    content = Buffer.from('staged')
  await writeFile(path, content)
  const staged: StagedFile = {
    __staged: true,
    path,
    size: content.length,
    originalName: 'staged.txt',
    mimeType: 'text/plain',
    read: async () => content,
    stream: () => createReadStream(path)
  }
  const reference = (await storage.save({ file: staged }))!
  expect(await readStream((await storage.get(reference.key))!.stream)).toEqual(
    content
  )
  await expect(access(path)).rejects.toThrow()
})
it('uses MIME fallbacks and avoids raster processing for SVG documents', async () => {
  const image = (await storage.save({
    file: {
      buffer: Buffer.from('data'),
      originalName: 'no-extension',
      mimeType: 'image/png'
    }
  }))!
  expect(image.key).toMatch(/\.png$/)
  const other = (await storage.save({
    file: {
      buffer: Buffer.from('data'),
      originalName: 'no-extension',
      mimeType: 'x/unknown-monolith'
    }
  }))!
  expect(other.key).toMatch(/\.bin$/)
  const vector = (await storage.save({
    file: {
      buffer: Buffer.from('<svg/>'),
      originalName: 'icon.svg',
      mimeType: 'image/svg+xml'
    },
    thumbs: ['8x8']
  }))!
  expect(vector.thumbs).toEqual([])
})
