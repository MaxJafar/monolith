// SPDX-License-Identifier: 0BSD
import { Readable } from 'node:stream'
import { expect, it } from 'vitest'

import { readStream, sandbox } from '../testing'
import { createProvider } from './createProvider'
import { LocalStorageProvider } from './providers/local'
import { S3StorageProvider } from './providers/s3'

it('uses a supplied local directory without modifying process configuration', async () => {
  const area = await sandbox()
  try {
    const provider = createProvider({ FILE_STORAGE_LOCAL_PATH: area.root })
    expect(provider).toBeInstanceOf(LocalStorageProvider)
    await provider.save('notes/example.txt', Readable.from('content'))
    expect(
      (
        await readStream((await provider.get('notes/example.txt'))!.stream)
      ).toString()
    ).toBe('content')
  } finally {
    await area.dispose()
  }
})
it('rejects incomplete S3 settings and unknown providers before starting an upload', () => {
  expect(() => createProvider({ FILE_STORAGE_PROVIDER: 's3' })).toThrow(
    'FILE_STORAGE_S3_BUCKET'
  )
  expect(() =>
    createProvider({
      FILE_STORAGE_PROVIDER: 's3',
      FILE_STORAGE_S3_BUCKET: 'fixture',
      FILE_STORAGE_S3_ACCESS_KEY: 'test-only'
    })
  ).toThrow('both key and secret')
  expect(() => createProvider({ FILE_STORAGE_PROVIDER: 'unexpected' })).toThrow(
    'Unsupported'
  )
  expect(
    createProvider({
      FILE_STORAGE_PROVIDER: 's3',
      FILE_STORAGE_S3_BUCKET: 'fixture'
    })
  ).toBeInstanceOf(S3StorageProvider)
})
