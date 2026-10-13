import sharp from 'sharp'

import { storageProvider } from '../../core/storage'
import { describeImage } from './inference'
import { type Source, limits } from './retrieval'

/** Source.file only comes from actor-scoped file metadata, never client URLs. */
export async function enrichFile(
  source: Source
): Promise<{ text: string; inferred: boolean; warning: string }> {
  if (!source.file) return { text: source.text, inferred: false, warning: '' }

  const metadata = source.file

  if (metadata.size > 12 * 1024 * 1024)
    return { text: source.text, inferred: false, warning: 'file-too-large' }

  const supported =
    metadata.mime.startsWith('image/') ||
    [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'text/html'
    ].includes(metadata.mime)

  if (!supported)
    return { text: source.text, inferred: false, warning: 'unsupported-file' }

  const file = await storageProvider.get(metadata.key)

  if (!file)
    return { text: source.text, inferred: false, warning: 'missing-file' }
  let size = 0

  const parts: Buffer[] = []

  try {
    for await (const part of file.stream) {
      const buffer = Buffer.isBuffer(part) ? part : Buffer.from(part)
      size += buffer.length
      if (size > 12 * 1024 * 1024) throw new Error('File size exceeded')
      parts.push(buffer)
    }
  } finally {
    file.stream.destroy()
  }

  const bytes = Buffer.concat(parts)

  if (metadata.mime.startsWith('image/')) {
    let resized: Buffer

    try {
      resized = await sharp(bytes, { limitInputPixels: 24_000_000 })
        .rotate()
        .resize({
          width: 1400,
          height: 1400,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer()
    } catch {
      return { text: source.text, inferred: false, warning: 'unreadable-file' }
    }

    const text = await describeImage(
      'data:image/jpeg;base64,' + resized.toString('base64')
    )

    return {
      text: source.text + '\n\nAI image interpretation:\n' + text,
      inferred: true,
      warning: ''
    }
  }
  let extracted: string,
    warning = ''
  if (metadata.mime === 'application/pdf') {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const task = getDocument({
      data: new Uint8Array(bytes),
      disableFontFace: true,
      useSystemFonts: false
    })

    try {
      const pdf = await task.promise
      const pages: string[] = []

      for (let n = 1; n <= Math.min(pdf.numPages, 80); n++) {
        const page = await pdf.getPage(n)
        const content = await page.getTextContent()
        pages.push(
          `Page ${n}:\n` +
            content.items
              .map(item =>
                'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''
              )
              .join('')
        )
        page.cleanup()

        if (pages.reduce((sum, p) => sum + p.length, 0) > limits.document) {
          warning = 'file-partial'
          break
        }
      }
      if (pdf.numPages > 80) warning = 'file-partial'
      extracted = pages.join('\n\n')
      if (extracted.replace(/Page \d+:/g, '').trim().length < 30)
        warning = 'scanned-pdf'
    } catch {
      return { text: source.text, inferred: false, warning: 'unreadable-file' }
    } finally {
      await task.destroy()
    }
  } else
    extracted = bytes
      .toString('utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(metadata.mime === 'text/html' ? /<[^>]+>/g : /$^/, ' ')

  const text = source.text + '\n\n' + extracted

  return {
    text: text.slice(0, limits.document),
    inferred: false,
    warning: text.length > limits.document ? 'file-partial' : warning
  }
}
