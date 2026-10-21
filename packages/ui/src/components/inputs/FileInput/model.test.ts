// SPDX-License-Identifier: 0BSD
import { afterEach, expect, it, vi } from 'vitest'

import {
  acceptedTypes,
  acceptsFile,
  fileValueSchema,
  previewURL,
  remoteFileURL,
  selectedName
} from './model'

afterEach(() => vi.unstubAllGlobals())
it('understands standard MIME groups and historical top-level extension groups', () => {
  expect(
    acceptedTypes({ 'image/png': ['.png'], application: ['pdf'], image: ['*'] })
  ).toEqual(['image/png', '.png', 'application/pdf', '.pdf', 'image/*'])
  expect(
    acceptsFile({ name: 'cover.PNG', type: '' }, { 'image/*': ['.png'] })
  ).toBe(true)
  expect(
    acceptsFile(
      { name: 'image', type: 'image/jpeg' },
      { image: ['jpeg', 'png'] }
    )
  ).toBe(true)
  expect(
    acceptsFile(
      { name: 'notes.pdf', type: 'application/pdf' },
      { application: ['pdf'] }
    )
  ).toBe(true)
  expect(
    acceptsFile(
      { name: 'program.exe', type: 'application/octet-stream' },
      { 'image/*': ['.png'] }
    )
  ).toBe(false)
  expect(acceptsFile({ name: 'any', type: '' })).toBe(true)
})
it('keeps existing storage identifiers distinct from upload and URL selections', () => {
  expect(
    fileValueSchema.parse({
      type: 'existing',
      id: 'workspace/file/key',
      filename: 'cover.png'
    }).type
  ).toBe('existing')
  expect(
    fileValueSchema.safeParse({ type: 'upload', file: { name: 'fake.png' } })
      .success
  ).toBe(false)
  vi.stubGlobal('File', undefined)
  expect(fileValueSchema.safeParse({ type: 'upload', file: {} }).success).toBe(
    false
  )
  expect(fileValueSchema.parse({ type: 'empty' })).toEqual({ type: 'empty' })
})
it('accepts web URLs and image previews without enabling executable URLs', () => {
  expect(remoteFileURL(' https://example.com/cover.png ')).toBe(
    'https://example.com/cover.png'
  )
  expect(remoteFileURL('javascript:alert(1)')).toBeUndefined()
  expect(remoteFileURL('file:///private/key')).toBeUndefined()
  expect(previewURL('data:text/html,test')).toBeUndefined()
  expect(previewURL('data:image/png;base64,test')).toBe(
    'data:image/png;base64,test'
  )
  expect(previewURL('/api/media/file')).toBe('/api/media/file')
  expect(previewURL('//untrusted.example/file')).toBeUndefined()
  expect(
    selectedName('https://example.com/Release%20notes.pdf?secret=hidden')
  ).toBe('Release notes.pdf')
})
