// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

export const isLocalFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File
export const fileValueSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('empty') }),
  z.object({
    type: z.literal('existing'),
    id: z.string(),
    filename: z.string(),
    preview: z.string().optional()
  }),
  z.object({
    type: z.literal('upload'),
    file: z.custom<File>(isLocalFile),
    preview: z.string().optional()
  }),
  z.object({
    type: z.literal('url'),
    url: z.string(),
    preview: z.string().optional()
  })
])
export type FileValue = z.infer<typeof fileValueSchema>
export type FilePickerSourceConfig = {
  pixabay?: boolean
  url?: boolean
  ai?: false | { defaultPrompt: string }
}
export type FileSelection = { file: File | string; preview: string | null }
export type FileTypes = Record<string, string[]>
export function acceptedTypes(config: FileTypes = {}): string[] {
  const tokens: string[] = []
  for (const [kind, extensions] of Object.entries(config)) {
    if (kind.includes('/')) tokens.push(kind.toLowerCase())
    for (const extension of extensions) {
      const name = extension.replace(/^\./, '').toLowerCase()
      if (!kind.includes('/')) tokens.push(kind + '/' + name)
      if (name && name !== '*') tokens.push('.' + name)
    }
    if (!kind.includes('/') && !extensions.length) tokens.push(kind + '/*')
  }
  return [...new Set(tokens)]
}
export function acceptsFile(
  file: Pick<File, 'name' | 'type'>,
  config?: FileTypes
): boolean {
  const tokens = acceptedTypes(config)
  if (!tokens.length) return true
  const name = file.name.toLowerCase(),
    type = file.type.toLowerCase()
  return tokens.some(token =>
    token.startsWith('.')
      ? name.endsWith(token)
      : token.endsWith('/*')
        ? type.startsWith(token.slice(0, -1))
        : type === token
  )
}
export function remoteFileURL(value: string): string | undefined {
  try {
    const url = new URL(value.trim())
    if (['http:', 'https:'].includes(url.protocol)) return url.href
  } catch {
    /* An unfinished URL is not a selection. */
  }
}
export function previewURL(
  value: string | null | undefined
): string | undefined {
  if (!value) return
  if (value.startsWith('/') && !value.startsWith('//')) return value
  if (/^blob:|^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(value))
    return value
  return remoteFileURL(value)
}
export function selectedName(value: File | string): string {
  if (isLocalFile(value)) return value.name
  try {
    const url = new URL(value)
    return decodeURIComponent(
      url.pathname.split('/').filter(Boolean).at(-1) || url.hostname
    )
  } catch {
    return value
  }
}
export function fileSymbol(filename: string): string {
  const extension = filename.toLowerCase().split('.').at(-1) ?? ''
  if (
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'heic'].includes(
      extension
    )
  )
    return 'lucide:image'
  if (['mp3', 'm4a', 'wav', 'ogg', 'flac'].includes(extension))
    return 'lucide:music'
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(extension))
    return 'lucide:video'
  if (['zip', '7z', 'tar', 'gz', 'rar'].includes(extension))
    return 'lucide:archive'
  if (['pdf', 'doc', 'docx', 'md', 'txt', 'rtf'].includes(extension))
    return 'lucide:file-text'
  if (['csv', 'xls', 'xlsx', 'ods'].includes(extension)) return 'lucide:table'
  return 'lucide:file'
}
export function readFilePreview(
  file: File,
  signal: AbortSignal
): Promise<string | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const reader = new FileReader()
    const stop = () => reader.abort()
    const cleanup = () => signal.removeEventListener('abort', stop)
    reader.onload = () => {
      cleanup()
      resolve(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.onerror = () => {
      cleanup()
      reject(reader.error ?? new Error('File could not be read'))
    }
    reader.onabort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', stop, { once: true })
    reader.readAsDataURL(file)
  })
}
