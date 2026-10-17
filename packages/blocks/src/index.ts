import {
  CANONICAL_PREFIX,
  canonicalMarkdown,
  canonicalReferences,
  canonicalText
} from './canonical'

export * from './canonical'
export * from './appearance'
export const BLOCK_PREFIX = 'zillion:blocks:v1\n'
export * from './canvas'

export const MAX_CONTENT_LENGTH = 1_000_000

export type PageKind = 'document' | 'record' | 'note' | 'redraw'

export type PageTarget = {
  id: string
  kind: PageKind
  title: string
  context?: string
}

export type BlockMark = { type: string; attrs?: Record<string, unknown> }

export type BlockNode = {
  type: string
  attrs?: Record<string, unknown>
  text?: string
  marks?: BlockMark[]
  content?: BlockNode[]
}

export type BlockDocument = BlockNode & { type: 'doc'; content: BlockNode[] }

export type PageReference = {
  kind?: PageKind
  id?: string
  title: string
  block?: string
}

export type GraphNode<Kind extends string = PageKind> = Omit<
  PageTarget,
  'kind'
> & {
  kind: Kind
  key: string
  tags?: string[]
  parent?: string | null
  excerpt?: string
  entityType?: string
  href?: string
  color?: string
}

export type PageEdgeKind = 'mention' | 'relation' | 'related' | 'parent'
export type GraphEdgeKind =
  PageEdgeKind | 'tag' | 'topic' | 'context' | 'collection' | 'embed'

export type KnowledgeDatabase = {
  id: string
  title: string
  href: string
  recordIds: string[]
  embeddedIn: string[]
}

export type GraphEdge<Kind extends string = PageEdgeKind> = {
  id: string
  source: string
  target: string
  kind: Kind
  label: string
  color?: string
  strength?: number
  evidence?: string[]
  method?: 'tag' | 'topic' | 'lexical' | 'embedding'
}

export type KnowledgeSnapshot<
  Kind extends string = PageKind,
  EdgeKind extends string = PageEdgeKind
> = {
  nodes: GraphNode<Kind>[]
  edges: GraphEdge<EdgeKind>[]
  unresolved: number
  databases?: KnowledgeDatabase[]
}

export const pageKey = (page: Pick<PageTarget, 'kind' | 'id'>) =>
  `${page.kind}:${page.id}`

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const kinds: PageKind[] = ['document', 'record', 'note', 'redraw']
const blocks = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'linkedDatabase',
  'callout',
  'pageEmbed'
])
const inline = new Set(['text', 'hardBreak', 'pageLink'])
const markTypes = new Set([
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
  'link'
])
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function safeHref(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(https?:\/\/|mailto:)/i.test(value) &&
    !Array.from(value).some(character => character.charCodeAt(0) <= 32)
  )
}

