// SPDX-License-Identifier: 0BSD
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import mime from 'mime-types'
import { posix } from 'node:path'
import { Readable } from 'node:stream'

import type { FileStream, ProviderSaveOptions, StorageProvider } from './types'

export interface S3ProviderConfig {
  bucket: string
  endpoint?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  forcePathStyle?: boolean
}
const contentType = (key: string) =>
  mime.lookup(key) || 'application/octet-stream'
export class S3StorageProvider implements StorageProvider {
  private readonly connection: S3Client
  private readonly bucket: string
  constructor(options: S3ProviderConfig) {
    const { bucket, accessKeyId, secretAccessKey, ...settings } = options
    if (!bucket.trim()) throw new Error('An object-storage bucket is required')
    if (!!accessKeyId !== !!secretAccessKey)
      throw new Error(
        'Object-storage credentials must include both key and secret'
      )
    this.bucket = bucket
    this.connection = new S3Client({
      ...settings,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {})
    })
  }
  private address(key: string) {
    return { Bucket: this.bucket, Key: key }
  }
  async save(
    key: string,
    source: Readable,
    options?: ProviderSaveOptions
  ): Promise<void> {
    const transfer = new Upload({
      client: this.connection,
      params: {
        ...this.address(key),
        Body: source,
        ContentType: options?.mimeType ?? contentType(key)
      },
      leavePartsOnError: false
    })
    await transfer.done()
  }
  async get(key: string): Promise<FileStream | null> {
    try {
      const result = await this.connection.send(
        new GetObjectCommand(this.address(key))
      )
      if (!result.Body) return null
      const body = result.Body
      return {
        stream:
          body instanceof Readable
            ? body
            : Readable.fromWeb(
                body.transformToWebStream() as Parameters<
                  typeof Readable.fromWeb
                >[0]
              ),
        size: result.ContentLength ?? 0,
        mimeType: result.ContentType ?? contentType(key)
      }
    } catch (error) {
      const failure = error as {
        name?: string
        $metadata?: { httpStatusCode?: number }
      } | null
      if (
        failure?.name === 'NoSuchKey' ||
        failure?.$metadata?.httpStatusCode === 404
      )
        return null
      throw error
    }
  }
  private async *previews(key: string): AsyncGenerator<Array<{ Key: string }>> {
    const extension = posix.extname(key)
    const prefix =
      (extension ? key.substring(0, key.length - extension.length) : key) +
      '-thumb-'
    const seen = new Set<string>()
    let continuation: string | undefined
    while (true) {
      const page = await this.connection.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuation
        })
      )
      const matches = (page.Contents ?? [])
        .filter(item => item.Key?.startsWith(prefix))
        .map(item => ({ Key: item.Key! }))
      for (let index = 0; index < matches.length; index += 1000)
        yield matches.slice(index, index + 1000)
      const next = page.NextContinuationToken
      if (!next) {
        if (page.IsTruncated)
          throw new Error(
            'Object storage returned an incomplete thumbnail listing'
          )
        return
      }
      if (seen.has(next))
        throw new Error(
          'Object storage repeated a thumbnail continuation token'
        )
      seen.add(next)
      continuation = next
    }
  }
  async delete(key: string): Promise<void> {
    await this.connection.send(new DeleteObjectCommand(this.address(key)))
    for await (const Objects of this.previews(key)) {
      const result = await this.connection.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects, Quiet: true }
        })
      )
      if (result.Errors?.length)
        throw new Error(
          'Object storage could not remove ' +
            result.Errors.length +
            ' thumbnail(s)'
        )
    }
  }
}
