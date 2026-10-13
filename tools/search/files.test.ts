import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import { storageProvider } from '../../apps/api/src/core/storage'
import { enrichFile } from '../../apps/api/src/lib/search/files'
import type { Source } from '../../apps/api/src/lib/search/retrieval'

function pdfFixture(): Buffer {
  const content =
    'BT /F1 14 Tf 30 700 Td (Aurora reference manual for photography equipment) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ]
  let value = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(value))
    value += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const position = Buffer.byteLength(value)
  value += `xref\n0 6\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`
  return Buffer.from(value)
}

test('files extract real PDF text and expose bounded/invalid-file coverage', async () => {
  const original = storageProvider.get
  const source: Source = {
    id: 'file:test',
    title: 'Reference.pdf',
    module: 'notes',
    workspace: null,
    href: '/notes',
    text: 'Reference.pdf',
    fingerprint: 'fixture',
    file: { key: 'notes/fixture.pdf', mime: 'application/pdf', size: 1000 }
  }
  let bytes = pdfFixture(),
    reads = 0
  storageProvider.get = async () => {
    reads++
    return {
      stream: Readable.from(bytes),
      mimeType: 'application/pdf',
      size: bytes.length
    }
  }
  try {
    const result = await enrichFile(source)
    assert(result.text.includes('Aurora reference manual'))
    assert.equal(result.inferred, false)
    assert.equal(result.warning, '')
    const oversized = await enrichFile({
      ...source,
      file: { ...source.file!, size: 13 * 1024 * 1024 }
    })
    assert.equal(oversized.warning, 'file-too-large')
    assert.equal(reads, 1)
    bytes = Buffer.from('not an image')
    const invalid = await enrichFile({
      ...source,
      file: { ...source.file!, mime: 'image/png' }
    })
    assert.equal(invalid.warning, 'unreadable-file')
  } finally {
    storageProvider.get = original
  }
})
