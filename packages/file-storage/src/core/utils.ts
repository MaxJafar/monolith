// SPDX-License-Identifier: 0BSD
import { randomUUID } from 'node:crypto'
import { posix } from 'node:path'
import sharp from 'sharp'

export function thumbnailDimensions(size: string) {
  const match = /^(\d+)x(\d+)$/i.exec(size)
  if (!match) throw new Error('Invalid thumbnail dimensions')
  const [width, height] = [Number(match[1]), Number(match[2])]
  if (
    [width, height].some(value => !Number.isSafeInteger(value) || value > 16384)
  )
    throw new Error('Thumbnail dimensions exceed the limit')
  return { width: width || undefined, height: height || undefined }
}
export function generateKey(namespace: string, extension: string): string {
  if (
    !namespace ||
    namespace === '.' ||
    namespace === '..' ||
    /[\\/:\0]/.test(namespace)
  )
    throw new Error('Invalid storage namespace')
  const suffix = extension.startsWith('.') ? extension.substring(1) : extension
  return (
    namespace +
    '/' +
    randomUUID() +
    '.' +
    (/^[a-z\d]{1,20}$/i.test(suffix) ? suffix : 'bin')
  )
}
export function generateThumbKey(key: string, size: string): string {
  thumbnailDimensions(size)
  const parsed = posix.parse(key)
  return posix.join(parsed.dir, parsed.name + '-thumb-' + size + parsed.ext)
}
export async function resizeImage(input: Buffer | string, size: string) {
  const options = thumbnailDimensions(size)
  const operation = sharp(input)
  if (options.width || options.height)
    operation.resize({
      ...options,
      fit: options.width && options.height ? 'cover' : 'inside'
    })
  const output = await operation.toBuffer({ resolveWithObject: true })
  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height
  }
}
