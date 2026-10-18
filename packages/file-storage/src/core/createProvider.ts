import { LocalStorageProvider } from './providers/local'
import { S3StorageProvider } from './providers/s3'
import type { StorageProvider } from './providers/types'

export function createProvider(
  environment: NodeJS.ProcessEnv = process.env
): StorageProvider {
  const mode = environment.FILE_STORAGE_PROVIDER || 'local'
  switch (mode) {
    case 'local':
      return new LocalStorageProvider(
        environment.FILE_STORAGE_LOCAL_PATH || './storage'
      )
    case 's3': {
      const bucket = environment.FILE_STORAGE_S3_BUCKET?.trim()
      if (!bucket)
        throw new Error('FILE_STORAGE_S3_BUCKET is required for S3 storage')
      const option = (name: string) =>
        environment['FILE_STORAGE_S3_' + name] || undefined
      return new S3StorageProvider({
        bucket,
        region: option('REGION'),
        endpoint: option('ENDPOINT'),
        accessKeyId: option('ACCESS_KEY'),
        secretAccessKey: option('SECRET_KEY'),
        forcePathStyle: option('FORCE_PATH_STYLE') === 'true'
      })
    }
    default:
      throw new Error(`Unsupported file storage provider: ${mode}`)
  }
}
