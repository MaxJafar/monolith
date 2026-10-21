// SPDX-License-Identifier: 0BSD
import type { FileReference, ProxyTree } from '@monolith/api'

import type { FileValue } from '@/components/inputs'

/** Keep storage keys distinct from URLs and newly selected files. */
export function getFormFileFieldInitialData(
  api: ProxyTree<any>,
  _record: Record<string, unknown> | undefined,
  input: File | string | FileReference | null | undefined
): FileValue {
  if (typeof File !== 'undefined' && input instanceof File) {
    return {
      type: 'upload',
      file: input,
      preview: input.type.startsWith('image/')
        ? URL.createObjectURL(input)
        : undefined
    }
  }
  if (typeof input === 'string' && /^(https?|data|blob):/i.test(input)) {
    return { type: 'url', url: input, preview: input }
  }
  const stored =
    typeof input === 'string'
      ? { key: input }
      : input && typeof input === 'object' && 'key' in input
        ? input
        : null
  if (!stored || typeof stored.key !== 'string' || !stored.key)
    return { type: 'empty' }
  const reference = stored as FileReference
  const image = reference.mimeType
    ? reference.mimeType.startsWith('image/')
    : /\.(png|jpe?g|webp|gif)$/i.test(stored.key)
  return {
    type: 'existing',
    id: stored.key,
    filename:
      reference.originalName ?? stored.key.split('/').at(-1) ?? stored.key,
    preview: image ? api.getMedia({ key: stored.key }) : undefined
  }
}
export function convertFormFileFieldData(
  input: FileValue | null | undefined
): File | string | 'keep' | 'removed' {
  switch (input?.type) {
    case 'upload':
      return input.file
    case 'url':
      return input.url
    case 'existing':
      return 'keep'
    default:
      return 'removed'
  }
}
