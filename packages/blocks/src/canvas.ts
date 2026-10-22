import { assertContent, safeHref } from './index'

export type CanvasBlockType =
  | 'document'
  | 'heading'
  | 'callout'
  | 'button'
  | 'divider'
  | 'native'
  | 'widget'
  | 'database'

export type CanvasBlock = {
  id: string
  type: CanvasBlockType
  width: 'full' | 'half' | 'third'
  title: string
  content: string
  url: string
  widget: string
  height?: number
  database?: {
    workspaceId: string
    baseId: string
    viewId?: string
    height?: number
  }
}

export type CanvasPage = {
  version: 1
  title: string
  icon: string
  fullWidth: boolean
  revision: number
  updated: string | null
  blocks: CanvasBlock[]
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const types = new Set<string>([
  'document',
  'heading',
  'callout',
  'button',
  'divider',
  'native',
  'widget',
  'database'
])

export function canvasKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 200 &&
    // Each repeated segment must end at a slash, so rejection stays linear.
    /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/.test(value)
  )
}

export function canvasLink(value: string) {
  if (canvasKey(value)) return true
  if (!safeHref(value)) return false

  try {
    const url = new URL(value)

    return (
      !url.username &&
      !url.password &&
      ![...url.searchParams.keys()].some(key =>
        /token|password|secret|api[_-]?key|authorization|^(auth|key)$/i.test(
          key
        )
      )
    )
  } catch {
    return false
  }
}

export function validateCanvasPage(
  value: unknown
): asserts value is CanvasPage {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid page')

  const page = value as Record<string, unknown>

  if (
    Object.keys(page).some(
      key =>
        ![
          'version',
          'title',
          'icon',
          'fullWidth',
          'revision',
          'updated',
          'blocks'
        ].includes(key)
    ) ||
    page.version !== 1 ||
    typeof page.title !== 'string' ||
    !page.title.trim() ||
    Array.from(page.title).length > 255 ||
    typeof page.icon !== 'string' ||
    !/^lucide:[a-z0-9-]{1,60}$/.test(page.icon) ||
    typeof page.fullWidth !== 'boolean' ||
    typeof page.revision !== 'number' ||
    !Number.isSafeInteger(page.revision) ||
    page.revision < 0 ||
    !(
      page.updated === null ||
      (typeof page.updated === 'string' &&
        Number.isFinite(Date.parse(page.updated)))
    ) ||
    !Array.isArray(page.blocks) ||
    page.blocks.length > 100
  )
    throw Error('Invalid page fields')

  const ids = new Set<string>()

  let native = 0

  for (const candidate of page.blocks as unknown[]) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw Error('Invalid block')

    const block = candidate as Record<string, unknown>

    if (
      Object.keys(block).some(
        key =>
          ![
            'id',
            'type',
            'width',
            'title',
            'content',
            'url',
            'widget',
            'database',
            'height'
          ].includes(key)
      ) ||
      typeof block.id !== 'string' ||
      !uuid.test(block.id) ||
      ids.has(block.id) ||
      typeof block.type !== 'string' ||
      !types.has(block.type) ||
      typeof block.width !== 'string' ||
      !['full', 'half', 'third'].includes(block.width) ||
      typeof block.title !== 'string' ||
      block.title.length > 160 ||
      typeof block.content !== 'string' ||
      block.content.length > 1_000_000 ||
      typeof block.url !== 'string' ||
      block.url.length > 2048 ||
      typeof block.widget !== 'string' ||
      block.widget.length > 200
    )
      throw Error('Invalid block')
    ids.add(block.id)
    if (
      block.height !== undefined &&
      (typeof block.height !== 'number' ||
        !Number.isFinite(block.height) ||
        block.height < 0 ||
        block.height > 1000)
    )
      throw Error('Invalid widget height')
    if (block.type === 'native' && ++native > 1)
      throw Error('A page can contain only one area dashboard')
    if (block.type === 'document') assertContent(block.content)
    if (block.type === 'database') {
      const database = block.database as Record<string, unknown> | undefined
      if (
        !database ||
        typeof database !== 'object' ||
        Array.isArray(database) ||
        Object.keys(database).some(
          key => !['workspaceId', 'baseId', 'viewId', 'height'].includes(key)
        ) ||
        typeof database.workspaceId !== 'string' ||
        !uuid.test(database.workspaceId) ||
        typeof database.baseId !== 'string' ||
        !uuid.test(database.baseId) ||
        (database.height !== undefined &&
          (typeof database.height !== 'number' ||
            !Number.isFinite(database.height) ||
            database.height < 0 ||
            database.height > 1200)) ||
        (database.viewId !== undefined &&
          (typeof database.viewId !== 'string' || !uuid.test(database.viewId)))
      )
        throw Error('Choose a database view')
    } else if (block.database !== undefined)
      throw Error('Only database blocks accept a data source')
    if (block.type === 'button' && !canvasLink(block.url))
      throw Error('Use a safe web address or workspace page path')
  }
  if (JSON.stringify(page).length > 2_000_000)
    throw Error('Page exceeds the size limit')
}

export function moveCanvasBlock(
  blocks: CanvasBlock[],
  id: string,
  beforeId: string | null
): CanvasBlock[] {
  if (
    id === beforeId ||
    !blocks.some(block => block.id === id) ||
    (beforeId !== null && !blocks.some(block => block.id === beforeId))
  )
    return blocks

  const moving = blocks.find(block => block.id === id)!,
    remaining = blocks.filter(block => block.id !== id)
  const index =
    beforeId === null
      ? remaining.length
      : remaining.findIndex(block => block.id === beforeId)

  return [...remaining.slice(0, index), moving, ...remaining.slice(index)]
}
