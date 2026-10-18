import type { Document, Page } from '../../shared'
import { PageGraphic } from './graphics'
import { importDocument, pageBounds } from './model'

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name.replace(/[<>:"/\\|?*]|\p{Cc}/gu, '_')
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportJSON(document: Document, title: string) {
  download(
    new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
    `${title}.redraw.json`
  )
}

export async function readDocument(file: File) {
  if (file.size > 4000000) throw Error('fileTooLarge')

  return importDocument(JSON.parse(await file.text()))
}

export async function exportPage(
  page: Page,
  title: string,
  format: 'svg' | 'png'
) {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const b = pageBounds(page.elements.filter(e => !e.hidden)),
    padding = 30
  const width = Math.ceil(b.width + padding * 2),
    height = Math.ceil(b.height + padding * 2)
  const source = renderToStaticMarkup(
    <svg
      height={height}
      viewBox={`${b.x - padding} ${b.y - padding} ${width} ${height}`}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill={page.background}
        height={height}
        width={width}
        x={b.x - padding}
        y={b.y - padding}
      />
      <PageGraphic page={page} />
    </svg>
  )
  const svg = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })

  if (format === 'svg') {
    download(svg, `${title}.svg`)

    return
  }

  const url = URL.createObjectURL(svg)

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(Error('exportFailed'))
      image.src = url
    })
    const canvas = document.createElement('canvas'),
      scale = Math.min(
        2,
        8192 / width,
        8192 / height,
        Math.sqrt(16000000 / (width * height))
      )
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')

    if (!context) throw Error('exportFailed')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(Error('exportFailed'))),
        'image/png'
      )
    )
    download(png, `${title}.png`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function readImage(
  file: File
): Promise<{ image: string; width: number; height: number }> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('imageFormat')
  if (file.size > 1400000) throw Error('imageTooLarge')

  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(Error('importFailed'))
    reader.readAsDataURL(file)
  })
  const bitmap = new Image()
  await new Promise<void>((resolve, reject) => {
    bitmap.onload = () => resolve()
    bitmap.onerror = () => reject(Error('importFailed'))
    bitmap.src = image
  })
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height))

  return {
    image,
    width: Math.max(1, bitmap.width * scale),
    height: Math.max(1, bitmap.height * scale)
  }
}
