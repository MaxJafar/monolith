import { createWorker } from 'tesseract.js'

import type { ParseOCRFunc } from '@monolith/server-utils'

const parseOCR: ParseOCRFunc = async source => {
  const worker = await createWorker('eng', 3, {
    langPath: './src/core/models',
    cachePath: './src/core/models',
    cacheMethod: 'readOnly',
    gzip: false
  })

  try {
    const { data } = await worker.recognize(source)

    return data.text
  } finally {
    await worker.terminate()
  }
}

export default parseOCR
