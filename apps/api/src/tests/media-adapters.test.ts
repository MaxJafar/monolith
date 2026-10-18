import { beforeEach, describe, expect, it, vi } from 'vitest'

import parseOCR from '../core/functions/external/ocr'
import convertPDFToImage from '../core/functions/media/convertPDFToImage'

const { render, recognize, terminate } = vi.hoisted(() => ({
  render: vi.fn(),
  recognize: vi.fn(),
  terminate: vi.fn()
}))
vi.mock('pdf2pic', () => ({ fromPath: () => render }))
vi.mock('tesseract.js', () => ({
  createWorker: async () => ({ recognize, terminate })
}))

beforeEach(() => vi.clearAllMocks())

describe('document media adapters', () => {
  it('copies only the image bytes from a Buffer view', async () => {
    render.mockResolvedValue({
      buffer: Buffer.from([9, 1, 2, 3, 9]).subarray(1, 4)
    })
    const file = await convertPDFToImage('input.pdf')
    expect([...new Uint8Array(await file!.arrayBuffer())]).toEqual([1, 2, 3])
    expect(file?.type).toBe('image/png')
  })

  it('propagates an asynchronous renderer failure instead of leaving a pending promise', async () => {
    render.mockRejectedValue(new Error('renderer unavailable'))
    await expect(convertPDFToImage('input.pdf')).rejects.toThrow(
      'renderer unavailable'
    )
    render.mockResolvedValue({})
    expect(await convertPDFToImage('input.pdf')).toBeUndefined()
  })

  it('terminates OCR workers after both success and failure', async () => {
    recognize
      .mockResolvedValueOnce({ data: { text: 'receipt' } })
      .mockRejectedValueOnce(new Error('invalid image'))
    expect(await parseOCR('image.png')).toBe('receipt')
    await expect(parseOCR('image.png')).rejects.toThrow('invalid image')
    expect(terminate).toHaveBeenCalledTimes(2)
  })
})
