import { randomUUID } from 'node:crypto'
import { posix } from 'node:path'
import sharp from 'sharp'

function dimensions(value: string): [number | undefined, number | undefined] {
  if (!/^\d+x\d+$/i.test(value)) throw new Error('Invalid thumbnail dimensions')
  const values = value.toLowerCase().split('x').map(Number)
  if (values.some(size => !Number.isSafeInteger(size) || size > 16384))
    throw new Error('Thumbnail dimensions exceed the limit')
  return [values[0] || undefined, values[1] || undefined]
}

export function generateKey(moduleId: string, extension: string): string {
  if (
    !moduleId ||
    /[\\/\0]/.test(moduleId) ||
    moduleId === '.' ||
    moduleId === '..'
  )
    throw new Error('Invalid storage namespace')
  const suffix = extension.replace(/^\./, '')
  return `${moduleId}/${randomUUID()}.${/^[a-z0-9]{1,20}$/i.test(suffix) ? suffix : 'bin'}`
}

export function generateThumbKey(key: string, size: string): string {
  dimensions(size)
  const suffix = posix.extname(key)
  return `${suffix ? key.slice(0, -suffix.length) : key}-thumb-${size}${suffix}`
}

export async function resizeImage(input: Buffer | string, size: string) {
  const [width, height] = dimensions(size)
  const image = sharp(input)
  if (width || height)
    image.resize({ width, height, fit: width && height ? 'cover' : 'inside' })
  const { data, info } = await image.toBuffer({ resolveWithObject: true })
  return { buffer: data, width: info.width, height: info.height }
}
