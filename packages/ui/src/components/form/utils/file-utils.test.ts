// SPDX-License-Identifier: 0BSD
import { afterEach, expect, it, vi } from 'vitest'

import type { FileReference, ProxyTree } from '@monolith/api'

import {
  convertFormFileFieldData,
  getFormFileFieldInitialData
} from './file-utils'

const media = vi.fn(({ key }: { key: string }) => '/media/' + key)
const api = { getMedia: media } as unknown as ProxyTree<Record<string, unknown>>
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('keeps existing media, removes cleared fields, and returns new values', () => {
  const saved = getFormFileFieldInitialData(api, undefined, 'folder/photo.png')
  expect(saved).toEqual({
    type: 'existing',
    id: 'folder/photo.png',
    filename: 'photo.png',
    preview: '/media/folder/photo.png'
  })
  expect(convertFormFileFieldData(saved)).toBe('keep')
  for (const empty of [null, undefined, { type: 'empty' as const }]) {
    expect(convertFormFileFieldData(empty)).toBe('removed')
  }
  const fresh = new File(['text'], 'notes.txt', { type: 'text/plain' })
  const upload = getFormFileFieldInitialData(api, {}, fresh)
  expect(upload).toEqual({ type: 'upload', file: fresh, preview: undefined })
  expect(convertFormFileFieldData(upload)).toBe(fresh)
})
it('uses reference metadata without creating a preview for a non-image', () => {
  const file = {
    key: 'archive/opaque',
    originalName: 'notes.pdf',
    mimeType: 'application/pdf'
  } as FileReference
  expect(getFormFileFieldInitialData(api, {}, file)).toEqual({
    type: 'existing',
    id: file.key,
    filename: 'notes.pdf',
    preview: undefined
  })
  expect(media).not.toHaveBeenCalled()
})
it.each([
  'https://example.test/image.png',
  'blob:local-image',
  'data:image/png;base64,AA=='
])('preserves external image reference %s', url => {
  const field = getFormFileFieldInitialData(api, {}, url)
  expect(field).toEqual({ type: 'url', url, preview: url })
  expect(convertFormFileFieldData(field)).toBe(url)
})
it('creates a revocable preview only for uploaded images', () => {
  const image = new File(['image'], 'cover.png', { type: 'image/png' })
  const value = getFormFileFieldInitialData(api, {}, image)
  expect(value.type).toBe('upload')
  if (value.type !== 'upload') throw Error('Expected upload')
  expect(value.preview).toMatch(/^blob:/)
  URL.revokeObjectURL(value.preview!)
})
it('can restore stored values before the browser File API exists', () => {
  vi.stubGlobal('File', undefined)
  expect(getFormFileFieldInitialData(api, undefined, 'a.txt').type).toBe(
    'existing'
  )
  expect(getFormFileFieldInitialData(api, undefined, null)).toEqual({
    type: 'empty'
  })
})