/** Validate the durable editor format independently of a browser or editor library. */
export function validateDocument(
  value: unknown
): asserts value is BlockDocument {
  let count = 0

  const ids = new Set<string>()

  function visit(raw: unknown, parent: string | null, depth: number) {
    if (++count > 10_000 || depth > 32 || !object(raw))
      throw new Error('Invalid or excessive document structure')

    const { type, attrs, text, marks, content } = raw

    if (
      Object.keys(raw).some(
        key => !['type', 'attrs', 'text', 'marks', 'content'].includes(key)
      )
    )
      throw new Error('Unknown block property')
    if (typeof type !== 'string') throw new Error('Block type is required')

    const permitted =
      parent === null
        ? type === 'doc'
        : parent === 'doc' || parent === 'blockquote' || parent === 'callout'
          ? blocks.has(type)
          : parent === 'bulletList' || parent === 'orderedList'
            ? type === 'listItem'
            : parent === 'taskList'
              ? type === 'taskItem'
              : parent === 'listItem' || parent === 'taskItem'
                ? blocks.has(type)
                : parent === 'codeBlock'
                  ? type === 'text'
                  : ['paragraph', 'heading'].includes(parent)
                    ? inline.has(type)
                    : false

    if (!permitted)
      throw new Error(`Invalid ${String(type)} block in ${parent ?? 'root'}`)
    if (attrs !== undefined && !object(attrs))
      throw new Error('Invalid block attributes')

    const allowed = ['id']

    if (type === 'heading') allowed.push('level')
    if (type === 'orderedList') allowed.push('start', 'type')
    if (type === 'taskItem') allowed.push('checked')
    if (type === 'codeBlock') allowed.push('language')
    if (type === 'pageLink' || type === 'pageEmbed')
      allowed.push('kind', 'targetId', 'label')
    if (type === 'linkedDatabase')
      allowed.push('workspaceId', 'baseId', 'viewId', 'title', 'height')
    if (attrs && Object.keys(attrs).some(key => !allowed.includes(key)))
      throw new Error('Unknown block attribute')

    if (attrs?.id != null) {
      if (
        typeof attrs.id !== 'string' ||
        !uuid.test(attrs.id) ||
        ids.has(attrs.id)
      )
        throw new Error('Invalid or duplicate block ID')
      ids.add(attrs.id)
    }
    if (type === 'heading' && ![1, 2, 3].includes(Number(attrs?.level)))
      throw new Error('Invalid heading level')
    if (
      type === 'orderedList' &&
      attrs?.start !== undefined &&
      (!Number.isSafeInteger(attrs.start) || Number(attrs.start) < 1)
    )
      throw new Error('Invalid list start')
    if (
      type === 'orderedList' &&
      attrs?.type != null &&
      !['1', 'a', 'A', 'i', 'I'].includes(String(attrs.type))
    )
      throw new Error('Invalid numbering style')
    if (type === 'taskItem' && typeof attrs?.checked !== 'boolean')
      throw new Error('Invalid task state')
    if (
      type === 'codeBlock' &&
      attrs?.language != null &&
      (typeof attrs.language !== 'string' || attrs.language.length > 100)
    )
      throw new Error('Invalid code language')
    if (
      (type === 'pageLink' || type === 'pageEmbed') &&
      (!kinds.includes(attrs?.kind as PageKind) ||
        typeof attrs?.targetId !== 'string' ||
        !uuid.test(attrs.targetId) ||
        typeof attrs.label !== 'string' ||
        attrs.label.length > 255)
    )
      throw new Error('Invalid page link')
    if (
      type === 'linkedDatabase' &&
      (!['workspaceId', 'baseId', 'viewId'].every(
        key =>
          typeof attrs?.[key] === 'string' && uuid.test(attrs[key] as string)
      ) ||
        typeof attrs?.title !== 'string' ||
        attrs.title.length > 255 ||
        typeof attrs.height !== 'number' ||
        !Number.isFinite(attrs.height) ||
        (attrs.height !== 0 && attrs.height < 240) ||
        attrs.height > 1200)
    )
      throw new Error('Invalid inline database')
    if (
      type === 'text'
        ? typeof text !== 'string' || !text.length
        : text !== undefined
    )
      throw new Error('Invalid block text')

    if (marks !== undefined) {
      if (type !== 'text' || !Array.isArray(marks) || marks.length > 6)
        throw new Error('Invalid text marks')

      for (const mark of marks) {
        if (
          !object(mark) ||
          !markTypes.has(String(mark.type)) ||
          Object.keys(mark).some(key => !['type', 'attrs'].includes(key))
        )
          throw new Error('Unknown text mark')
        if (mark.type === 'link') {
          if (
            !object(mark.attrs) ||
            !safeHref(mark.attrs.href) ||
            Object.keys(mark.attrs).some(
              key => !['href', 'target', 'rel', 'class'].includes(key)
            ) ||
            (mark.attrs.target != null &&
              !['_blank', '_self'].includes(String(mark.attrs.target))) ||
            mark.attrs.class != null
          )
            throw new Error('Unsafe link')
        } else if (
          mark.attrs !== undefined &&
          (!object(mark.attrs) || Object.keys(mark.attrs).length)
        )
          throw new Error('Invalid mark attributes')
      }
    }
    if (content !== undefined && !Array.isArray(content))
      throw new Error('Invalid block children')

    if (
      inline.has(type) ||
      ['horizontalRule', 'linkedDatabase', 'pageEmbed'].includes(type)
    ) {
      if (content !== undefined)
        throw new Error('Leaf blocks cannot have children')
    } else {
      if (
        [
          'doc',
          'bulletList',
          'orderedList',
          'taskList',
          'listItem',
          'taskItem',
          'blockquote',
          'callout'
        ].includes(type) &&
        (!Array.isArray(content) || !content.length)
      )
        throw new Error('Empty block container')
      if (
        ['listItem', 'taskItem'].includes(type) &&
        content?.[0]?.type !== 'paragraph'
      )
        throw new Error('List items must begin with a paragraph')
      for (const child of content ?? []) visit(child, type, depth + 1)
    }
  }
  visit(value, null, 0)
  if (JSON.stringify(value).length > MAX_CONTENT_LENGTH - BLOCK_PREFIX.length)
    throw new Error('Document is too large')
}

