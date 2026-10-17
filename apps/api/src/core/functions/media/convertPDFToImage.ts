import { fromPath } from 'pdf2pic'

import type { ConvertPDFToImageFunc } from '@monolith/server-utils'

const convertPDFToImage: ConvertPDFToImageFunc = async source => {
  const render = fromPath(source, {
    density: 200,
    quality: 100,
    format: 'png',
    width: 2000,
    preserveAspectRatio: true
  })
  const page = await render(1, { responseType: 'buffer' })

  if (!page.buffer) return undefined

  // Copy exactly the visible bytes, including Buffer views with a nonzero offset.
  const bytes = Uint8Array.from(page.buffer)

  return new File([bytes], 'receipt.png', { type: 'image/png' })
}

export default convertPDFToImage
