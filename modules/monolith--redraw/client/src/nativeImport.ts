import { Inflate, Unzip, UnzipInflate } from 'fflate'
import { Decompress } from 'fzstd'
import { ByteBuffer, type Schema, decodeBinarySchema } from 'kiwi-schema'

import {
  componentFromSelection,
  defaultLayout,
  layoutDocument
} from '../../design'
import {
  type Document,
  type Element,
  type Page,
  documentSchema
} from '../../shared'
import { parsePath } from '../../vector'
import { makeElement, makePage, uid } from './model'

// Native schemas vary by exporter version. Only bounded, explicitly mapped fields
// cross this decoding boundary; documentSchema validates every resulting object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>

export type ImportResult = {
  title: string
  document: Document
  warnings: { code: string; count: number }[]
}

const MAX = 96 * 1024 * 1024
const decoder = new TextDecoder('utf-8', { fatal: true })
const fail = () => {
  throw Error('invalidNativeFile')
}
const limited = () => {
  throw Error('nativeLimit')
}
const join = (chunks: Uint8Array[], size: number) => {
  const value = new Uint8Array(size)

  let offset = 0

  for (const chunk of chunks) {
    value.set(chunk, offset)
    offset += chunk.length
  }

  return value
}

export function readArchive(bytes: Uint8Array) {
  const files = new Map<string, Uint8Array>()

  let total = 0,
    count = 0

  const unzip = new Unzip(file => {
    if (++count > 10000 || (file.originalSize ?? 0) > MAX) limited()
    if (file.name.endsWith('/')) return
    if (
      file.name.includes('\\') ||
      file.name.startsWith('/') ||
      file.name.split('/').includes('..') ||
      files.has(file.name)
    )
      fail()

    const chunks: Uint8Array[] = []

    let size = 0
    files.set(file.name, new Uint8Array())

    file.ondata = (error, chunk, final) => {
      if (error) fail()
      total += chunk.length
      size += chunk.length
      if (total > MAX) limited()
      chunks.push(chunk)
      if (final) files.set(file.name, join(chunks, size))
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  for (let offset = 0; offset < bytes.length; offset += 65536)
    unzip.push(
      bytes.subarray(offset, offset + 65536),
      offset + 65536 >= bytes.length
    )

  return files
}

export function inflateChunk(bytes: Uint8Array) {
  const chunks: Uint8Array[] = []

  let size = 0

  const zstd =
    bytes[0] === 0x28 &&
    bytes[1] === 0xb5 &&
    bytes[2] === 0x2f &&
    bytes[3] === 0xfd

  // Inspect every concatenated frame before the decoder allocates its window.
  for (let offset = 0; zstd && offset < bytes.length;) {
    if (
      offset + 6 > bytes.length ||
      bytes[offset] !== 0x28 ||
      bytes[offset + 1] !== 0xb5 ||
      bytes[offset + 2] !== 0x2f ||
      bytes[offset + 3] !== 0xfd
    )
      fail()

    const descriptor = bytes[offset + 4]!,
      single = (descriptor >> 5) & 1,
      flag = descriptor >> 6

    if (descriptor & 8) fail()

    const dictionaryBytes = (descriptor & 3) === 3 ? 4 : descriptor & 3
    const sizeBytes = flag ? 2 ** flag : single,
      start = offset + 6 - single + dictionaryBytes

    if (start + sizeBytes > bytes.length) fail()
    let length = 0
    for (let i = 0; i < sizeBytes; i++)
      length += bytes[start + i]! * 2 ** (8 * i)
    if (flag === 1) length += 256

    const base = 2 ** (10 + (bytes[offset + 5]! >> 3)),
      window = single ? length : base + (base / 8) * (bytes[offset + 5]! & 7)

    if (!Number.isFinite(window) || window > MAX || length > MAX) limited()
    offset = start + sizeBytes
    let last = false

    while (!last) {
      if (offset + 3 > bytes.length) fail()

      const header =
        bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16)
      const kind = (header >> 1) & 3,
        size = header >>> 3

      if (kind === 3 || size > 131072) fail()
      last = !!(header & 1)
      offset += 3 + (kind === 1 ? 1 : size)
      if (offset > bytes.length) fail()
    }
    if (descriptor & 4) offset += 4
    if (offset > bytes.length) fail()
  }

  const collect = (chunk: Uint8Array) => {
    size += chunk.length
    if (size > MAX) limited()
    chunks.push(chunk)
  }
  const stream = zstd ? new Decompress(collect) : new Inflate(collect)

  for (let offset = 0; offset < bytes.length; offset += 16384)
    stream.push(
      bytes.subarray(offset, offset + 16384),
      offset + 16384 >= bytes.length
    )

  return join(chunks, size)
}

/** Interpret the embedded schema as data; never compile or evaluate imported code. */
export function decodeKiwi(schema: Schema, bytes: Uint8Array): Data {
  if (schema.definitions.length > 3000) limited()

  const types = new Map(schema.definitions.map(d => [d.name, d]))
  const buffer = new ByteBuffer(bytes)

  let fields = 0

  const read = (type: string, depth: number): unknown => {
    if (++fields > 1500000 || depth > 100) limited()

    switch (type) {
      case 'bool':
        return !!buffer.readByte()
      case 'byte':
        return buffer.readByte()
      case 'int':
        return buffer.readVarInt()
      case 'uint':
        return buffer.readVarUint()
      case 'float':
        return buffer.readVarFloat()

      case 'string': {
        const value = buffer.readString()

        if (value.length > 4000000) limited()

        return value
      }
      case 'int64':
        return buffer.readVarInt64().toString()
      case 'uint64':
        return buffer.readVarUint64().toString()
    }

    const definition = types.get(type)

    if (!definition) return fail()

    if (definition.kind === 'ENUM') {
      const id = buffer.readVarUint()

      return definition.fields.find(f => f.value === id)?.name ?? id
    }

    const value: Data = Object.create(null)
    const readField = (
      field: Schema['definitions'][number]['fields'][number]
    ) => {
      if (['__proto__', 'constructor', 'prototype'].includes(field.name)) fail()
      let result: unknown
      if (field.isArray && field.type === 'byte')
        result = buffer.readByteArray()
      else if (field.isArray) {
        const count = buffer.readVarUint()

        if (count > 200000) limited()
        result = Array.from({ length: count }, () =>
          read(field.type!, depth + 1)
        )
      } else result = read(field.type!, depth + 1)
      if (!field.isDeprecated) value[field.name] = result
    }

    if (definition.kind === 'STRUCT')
      for (const field of definition.fields) readField(field)
    else {
      const byId = new Map(definition.fields.map(f => [f.value, f]))

      for (;;) {
        const id = buffer.readVarUint()

        if (!id) break

        const field = byId.get(id)

        if (!field) fail()
        readField(field!)
      }
    }

    return value
  }

  return read(types.has('Message') ? 'Message' : 'NodeChanges', 0) as Data
}

const num = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback
const bound = (value: unknown, min: number, max: number, fallback = min) =>
  Math.max(min, Math.min(max, num(value, fallback)))
const hex = (
  value: Data | string | undefined,
  fallback = '#c4b5fd'
): string => {
  if (typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)) return value
  if (value && typeof value === 'object' && Number.isFinite(value.r))
    return (
      '#' +
      [value.r, value.g, value.b]
        .map(c =>
          Math.round(bound(c, 0, 1) * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    )

  return fallback
}
const guid = (value: Data | string | undefined) =>
  typeof value === 'string'
    ? value
    : value && Number.isFinite(value.sessionID)
      ? `${value.sessionID}:${value.localID}`
      : ''
const json = (bytes?: Uint8Array): Data => {
  if (!bytes) return fail()

  return JSON.parse(decoder.decode(bytes))
}
const raster = (bytes?: Uint8Array) => {
  if (!bytes || bytes.length > 1400000) return ''

  const type =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
      ? 'png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? 'jpeg'
        : String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
            String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
          ? 'webp'
          : ''

  if (!type) return ''
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))

  return `data:image/${type};base64,${btoa(binary)}`
}

export function importNative(
  bytes: Uint8Array,
  filename: string
): ImportResult {
  if (bytes.length > 32 * 1024 * 1024) limited()

  const archive =
    bytes[0] === 80 && bytes[1] === 75
      ? readArchive(bytes)
      : new Map<string, Uint8Array>()
  const warnings = new Map<string, number>()
  const warn = (key: string) => warnings.set(key, (warnings.get(key) ?? 0) + 1)
  const document: Document = { version: 1, pages: [], components: [] }
  const nativeIds = new Map<string, string>()
  const pendingLinks: { element: Element; destination: string }[] = []
  const gradient = (source: Data, figma = false): Element['gradient'] => {
    const stops = source.stops

    if (
      !Array.isArray(stops) ||
      stops.length < 2 ||
      !['linear', 'radial', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(
        source.type
      )
    ) {
      warn('paints')

      return undefined
    }

    const transform = source.transform ?? {}
    const a = num(transform.m00, 1),
      b = num(transform.m10),
      c = num(transform.m01),
      d = num(transform.m11, 1),
      tx = num(transform.m02),
      ty = num(transform.m12)
    const determinant = a * d - b * c

    if (figma && Math.abs(determinant) < 1e-10) {
      warn('paints')

      return undefined
    }

    // Kiwi maps the normalized node box into gradient space; SVG needs the inverse.
    const inverse: NonNullable<Element['gradient']>['transform'] = [
      d / determinant,
      -b / determinant,
      -c / determinant,
      a / determinant,
      (c * ty - d * tx) / determinant,
      (b * tx - a * ty) / determinant
    ]

    if (
      figma &&
      inverse.some(value => !Number.isFinite(value) || Math.abs(value) > 100000)
    ) {
      warn('paints')

      return undefined
    }

    const radial = ['radial', 'GRADIENT_RADIAL'].includes(source.type)

    if (stops.length > 32) warn('paints')

    return {
      type: radial ? 'radial' : 'linear',
      ...(figma ? { transform: inverse } : {}),
      start: figma
        ? { x: radial ? 0.5 : 0, y: 0.5 }
        : {
            x: bound(source.startX, -100000, 100000),
            y: bound(source.startY, -100000, 100000)
          },
      end: figma
        ? { x: 1, y: 0.5 }
        : {
            x: bound(source.endX, -100000, 100000, 1),
            y: bound(source.endY, -100000, 100000, 1)
          },
      stops: stops
        .slice(0, 32)
        .map((stop: Data) => ({
          offset: bound(stop.position ?? stop.offset, 0, 1),
          color: hex(stop.color, '#000000'),
          opacity: bound(stop.opacity ?? stop.color?.a, 0, 1, 1)
        }))
        .sort((a, b) => a.offset - b.offset)
    }
  }
  const prototype = (e: Element, source: Data, figma = false) => {
    const interactions = figma
      ? source.prototypeInteractions?.filter((i: Data) => !i.isDeleted)
      : source.interactions
    const item = interactions?.[0]

    if (!item) return

    const event = figma ? item.event?.interactionType : item.eventType
    const action = figma ? item.actions?.[0] : item

    if (
      !action ||
      ![
        'click',
        'mouse-over',
        'mouse-enter',
        'ON_CLICK',
        'ON_HOVER',
        'MOUSE_ENTER'
      ].includes(event)
    ) {
      warn('prototypes')

      return
    }

    const type = figma
      ? action.connectionType === 'BACK'
        ? 'back'
        : action.connectionType === 'CLOSE'
          ? 'close'
          : action.connectionType === 'INTERNAL_NODE' ||
              action.connectionType === undefined
            ? action.navigationType === 'OVERLAY'
              ? 'overlay'
              : action.navigationType === undefined ||
                  action.navigationType === 'NAVIGATE'
                ? 'navigate'
                : null
            : null
      : (
          {
            navigate: 'navigate',
            'open-overlay': 'overlay',
            'close-overlay': 'close',
            'prev-screen': 'back'
          } as const
        )[action.actionType as 'navigate']

    if (!type) {
      warn('prototypes')

      return
    }

    const transition = figma
      ? action.transitionType
      : action.animation?.animationType

    if (
      interactions.length > 1 ||
      item.actions?.length > 1 ||
      (transition &&
        !['INSTANT_TRANSITION', 'DISSOLVE', 'dissolve'].includes(transition))
    )
      warn('prototypes')
    e.prototype = {
      trigger: ['click', 'ON_CLICK'].includes(event) ? 'click' : 'hover',
      action: type,
      target: null,
      transition: ['DISSOLVE', 'dissolve'].includes(transition)
        ? 'dissolve'
        : 'instant',
      duration: Math.round(
        bound(
          figma
            ? num(action.transitionDuration, 0.25) * 1000
            : action.animation?.duration,
          0,
          3000,
          250
        )
      )
    }
    if (['navigate', 'overlay'].includes(type))
      pendingLinks.push({
        element: e,
        destination: figma ? guid(action.transitionNodeID) : action.destination
      })
  }

  let title =
    filename.replace(/\.(penpot|fig)$/i, '').slice(0, 160) || 'Imported design'

  const finalize = () => {
    for (const { element, destination } of pendingLinks) {
      const target = nativeIds.get(destination)

      if (
        target &&
        document.pages.some(
          p =>
            p.id === target ||
            p.elements.some(e => e.id === target && e.kind === 'frame')
        )
      )
        element.prototype!.target = target
      else {
        delete element.prototype
        warn('prototypes')
      }
    }

    for (const page of [...document.pages, ...(document.components ?? [])])
      for (const e of page.elements)
        if (e.kind === 'path' && e.pathData) {
          try {
            e.vector = parsePath(e.pathData)
          } catch {
            warn('paths')
          }
        }

    const normalized = layoutDocument(document)

    for (const [index, page] of normalized.pages.entries())
      if (JSON.stringify(page) !== JSON.stringify(document.pages[index]))
        warn('layout')

    return {
      title,
      document: documentSchema.parse(normalized),
      warnings: [...warnings].map(([code, count]) => ({ code, count }))
    }
  }
  const features = (source: Data) => {
    if (source.effects?.length || source.shadow?.length || source.blur)
      warn('effects')
    if (source.isMask || source.maskedGroup || source.type === 'MASK')
      warn('masks')
  }
  const capture = (page: Page, root: string, name: string) => {
    if (document.components!.length >= 100) {
      warn('components')

      return
    }

    const definition = componentFromSelection(page, [root], name)

    if (definition) document.components!.push(definition)
  }

  if (archive.has('manifest.json')) {
    const manifest = json(archive.get('manifest.json'))

    if (
      manifest.type !== 'penpot/export-files' ||
      ![1, 2].includes(manifest.version) ||
      !Array.isArray(manifest.files)
    )
      fail()
    title = String(manifest.files[0]?.name || title).slice(0, 160)

    for (const file of manifest.files) {
      const prefix = `files/${file.id}/pages/`
      const pages = [...archive.keys()]
        .filter(
          path =>
            path.startsWith(prefix) &&
            /^[^/]+\.json$/.test(path.slice(prefix.length))
        )
        .map(path => ({ path, data: json(archive.get(path)) }))
        .sort((a, b) => num(a.data.index) - num(b.data.index))

      for (const entry of pages) {
        if (document.pages.length >= 40) limited()

        const sourcePage = entry.data,
          page = makePage(
            'canvas',
            String(sourcePage.name || 'Page').slice(0, 160)
          ),
          sourcePrefix = entry.path.slice(0, -5) + '/'
        page.background = hex(sourcePage.options?.background, '#f4f4f5')
        const shapes: Data[] = sourcePage.objects
          ? Object.values(sourcePage.objects)
          : sourcePage.shapes && !Array.isArray(sourcePage.shapes)
            ? Object.values(sourcePage.shapes)
            : [...archive.keys()]
                .filter(
                  path =>
                    path.startsWith(sourcePrefix) && path.endsWith('.json')
                )
                .map(path => json(archive.get(path)))
        const byId = new Map(shapes.map(s => [s.id, s])),
          ids = new Map(shapes.map(s => [s.id, uid()])),
          ordered: Data[] = [],
          visited = new Set<string>()
        nativeIds.set(
          sourcePage.id ?? entry.path.split('/').pop()!.replace('.json', ''),
          page.id
        )
        for (const [source, target] of ids) nativeIds.set(source, target)

        const visit = (shape: Data, depth: number) => {
          if (depth > 32) limited()
          if (visited.has(shape.id)) return
          visited.add(shape.id)
          if (shape.id !== '00000000-0000-0000-0000-000000000000')
            ordered.push(shape)
          for (const id of shape.shapes ?? [])
            if (byId.has(id)) visit(byId.get(id)!, depth + 1)
        }

        for (const shape of shapes.filter(
          s => !byId.has(s.parentId) || s.id === s.parentId
        ))
          visit(shape, 0)
        for (const shape of shapes) visit(shape, 0)

        for (const shape of ordered) {
          features(shape)
          const kind = (
            {
              rect: 'rectangle',
              circle: 'ellipse',
              frame: 'frame',
              group: 'frame',
              text: 'text',
              image: 'image',
              path: 'path',
              bool: 'path'
            } as Record<string, Element['kind']>
          )[shape.type]

          if (!kind) {
            warn('unsupported')
            continue
          }

          const e = makeElement(
            kind,
            {
              x: bound(shape.x ?? shape.selrect?.x, -100000, 100000),
              y: bound(shape.y ?? shape.selrect?.y, -100000, 100000)
            },
            String(shape.name || shape.type).slice(0, 160)
          )
          e.id = ids.get(shape.id)!
          e.width = bound(shape.width ?? shape.selrect?.width, 1, 20000, 100)
          e.height = bound(shape.height ?? shape.selrect?.height, 1, 20000, 100)
          e.rotation = bound(shape.rotation, -360, 360)
          e.opacity = bound(shape.opacity, 0, 1, 1)
          e.hidden = !!shape.hidden
          e.locked = !!shape.blocked
          if (kind === 'frame')
            e.clipContent =
              shape.showContent === false || shape.clipContent === true
          prototype(e, shape)
          e.parent =
            shape.parentId !== '00000000-0000-0000-0000-000000000000' &&
            ['frame', 'group'].includes(byId.get(shape.parentId)?.type)
              ? ids.get(shape.parentId)
              : null
          const fill = shape.fills?.[0],
            stroke = shape.strokes?.[0]
          e.fill = hex(fill?.fillColor ?? fill?.color, '#ffffff')
          e.fillOpacity = fill
            ? bound(fill.fillOpacity ?? fill.opacity, 0, 1, 1)
            : 0
          e.stroke = hex(stroke?.strokeColor ?? stroke?.color, '#475569')
          e.strokeWidth = bound(stroke?.strokeWidth ?? stroke?.width, 0, 40)
          e.radius = bound(shape.r1 ?? shape.rx, 0, 1000)
          if (fill?.fillColorGradient || fill?.gradient)
            e.gradient = gradient(fill.fillColorGradient ?? fill.gradient)
          if (shape.fills?.length > 1) warn('paints')

          if (kind === 'text') {
            const runs: Data[] = []
            const walk = (node: Data, depth = 0) => {
              if (depth > 60) limited()
              if (node.text !== undefined) runs.push(node)
              for (const child of node.children ?? []) walk(child, depth + 1)
              if (node.type === 'paragraph') runs.push({ text: '\n' })
            }

            if (shape.content) walk(shape.content)
            e.text = runs
              .map(r => r.text)
              .join('')
              .trimEnd()
              .slice(0, 10000)
            const run = runs.find(r => r.fontSize) ?? runs[0] ?? {}
            e.fontSize = bound(run.fontSize, 8, 400, 16)
            e.fontWeight = num(run.fontWeight, 400) >= 600 ? '700' : '400'
            e.textColor = hex(
              run.fills?.[0]?.fillColor ?? run.fillColor ?? fill?.fillColor,
              '#1e293b'
            )
            e.align = ['left', 'center', 'right'].includes(run.textAlign)
              ? run.textAlign
              : 'left'
            e.verticalAlign = ['top', 'center', 'bottom'].includes(
              shape.content?.verticalAlign
            )
              ? shape.content.verticalAlign
              : 'top'
            e.textPadding = 0
            e.lineHeight = bound(run.lineHeight, 0.1, 10, 1.2)
            e.letterSpacing = bound(run.letterSpacing, -100, 100)
            if (
              typeof run.fontFamily === 'string' &&
              /^[\p{L}\p{N} _-]+$/u.test(run.fontFamily)
            )
              e.fontFamily = run.fontFamily.slice(0, 120)
            if (run.fontFamily && run.fontFamily !== 'Inter') warn('fonts')
            if (runs.filter(r => r.fontSize).length > 1) warn('richText')
          }

          if (kind === 'path') {
            const path: string[] = []

            for (const segment of Array.isArray(shape.content)
              ? shape.content
              : []) {
              const p = segment.params ?? {},
                point = (x: unknown, y: unknown) =>
                  `${num(x) - e.x} ${num(y) - e.y}`

              if (segment.command === 'move-to')
                path.push(`M${point(p.x, p.y)}`)
              else if (segment.command === 'line-to')
                path.push(`L${point(p.x, p.y)}`)
              else if (segment.command === 'curve-to')
                path.push(
                  `C${point(p.c1x, p.c1y)} ${point(p.c2x, p.c2y)} ${point(p.x, p.y)}`
                )
              else if (segment.command === 'close-path') path.push('Z')
              else warn('paths')
            }
            e.pathData =
              typeof shape.content === 'string' ? shape.content : path.join(' ')
            e.pathViewBox = {
              x: typeof shape.content === 'string' ? e.x : 0,
              y: typeof shape.content === 'string' ? e.y : 0,
              width: e.width,
              height: e.height
            }
            e.fillRule =
              shape.svgAttrs?.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'
            if (!e.pathData) warn('paths')
          }

          if (kind === 'image') {
            const media = archive.get(
              `files/${file.id}/media/${shape.metadata?.id}.json`
            )
            const storage = media ? json(media).mediaId : shape.metadata?.id
            const asset = [...archive].find(
              ([path]) =>
                path.startsWith(`objects/${storage}.`) &&
                !path.endsWith('.json')
            )
            e.image = raster(asset?.[1])
            if (!e.image) warn('images')
          }
          if (shape.layout === 'flex') {
            e.layout = {
              ...defaultLayout(),
              direction: String(shape.layoutFlexDir).startsWith('column')
                ? 'vertical'
                : 'horizontal',
              gap: bound(
                String(shape.layoutFlexDir).startsWith('column')
                  ? shape.layoutGap?.rowGap
                  : shape.layoutGap?.columnGap,
                0,
                2000
              ),
              padding: {
                top: bound(shape.layoutPadding?.p1, 0, 2000),
                right: bound(shape.layoutPadding?.p2, 0, 2000),
                bottom: bound(shape.layoutPadding?.p3, 0, 2000),
                left: bound(shape.layoutPadding?.p4, 0, 2000)
              },
              wrap: shape.layoutWrapType === 'wrap'
            }
            const align = shape.layoutAlignItems,
              justify = shape.layoutJustifyContent
            e.layout.align =
              align === 'center'
                ? 'center'
                : align === 'end'
                  ? 'end'
                  : align === 'stretch'
                    ? 'stretch'
                    : 'start'
            e.layout.justify =
              justify === 'center'
                ? 'center'
                : justify === 'end'
                  ? 'end'
                  : justify === 'space-between'
                    ? 'space-between'
                    : 'start'
            if (
              String(shape.layoutFlexDir).endsWith('reverse') ||
              ![undefined, 'start', 'center', 'end', 'space-between'].includes(
                justify
              )
            )
              warn('layout')
          } else if (shape.layout) warn('layout')
          e.widthMode =
            shape.layoutItemHSizing === 'auto'
              ? 'hug'
              : shape.layoutItemHSizing === 'fill'
                ? 'fill'
                : 'fixed'
          e.heightMode =
            shape.layoutItemVSizing === 'auto'
              ? 'hug'
              : shape.layoutItemVSizing === 'fill'
                ? 'fill'
                : 'fixed'
          if (shape.componentId && !shape.mainInstance) warn('components')
          page.elements.push(e)
        }

        const retained = new Set(
          page.elements.filter(e => e.kind === 'frame').map(e => e.id)
        )

        for (const e of page.elements)
          if (e.parent && !retained.has(e.parent)) e.parent = null
        for (const shape of ordered.filter(s => s.mainInstance))
          if (ids.has(shape.id))
            capture(page, ids.get(shape.id)!, String(shape.name || 'Component'))
        document.pages.push(page)
        const flows = sourcePage.options?.flows ?? sourcePage.flows
        const flow = Array.isArray(flows)
          ? flows[0]
          : flows
            ? (Object.values(flows)[0] as Data)
            : null

        if (!document.prototypeStart && flow?.startingFrame)
          document.prototypeStart = nativeIds.get(flow.startingFrame)
      }
    }
    if (!document.pages.length) fail()

    return finalize()
  }

  const canvas = archive.get('canvas.fig') ?? bytes
  const header = String.fromCharCode(...canvas.subarray(0, 8))

  if (header !== 'fig-kiwi' && header !== 'fig-jam.')
    throw Error(
      filename.endsWith('.penpot') ? 'legacyPenpot' : 'invalidNativeFile'
    )

  const view = new DataView(
      canvas.buffer,
      canvas.byteOffset,
      canvas.byteLength
    ),
    chunks: Uint8Array[] = []

  for (let offset = 12; offset < canvas.length;) {
    if (offset + 4 > canvas.length || chunks.length >= 20) fail()

    const size = view.getUint32(offset, true)
    offset += 4
    if (size > MAX || offset + size > canvas.length) fail()
    chunks.push(canvas.subarray(offset, offset + size))
    offset += size
  }
  if (chunks.length < 2) fail()

  const schemaBytes = inflateChunk(chunks[0]!)

  if (schemaBytes.length > 4000000) limited()

  const message = decodeKiwi(
    decodeBinarySchema(schemaBytes),
    inflateChunk(chunks[1]!)
  )

  if (!Array.isArray(message.nodeChanges) || message.nodeChanges.length > 10000)
    limited()

  const nodes = new Map<string, Data>()

  for (const node of message.nodeChanges)
    if (node.guid)
      nodes.set(guid(node.guid), { ...nodes.get(guid(node.guid)), ...node })

  const children = new Map<string, Data[]>()

  for (const node of nodes.values()) {
    const parent = guid(node.parentIndex?.guid)

    if (!children.has(parent)) children.set(parent, [])
    children.get(parent)!.push(node)
  }
  for (const items of children.values())
    items.sort((a, b) =>
      String(a.parentIndex?.position ?? '').localeCompare(
        String(b.parentIndex?.position ?? '')
      )
    )

  const ids = new Map([...nodes.keys()].map(id => [id, uid()]))

  for (const [source, target] of ids) nativeIds.set(source, target)

  const pages = [...nodes.values()].filter(n => n.type === 'CANVAS')

  if (!pages.length || pages.length > 40) fail()
  type Matrix = [number, number, number, number, number, number]

  const compose = (a: Matrix, b: Matrix): Matrix => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ]

  for (const sourcePage of pages) {
    const page = makePage(
      header === 'fig-jam.' ? 'blackboard' : 'canvas',
      String(sourcePage.name || 'Page').slice(0, 160)
    )
    page.id = ids.get(guid(sourcePage.guid))!
    const visited = new Set<string>()
    const visit = (
      node: Data,
      parent: string | null,
      world: Matrix,
      depth: number
    ) => {
      const key = guid(node.guid)

      if (visited.has(key)) fail()
      visited.add(key)
      if (depth > 32 || page.elements.length >= 2000) limited()
      if (node.removed) return
      features(node)
      const kind = [
        'FRAME',
        'GROUP',
        'COMPONENT',
        'INSTANCE',
        'SYMBOL'
      ].includes(node.type)
        ? 'frame'
        : ['RECTANGLE', 'ROUNDED_RECTANGLE'].includes(node.type)
          ? 'rectangle'
          : node.type === 'ELLIPSE'
            ? 'ellipse'
            : node.type === 'TEXT'
              ? 'text'
              : ['VECTOR', 'LINE', 'STAR', 'REGULAR_POLYGON'].includes(
                    node.type
                  )
                ? 'path'
                : node.type === 'STICKY'
                  ? 'sticky'
                  : null
      const tr = node.transform ?? {},
        matrix = compose(world, [
          num(tr.m00, 1),
          num(tr.m10),
          num(tr.m01),
          num(tr.m11, 1),
          num(tr.m02),
          num(tr.m12)
        ])

      let nextParent = parent
      if (kind) {
        const rotation = Math.atan2(matrix[1], matrix[0]),
          sx = Math.hypot(matrix[0], matrix[1]),
          sy = Math.hypot(matrix[2], matrix[3])
        const width = bound(num(node.size?.x, 100) * sx, 1, 20000),
          height = bound(num(node.size?.y, 100) * sy, 1, 20000)
        const center = {
          x:
            matrix[4] +
            (matrix[0] * num(node.size?.x, 100) +
              matrix[2] * num(node.size?.y, 100)) /
              2,
          y:
            matrix[5] +
            (matrix[1] * num(node.size?.x, 100) +
              matrix[3] * num(node.size?.y, 100)) /
              2
        }
        const e = makeElement(
          kind,
          {
            x: bound(center.x - width / 2, -100000, 100000),
            y: bound(center.y - height / 2, -100000, 100000)
          },
          String(node.name || node.type).slice(0, 160)
        )
        e.id = ids.get(key)!
        e.parent = parent
        e.width = width
        e.height = height
        e.rotation = (rotation * 180) / Math.PI
        e.opacity = bound(node.opacity, 0, 1, 1)
        e.hidden = node.visible === false
        e.locked = !!node.locked
        if (kind === 'frame')
          e.clipContent =
            node.clipsContent === true || node.frameMaskDisabled === false
        prototype(e, node, true)
        if (node.prototypeStartingPoint && !document.prototypeStart)
          document.prototypeStart = e.id

        const fill = node.fillPaints?.find((p: Data) => p.visible !== false),
          stroke = node.strokePaints?.find((p: Data) => p.visible !== false)
        e.fill = hex(fill?.color, '#ffffff')
        e.fillOpacity = fill ? bound(fill.opacity ?? fill.color?.a, 0, 1, 1) : 0
        e.stroke = hex(stroke?.color, '#475569')
        e.strokeWidth = stroke ? bound(node.strokeWeight, 0, 40, 1) : 0
        e.radius = bound(node.cornerRadius, 0, 1000)
        if (fill?.type === 'IMAGE') {
          const hash = fill.image?.hash ?? fill.imageHash
          const name =
            hash instanceof Uint8Array
              ? [...hash].map(b => b.toString(16).padStart(2, '0')).join('')
              : String(hash ?? '')
          const asset =
            archive.get(`images/${name}`) ??
            [...archive].find(
              ([path]) => path.startsWith(`images/${name}.`) && name
            )?.[1]
          e.image = raster(asset)
          if (e.image) e.kind = kind === 'frame' ? 'frame' : 'image'
          else warn('images')
        } else if (
          ['GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(fill?.type)
        ) {
          e.gradient = gradient(fill, true)
          if (node.fillPaints?.length > 1) warn('paints')
        } else if (
          (fill && fill.type !== 'SOLID') ||
          node.fillPaints?.length > 1
        )
          warn('paints')

        if (kind === 'text') {
          e.text = String(
            node.textData?.characters ?? node.characters ?? ''
          ).slice(0, 10000)
          e.fontSize = bound(node.fontSize, 8, 400, 16)
          e.fontWeight = /bold|semibold/i.test(node.fontName?.style ?? '')
            ? '700'
            : '400'
          e.textColor = hex(fill?.color, '#1e293b')
          e.textPadding = 0
          e.verticalAlign =
            node.textAlignVertical === 'CENTER'
              ? 'center'
              : node.textAlignVertical === 'BOTTOM'
                ? 'bottom'
                : 'top'
          e.lineHeight =
            node.lineHeight?.units === 'PERCENT'
              ? bound(num(node.lineHeight.value) / 100, 0.1, 10, 1.2)
              : node.lineHeight?.units === 'PIXELS'
                ? bound(num(node.lineHeight.value) / e.fontSize, 0.1, 10, 1.2)
                : 1.2
          e.letterSpacing = bound(
            node.letterSpacing?.units === 'PERCENT'
              ? (num(node.letterSpacing.value) * e.fontSize) / 100
              : node.letterSpacing?.value,
            -100,
            100
          )
          if (
            typeof node.fontName?.family === 'string' &&
            /^[\p{L}\p{N} _-]+$/u.test(node.fontName.family)
          )
            e.fontFamily = node.fontName.family.slice(0, 120)
          e.align =
            node.textAlignHorizontal === 'CENTER'
              ? 'center'
              : node.textAlignHorizontal === 'RIGHT'
                ? 'right'
                : 'left'
          if (node.textData?.characterStyleIDs?.length) warn('richText')
          if (node.fontName?.family && node.fontName.family !== 'Inter')
            warn('fonts')
        }

        if (kind === 'path') {
          const paths: string[] = []

          for (const geometry of node.fillGeometry ??
            node.strokeGeometry ??
            []) {
            const blob =
              message.blobs?.[geometry.commandsBlob ?? geometry.commands]?.bytes

            if (!(blob instanceof Uint8Array)) continue

            const data = new DataView(
              blob.buffer,
              blob.byteOffset,
              blob.byteLength
            )

            for (let offset = 0; offset < blob.length;) {
              const command = blob[offset++]!,
                count = [0, 2, 2, 4, 6][command]

              if (count === undefined || offset + count * 4 > blob.length) {
                warn('paths')
                break
              }

              const values = Array.from(
                { length: count },
                (_, i) =>
                  data.getFloat32(offset + i * 4, true) * (i % 2 ? sy : sx)
              )
              offset += count * 4
              if (!values.every(Number.isFinite)) fail()
              paths.push(['Z', 'M', 'L', 'Q', 'C'][command]! + values.join(' '))
            }
          }
          e.pathData = paths.join(' ')
          e.pathViewBox = { x: 0, y: 0, width, height }
          if (node.fillGeometry?.some((g: Data) => g.windingRule === 'ODD'))
            e.fillRule = 'evenodd'
          if (!e.pathData && node.type === 'LINE')
            e.pathData = `M0 0L${width} ${height}`
          if (!e.pathData) warn('paths')
        }

        if (kind === 'frame') {
          nextParent = e.id

          if (['HORIZONTAL', 'VERTICAL'].includes(node.stackMode)) {
            e.layout = {
              ...defaultLayout(),
              direction:
                node.stackMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
              gap: bound(node.stackSpacing, 0, 2000),
              padding: {
                top: bound(
                  node.stackVerticalPadding ?? node.stackPadding,
                  0,
                  2000
                ),
                right: bound(
                  node.stackPaddingRight ??
                    node.stackHorizontalPadding ??
                    node.stackPadding,
                  0,
                  2000
                ),
                bottom: bound(
                  node.stackPaddingBottom ??
                    node.stackVerticalPadding ??
                    node.stackPadding,
                  0,
                  2000
                ),
                left: bound(
                  node.stackHorizontalPadding ?? node.stackPadding,
                  0,
                  2000
                )
              },
              align:
                node.stackCounterAlignItems === 'CENTER'
                  ? 'center'
                  : node.stackCounterAlignItems === 'MAX'
                    ? 'end'
                    : 'start',
              justify:
                node.stackPrimaryAlignItems === 'CENTER'
                  ? 'center'
                  : node.stackPrimaryAlignItems === 'MAX'
                    ? 'end'
                    : node.stackPrimaryAlignItems === 'SPACE_BETWEEN'
                      ? 'space-between'
                      : 'start',
              wrap: node.stackWrap === 'WRAP'
            }
            const sizing =
              node.stackMode === 'HORIZONTAL' ? 'widthMode' : 'heightMode'
            const crossSizing =
              node.stackMode === 'HORIZONTAL' ? 'heightMode' : 'widthMode'
            e[sizing] = String(node.stackPrimarySizing).startsWith(
              'RESIZE_TO_FIT'
            )
              ? 'hug'
              : 'fixed'
            e[crossSizing] = String(node.stackCounterSizing).startsWith(
              'RESIZE_TO_FIT'
            )
              ? 'hug'
              : 'fixed'
            if (
              node.stackCounterAlignItems === 'BASELINE' ||
              node.stackPrimaryAlignItems === 'SPACE_EVENLY'
            )
              warn('layout')
          }
          if (node.type === 'INSTANCE') warn('components')
        }

        const parentNode = nodes.get(guid(node.parentIndex?.guid))

        if (
          parentNode &&
          ['HORIZONTAL', 'VERTICAL'].includes(parentNode.stackMode)
        ) {
          if (node.stackChildPrimaryGrow)
            e[
              parentNode.stackMode === 'HORIZONTAL' ? 'widthMode' : 'heightMode'
            ] = 'fill'
          if (node.stackChildAlignSelf === 'STRETCH')
            e[
              parentNode.stackMode === 'HORIZONTAL' ? 'heightMode' : 'widthMode'
            ] = 'fill'
          if (node.stackPositioning === 'ABSOLUTE') warn('layout')
        }
        if (
          Math.abs(matrix[0] * matrix[2] + matrix[1] * matrix[3]) > 0.001 ||
          matrix[0] * matrix[3] - matrix[1] * matrix[2] < 0
        )
          warn('transforms')
        page.elements.push(e)
      } else warn('unsupported')
      for (const child of children.get(key) ?? [])
        visit(child, nextParent, matrix, depth + 1)
      if (['COMPONENT', 'SYMBOL'].includes(node.type))
        capture(page, ids.get(key)!, String(node.name || 'Component'))
    }

    for (const node of children.get(guid(sourcePage.guid)) ?? [])
      visit(node, null, [1, 0, 0, 1, 0, 0], 0)
    document.pages.push(page)
    if (!document.prototypeStart && sourcePage.prototypeStartNodeID)
      document.prototypeStart = ids.get(guid(sourcePage.prototypeStartNodeID))
  }

  return finalize()
}