export function assertContent(value: string) {
  if (value.length > MAX_CONTENT_LENGTH)
    throw new Error('Document is too large')
  if (value.startsWith('zillion:blocks:') && !value.startsWith(BLOCK_PREFIX))
    throw new Error('Unsupported document version')
  if (value.startsWith(BLOCK_PREFIX))
    validateDocument(JSON.parse(value.slice(BLOCK_PREFIX.length)))
}

export function serializeDocument(value: BlockNode): string {
  validateDocument(value)

  return BLOCK_PREFIX + JSON.stringify(value)
}

const paragraph = (text: string): BlockNode => ({
  type: 'paragraph',
  ...(text ? { content: [{ type: 'text', text }] } : {})
})

/** Plain text is displayed losslessly until the user chooses to save blocks. */
export function parseContent(value: string): BlockDocument {
  assertContent(value)
  if (value.startsWith(BLOCK_PREFIX))
    return JSON.parse(value.slice(BLOCK_PREFIX.length)) as BlockDocument

  return { type: 'doc', content: value.split('\n').map(paragraph) }
}

export function contentText(value: string): string {
  if (value.startsWith(CANONICAL_PREFIX)) return canonicalText(value)
  if (!value.startsWith(BLOCK_PREFIX)) return value

  const doc = parseContent(value)

  function text(node: BlockNode): string {
    if (node.type === 'pageLink' || node.type === 'pageEmbed')
      return String(node.attrs?.label ?? '')
    if (node.type === 'linkedDatabase') return String(node.attrs?.title ?? '')
    if (node.type === 'hardBreak') return '\n'

    return (
      node.text ??
      (node.content ?? [])
        .map(text)
        .join(inline.has(node.content?.[0]?.type ?? '') ? '' : '\n')
    )
  }

  return text(doc)
}

export function extractReferences(value: string): PageReference[] {
  if (value.startsWith(CANONICAL_PREFIX)) return canonicalReferences(value)
  const references: PageReference[] = []

  function wikis(text: string) {
    for (const match of text.matchAll(/\[\[([^\]\n]{1,400})\]\]/g)) {
      const [destination] = match[1].split('|')
      const [title, block] = destination.split('#')

      if (title.trim())
        references.push({ title: title.trim(), ...(block ? { block } : {}) })
    }
  }

  if (!value.startsWith(BLOCK_PREFIX)) {
    wikis(value.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, ''))
  } else {
    function visit(node: BlockNode) {
      if (node.type === 'codeBlock') return
      if (node.type === 'pageLink' || node.type === 'pageEmbed')
        references.push({
          kind: node.attrs!.kind as PageKind,
          id: String(node.attrs!.targetId),
          title: String(node.attrs!.label)
        })
      if (node.text && !node.marks?.some(mark => mark.type === 'code'))
        wikis(node.text)
      node.content?.forEach(visit)
    }
    visit(parseContent(value))
  }

  return references
}

export function resolveReference(
  reference: PageReference,
  pages: PageTarget[]
): PageTarget | undefined {
  if (reference.id && reference.kind)
    return pages.find(
      page => page.id === reference.id && page.kind === reference.kind
    )

  const matches = pages.filter(
    page =>
      page.title.toLocaleLowerCase() === reference.title.toLocaleLowerCase()
  )

  return matches.length === 1 ? matches[0] : undefined
}

