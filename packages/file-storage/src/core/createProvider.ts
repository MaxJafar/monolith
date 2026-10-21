// SPDX-License-Identifier: 0BSD
import { LocalStorageProvider } from './providers/local'
import { S3StorageProvider } from './providers/s3'
import type { StorageProvider } from './providers/types'

export function createProvider(
  environment: NodeJS.ProcessEnv = process.env
): StorageProvider {
  const provider = environment.FILE_STORAGE_PROVIDER || 'local'
  if (provider === 'local')
    return new LocalStorageProvider(
      environment.FILE_STORAGE_LOCAL_PATH || './storage'
    )
  if (provider !== 's3')
    throw new Error('Unsupported file storage provider: ' + provider)
  const bucket = environment.FILE_STORAGE_S3_BUCKET?.trim()
  if (!bucket)
    throw new Error('FILE_STORAGE_S3_BUCKET is required for S3 storage')
  const fields = {
    region: 'REGION',
    endpoint: 'ENDPOINT',
    accessKeyId: 'ACCESS_KEY',
    secretAccessKey: 'SECRET_KEY'
  } as const
  const connection = Object.fromEntries(
    Object.entries(fields).map(([field, suffix]) => [
      field,
      environment['FILE_STORAGE_S3_' + suffix] || undefined
    ])
  )
  return new S3StorageProvider({
    ...connection,
    bucket,
    forcePathStyle: environment.FILE_STORAGE_S3_FORCE_PATH_STYLE === 'true'
  })
}
