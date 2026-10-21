// SPDX-License-Identifier: 0BSD
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { beforeEach, expect, it, vi } from 'vitest'

import { readStream } from '../../testing'
import { S3StorageProvider } from './s3'

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  uploaded: vi.fn(),
  done: vi.fn()
}))
vi.mock('@aws-sdk/client-s3', async original => ({
  ...(await original<typeof import('@aws-sdk/client-s3')>()),
  S3Client: class {
    send = mock.send
  }
}))
vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: class {
    constructor(options: unknown) {
      mock.uploaded(options)
    }
    done = mock.done
  }
}))
beforeEach(() => {
  mock.send.mockReset()
  mock.uploaded.mockReset()
  mock.done.mockReset().mockResolvedValue(undefined)
})
const provider = () => new S3StorageProvider({ bucket: 'monolith-test' })

it('streams uploads with metadata and lets the SDK abort unfinished multipart uploads', async () => {
  const source = Readable.from('content')
  await provider().save('notes/file.txt', source, { mimeType: 'text/plain' })
  expect(mock.uploaded).toHaveBeenCalledWith(
    expect.objectContaining({
      leavePartsOnError: false,
      params: {
        Bucket: 'monolith-test',
        Key: 'notes/file.txt',
        Body: source,
        ContentType: 'text/plain'
      }
    })
  )
  expect(mock.done).toHaveBeenCalledOnce()
  mock.done.mockRejectedValueOnce(new Error('upload offline'))
  await expect(
    provider().save('notes/file.bin', Readable.from('x'))
  ).rejects.toThrow('upload offline')
})
it('accepts Node and SDK web streams and retains response metadata', async () => {
  mock.send
    .mockResolvedValueOnce({
      Body: Readable.from('node'),
      ContentLength: 4,
      ContentType: 'text/plain'
    })
    .mockResolvedValueOnce({
      Body: {
        transformToWebStream: () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('web'))
              controller.close()
            }
          })
      }
    })
  const first = (await provider().get('notes/a.txt'))!
  expect(first).toMatchObject({ size: 4, mimeType: 'text/plain' })
  expect((await readStream(first.stream)).toString()).toBe('node')
  const second = (await provider().get('notes/b.png'))!
  expect(second).toMatchObject({ size: 0, mimeType: 'image/png' })
  expect((await readStream(second.stream)).toString()).toBe('web')
  expect(mock.send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand)
})
it('distinguishes missing content from authorization and network failures', async () => {
  mock.send
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce({ name: 'NoSuchKey' })
    .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } })
    .mockRejectedValueOnce(new Error('access denied'))
  const storage = provider()
  expect(await storage.get('notes/empty')).toBeNull()
  expect(await storage.get('notes/missing')).toBeNull()
  expect(await storage.get('notes/missing')).toBeNull()
  await expect(storage.get('notes/private')).rejects.toThrow('access denied')
})
it('deletes all pages of thumbnails and excludes unrelated objects from the listing', async () => {
  mock.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      Contents: [
        { Key: 'v2.notes/cover-thumb-16x0.png' },
        { Key: 'other/file' }
      ],
      NextContinuationToken: 'page2',
      IsTruncated: true
    })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({
      Contents: [{ Key: 'v2.notes/cover-thumb-32x0.png' }]
    })
    .mockResolvedValueOnce({})
  await provider().delete('v2.notes/cover.png')
  const commands = mock.send.mock.calls.map(([command]) => command)
  expect(commands[0]).toBeInstanceOf(DeleteObjectCommand)
  expect(
    commands
      .filter(command => command instanceof ListObjectsV2Command)
      .map(command => command.input.ContinuationToken)
  ).toEqual([undefined, 'page2'])
  expect(
    commands
      .filter(command => command instanceof DeleteObjectsCommand)
      .flatMap(command => command.input.Delete?.Objects ?? [])
  ).toEqual([
    { Key: 'v2.notes/cover-thumb-16x0.png' },
    { Key: 'v2.notes/cover-thumb-32x0.png' }
  ])
})
it('reports partial deletion and invalid pagination so callers keep their metadata', async () => {
  mock.send
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Contents: [{ Key: 'notes/a-thumb-8x8.png' }] })
    .mockResolvedValueOnce({ Errors: [{ Code: 'AccessDenied' }] })
  await expect(provider().delete('notes/a.png')).rejects.toThrow('1 thumbnail')
  mock.send
    .mockReset()
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ Contents: [], IsTruncated: true })
  await expect(provider().delete('notes/a.png')).rejects.toThrow('incomplete')
  mock.send
    .mockReset()
    .mockResolvedValueOnce({})
    .mockResolvedValue({ Contents: [], NextContinuationToken: 'same' })
  await expect(provider().delete('notes/a.png')).rejects.toThrow('repeated')
})
it('rejects invalid connection settings before making an SDK request', () => {
  expect(() => new S3StorageProvider({ bucket: ' ' })).toThrow('bucket')
  expect(
    () => new S3StorageProvider({ bucket: 'fixture', accessKeyId: 'test-only' })
  ).toThrow('both key and secret')
  expect(mock.send).not.toHaveBeenCalled()
})