/** Resolve unambiguous wiki links to durable IDs when saving, so renames keep links intact. */
export function stabilizeReferences(
  value: string,
  pages: PageTarget[]
): string {
  if (!value.startsWith(BLOCK_PREFIX)) return value

  const doc = parseContent(value)

  function visit(node: BlockNode): BlockNode {
    if (node.type === 'codeBlock') return node
    if (!node.content) return node

    return {
      ...node,
      content: node.content.flatMap(child => {
        if (
          child.type !== 'text' ||
          child.marks?.some(mark => mark.type === 'code')
        )
          return [visit(child)]

        const result: BlockNode[] = []

        let offset = 0

        for (const match of child.text!.matchAll(/\[\[([^\]\n]{1,400})\]\]/g)) {
          const [title, alias] = match[1].split('|')
          const page = title.includes('#')
            ? undefined
            : resolveReference({ title: title.trim() }, pages)

          if (!page) continue
          if (match.index > offset)
            result.push({
              ...child,
              text: child.text!.slice(offset, match.index)
            })
          result.push({
            type: 'pageLink',
            attrs: {
              kind: page.kind,
              targetId: page.id,
              label: (alias?.trim() || page.title).slice(0, 255)
            }
          })
          offset = match.index + match[0].length
        }
        if (!offset) return [child]
        if (offset < child.text!.length)
          result.push({ ...child, text: child.text!.slice(offset) })

        return result
      })
    }
  }

  return serializeDocument(visit(doc))
}

export function markdownContent(value: string): string {
  if (value.startsWith(CANONICAL_PREFIX)) return canonicalMarkdown(value)
  if (!value.startsWith(BLOCK_PREFIX)) return value

  function render(node: BlockNode): string {
    if (node.type === 'pageLink' || node.type === 'pageEmbed')
      return `[[${String(node.attrs?.label)}]]`
    if (node.type === 'linkedDatabase')
      return `[[${String(node.attrs?.title)}]]`
    if (node.type === 'hardBreak') return '  \n'
    if (node.type === 'horizontalRule') return '---'
    if (node.type === 'text')
      return (node.marks ?? []).reduce((text, mark) => {
        const wrap = { bold: '**', italic: '*', strike: '~~', code: '`' }[
          mark.type
        ]

        return wrap
          ? wrap + text + wrap
          : mark.type === 'link'
            ? `[${text}](${String(mark.attrs?.href)})`
            : text
      }, node.text ?? '')

    const children = (node.content ?? []).map(render)

    if (node.type === 'heading')
      return '#'.repeat(Number(node.attrs?.level)) + ' ' + children.join('')
    if (node.type === 'codeBlock')
      return (
        '```' +
        String(node.attrs?.language ?? '') +
        '\n' +
        children.join('') +
        '\n```'
      )
    if (node.type === 'blockquote' || node.type === 'callout')
      return children
        .join('\n\n')
        .split('\n')
        .map(line => '> ' + line)
        .join('\n')
    if (['bulletList', 'orderedList', 'taskList'].includes(node.type))
      return children
        .map((text, i) => {
          const item = node.content![i]
          const prefix =
            node.type === 'orderedList'
              ? `${Number(node.attrs?.start ?? 1) + i}. `
              : node.type === 'taskList'
                ? `- [${item.attrs?.checked ? 'x' : ' '}] `
                : '- '

          return prefix + text.replace(/\n/g, '\n  ')
        })
        .join('\n')

    return children.join(
      ['paragraph', 'heading'].includes(node.type) ? '' : '\n\n'
    )
  }

  return render(parseContent(value))
}

export function localGraph(
  snapshot: KnowledgeSnapshot,
  focus: string,
  depth = 1
): KnowledgeSnapshot {
  const included = new Set([focus])

  for (let i = 0; i < Math.min(3, Math.max(0, depth)); i++) {
    const frontier = new Set(included)

    for (const edge of snapshot.edges)
      if (frontier.has(edge.source) || frontier.has(edge.target)) {
        included.add(edge.source)
        included.add(edge.target)
      }
  }

  return {
    ...snapshot,
    nodes: snapshot.nodes.filter(node => included.has(node.key)),
    edges: snapshot.edges.filter(
      edge => included.has(edge.source) && included.has(edge.target)
    )
  }
}
