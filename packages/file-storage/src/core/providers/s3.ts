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

import type {
  ProviderSaveOptions,
  StorageGetOptions,
  StorageProvider
} from './types'

export interface S3ProviderConfig {
  bucket: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  forcePathStyle?: boolean
}

function missingObject(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const failure = error as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }
  return (
    failure.name === 'NoSuchKey' || failure.$metadata?.httpStatusCode === 404
  )
}
function objectType(key: string) {
  return mime.lookup(key) || 'application/octet-stream'
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client
  private readonly bucket: string

  constructor({
    bucket,
    accessKeyId,
    secretAccessKey,
    ...connection
  }: S3ProviderConfig) {
    if (!bucket.trim()) throw new Error('An object-storage bucket is required')
    if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
      throw new Error(
        'Object-storage credentials must include both key and secret'
      )
    }
    this.bucket = bucket
    this.client = new S3Client({
      ...connection,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined
    })
  }

  async save(key: string, data: Readable, options?: ProviderSaveOptions) {
    await new Upload({
      client: this.client,
      leavePartsOnError: false,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.mimeType ?? objectType(key)
      }
    }).done()
  }

  async get(key: string, _options?: StorageGetOptions) {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      )
      if (!object.Body) return null
      const stream =
        object.Body instanceof Readable
          ? object.Body
          : Readable.fromWeb(
              object.Body.transformToWebStream() as Parameters<
                typeof Readable.fromWeb
              >[0]
            )
      return {
        stream,
        mimeType: object.ContentType ?? objectType(key),
        size: object.ContentLength ?? 0
      }
    } catch (error) {
      if (missingObject(error)) return null
      throw error
    }
  }

  async delete(key: string) {
    // S3 deletion is idempotent. Permission, network and partial-batch failures
    // must reach the caller so metadata is not silently reported as removed.
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    )
    const extension = posix.extname(key)
    const prefix =
      (extension ? key.slice(0, -extension.length) : key) + '-thumb-'
    const visited = new Set<string>()
    let token: string | undefined
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token
        })
      )
      const objects = (page.Contents ?? []).flatMap(object =>
        object.Key?.startsWith(prefix) ? [{ Key: object.Key }] : []
      )
      if (objects.length) {
        const result = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true }
          })
        )
        if (result.Errors?.length) {
          throw new Error(
            'Object storage could not remove ' +
              result.Errors.length +
              ' thumbnail(s)'
          )
        }
      }
      token = page.NextContinuationToken
      if (page.IsTruncated && !token)
        throw new Error(
          'Object storage returned an incomplete thumbnail listing'
        )
      if (token) {
        if (visited.has(token))
          throw new Error(
            'Object storage repeated a thumbnail continuation token'
          )
        visited.add(token)
      }
    } while (token)
  }
}
