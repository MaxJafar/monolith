// SPDX-License-Identifier: 0BSD
import sharp from 'sharp'
import { expect, it } from 'vitest'

import { generateKey, generateThumbKey, resizeImage } from './utils'

it('issues unique opaque keys and rejects namespaces that escape their directory', () => {
  const keys = new Set(
    Array.from({ length: 100 }, () => generateKey('notes', '.png'))
  )
  expect(keys.size).toBe(100)
  for (const key of keys) expect(key).toMatch(/^notes\/[a-f\d-]{36}\.png$/)
  for (const namespace of ['', '..', 'x/y', 'x:y', 'x\\y'])
    expect(() => generateKey(namespace, 'png')).toThrow('namespace')
  expect(generateKey('notes', '../../unsafe')).toMatch(/\.bin$/)
})
it('keeps dotted directories and suffixes intact in thumbnail keys', () => {
  expect(generateThumbKey('images.v2/report.final.png', '48x0')).toBe(
    'images.v2/report.final-thumb-48x0.png'
  )
  expect(generateThumbKey('images.v2/original', '0x24')).toBe(
    'images.v2/original-thumb-0x24'
  )
  for (const size of ['x', '3x-1', '8x999999', '../x', '1.5x2'])
    expect(() => generateThumbKey('notes/image.png', size)).toThrow()
})
it('resizes real images with fixed, proportional and unchanged dimensions', async () => {
  const input = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#486860' }
  })
    .png()
    .toBuffer()
  for (const [size, width, height] of [
    ['16x16', 16, 16],
    ['32x0', 32, 16],
    ['0x12', 24, 12],
    ['0x0', 80, 40]
  ] as const) {
    const resized = await resizeImage(input, size)
    expect([resized.width, resized.height]).toEqual([width, height])
    const decoded = await sharp(resized.buffer).metadata()
    expect([decoded.width, decoded.height]).toEqual([width, height])
  }
})
