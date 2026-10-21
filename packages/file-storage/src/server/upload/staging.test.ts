// SPDX-License-Identifier: 0BSD
import { access, readFile, readdir, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import { readStream, sandbox } from '../../testing'

let area: Awaited<ReturnType<typeof sandbox>>,
  staging: typeof import('./staging')
beforeAll(async () => {
  area = await sandbox()
  vi.stubEnv('FILE_STORAGE_LOCAL_PATH', join(area.root, 'uploads'))
  vi.resetModules()
  staging = await import('./staging')
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await area.dispose()
})

it('detects image bytes, counts the entire stream and exposes repeatable reads', async () => {
  const image = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#496860' }
  })
    .png()
    .toBuffer()
  const result = await staging.stageStream(
    Readable.from([image.subarray(0, 12), image.subarray(12)]),
    'misleading.txt',
    'text/plain'
  )
  expect(result).toMatchObject({
    __staged: true,
    mimeType: 'image/png',
    size: image.length,
    originalName: 'misleading.txt'
  })
  expect(await result.read()).toEqual(image)
  expect(await readStream(result.stream())).toEqual(image)
  await staging.releaseStaged(result)
  await staging.releaseStaged(result)
  await expect(access(result.path)).rejects.toThrow()
})
it('retains non-image and empty content with the supplied MIME fallback', async () => {
  for (const content of [Buffer.from('plain text'), Buffer.alloc(0)]) {
    const result = await staging.stageStream(
      Readable.from(content),
      'note.txt',
      'text/plain'
    )
    expect(result.size).toBe(content.length)
    expect(result.mimeType).toBe('text/plain')
    expect(await result.read()).toEqual(content)
    await staging.releaseStaged(result)
  }
})
it('propagates an interrupted source and removes its partial staging file', async () => {
  const before = await readdir(staging.STAGING_DIR)
  const broken = Readable.from(
    (async function* () {
      yield Buffer.alloc(6000, 65)
      await new Promise(resolve => setImmediate(resolve))
      throw new Error('upload interrupted')
    })()
  )
  await expect(
    staging.stageStream(broken, 'partial.bin', 'application/octet-stream')
  ).rejects.toThrow('upload interrupted')
  expect(await readdir(staging.STAGING_DIR)).toEqual(before)
})
it('reclaims expired owned uploads while leaving fresh and unrelated files untouched', async () => {
  const old = await staging.stageStream(
    Readable.from('old'),
    'old.txt',
    'text/plain'
  )
  const fresh = await staging.stageStream(
    Readable.from('fresh'),
    'fresh.txt',
    'text/plain'
  )
  const unrelated = join(staging.STAGING_DIR, 'keep-this.txt')
  const outside = join(area.root, 'outside.txt')
  await writeFile(unrelated, 'keep')
  await writeFile(outside, 'outside')
  await utimes(old.path, new Date(0), new Date(0))
  await utimes(unrelated, new Date(0), new Date(0))
  await expect(
    staging.releaseStaged({ ...old, path: outside })
  ).rejects.toThrow('outside')
  await staging.sweepStagingDir()
  await expect(access(old.path)).rejects.toThrow()
  expect(await fresh.read()).toEqual(Buffer.from('fresh'))
  expect(await readFile(unrelated, 'utf8')).toBe('keep')
  expect(await readFile(outside, 'utf8')).toBe('outside')
})
