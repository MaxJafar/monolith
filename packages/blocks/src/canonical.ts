import type { PageReference } from './index'

export const CANONICAL_PREFIX = 'monolith:editor:v2\n'
export type CanonicalBlock = {
  id: string
  flavour: string
  props: Record<string, unknown>
  children: CanonicalBlock[]
}
export type CanonicalSnapshot = {
  type: 'page'
  meta: { id: string; title: string }
  blocks: CanonicalBlock
}
type Delta = { insert: string; attributes?: Record<string, unknown> }
function deltas(value: unknown): Delta[] {
  if (!value || typeof value !== 'object') return []
  const text = value as {
    '$blocksuite:internal:text$'?: unknown
    delta?: unknown
  }
  // Current BlockSuite writes a marker plus delta; migrated snapshots can
  // contain the older inline delta array. Both represent the same saved text.
  const marker = text['$blocksuite:internal:text$']
  const content = marker === true ? text.delta : marker
  return Array.isArray(content)
    ? content.filter(
        (item): item is Delta => !!item && typeof item.insert === 'string'
      )
    : []
}
export function parseCanonical(value: string): CanonicalSnapshot {
  if (!value.startsWith(CANONICAL_PREFIX) || value.length > 5_000_000)
    throw new Error('Invalid canonical editor content')
  const snapshot = JSON.parse(
    value.slice(CANONICAL_PREFIX.length)
  ) as CanonicalSnapshot
  if (snapshot?.type !== 'page' || !snapshot.meta?.id || !snapshot.blocks)
    throw new Error('Invalid canonical snapshot')
  let count = 0
  const validate = (block: CanonicalBlock, depth: number) => {
    if (
      ++count > 10000 ||
      depth > 40 ||
      !block ||
      typeof block.flavour !== 'string' ||
      !block.props ||
      !Array.isArray(block.children)
    )
      throw new Error('Invalid canonical block tree')
    block.children.forEach(child => validate(child, depth + 1))
  }
  validate(snapshot.blocks, 0)
  return snapshot
}
export function serializeCanonical(snapshot: CanonicalSnapshot) {
  return CANONICAL_PREFIX + JSON.stringify(snapshot)
}
/** Inline views reference a database; they do not own copies of its records. */
export function canonicalDatabaseReferences(snapshot: CanonicalSnapshot) {
  const references: { workspaceId: string; baseId: string }[] = []
  const visit = (block: CanonicalBlock) => {
    if (
      block.flavour === 'monolith:linked-database' &&
      typeof block.props.workspaceId === 'string' &&
      typeof block.props.baseId === 'string'
    )
      references.push({
        workspaceId: block.props.workspaceId,
        baseId: block.props.baseId
      })
    block.children.forEach(visit)
  }
  visit(snapshot.blocks)
  return references
}
export function canonicalText(value: string) {
  const lines: string[] = []
  function visit(block: CanonicalBlock) {
    if (block.flavour !== 'affine:page') {
      const text = deltas(block.props.text)
        .map(item => item.insert)
        .join('')
      if (text) lines.push(text)
      if (block.flavour === 'monolith:module') {
        const config = block.props.config as
          { title?: unknown; content?: unknown } | undefined
        if (typeof config?.title === 'string') lines.push(config.title)
      }
    }
    block.children.forEach(visit)
  }
  visit(parseCanonical(value).blocks)
  return lines.join('\n')
}
export function canonicalReferences(value: string): PageReference[] {
  const refs: PageReference[] = []
  const uuid = '[0-9a-fA-F-]{36}'
  function visit(block: CanonicalBlock) {
    if (block.flavour === 'affine:code') return
    for (const delta of deltas(block.props.text)) {
      const link = delta.attributes?.link
      if (typeof link === 'string') {
        const match = link.match(
          new RegExp(
            `^/(page|record|note|redraw)/(${uuid})(?:\\?[^#]*)?(?:#(.*))?$`
          )
        )
        if (match) {
          let anchor = match[3]
          try {
            if (anchor) anchor = decodeURIComponent(anchor)
          } catch {
            /* Preserve malformed legacy anchors literally. */
          }
          refs.push({
            kind:
              match[1] === 'page'
                ? 'document'
                : (match[1] as 'record' | 'note' | 'redraw'),
            id: match[2],
            title: delta.insert,
            ...(anchor ? { block: anchor } : {})
          })
        }
      }
      const reference = delta.attributes?.reference as
        { pageId?: string; params?: { blockIds?: string[] } } | undefined
      if (typeof reference?.pageId === 'string')
        refs.push({
          kind: 'document',
          id: reference.pageId,
          title: delta.insert,
          ...(reference.params?.blockIds?.[0]
            ? { block: reference.params.blockIds[0] }
            : {})
        })
      if (!delta.attributes?.code)
        for (const match of delta.insert.matchAll(
          /\[\[([^\]\n]{1,400})\]\]/g
        )) {
          const [target] = match[1]!.split('|')
          const [title, anchor] = target!.split('#')
          if (title?.trim())
            refs.push({
              title: title.trim(),
              ...(anchor ? { block: anchor } : {})
            })
        }
    }
    block.children.forEach(visit)
  }
  visit(parseCanonical(value).blocks)
  return refs
}
function safeLink(value: string) {
  return (
    /^(https?:\/\/|mailto:|\/(?!\/))/.test(value) && !/[\r\n\\]/.test(value)
  )
}
function inlineText(block: CanonicalBlock) {
  return deltas(block.props.text)
    .map(delta => {
      let text = delta.insert.replace(/[\\`*_[\]<>]/g, '\\$&')
      const attrs = delta.attributes ?? {}
      if (attrs.code) text = '`' + delta.insert.replaceAll('`', '\\`') + '`'
      if (attrs.bold) text = `**${text}**`
      if (attrs.italic) text = `*${text}*`
      if (attrs.strike) text = `~~${text}~~`
      if (typeof attrs.link === 'string' && safeLink(attrs.link))
        text = `[${text}](${attrs.link.replaceAll(')', '%29')})`
      return text
    })
    .join('')
}
export function canonicalMarkdown(value: string) {
  function render(block: CanonicalBlock, index = 0): string {
    const text = inlineText(block)
    let listOrder = 0
    const children = block.children
      .map(child => {
        listOrder =
          child.flavour === 'affine:list' && child.props.type === 'numbered'
            ? listOrder + 1
            : 0
        return render(child, listOrder || 1)
      })
      .filter(Boolean)
      .join('\n\n')
    if (block.flavour === 'affine:surface') return ''
    if (block.flavour === 'affine:code') {
      const body = deltas(block.props.text)
        .map(delta => delta.insert)
        .join('')
      const fence = '`'.repeat(
        Math.max(
          3,
          ...Array.from(body.matchAll(/`+/g), match => match[0].length + 1)
        )
      )
      return `${fence}${String(block.props.language ?? '').replace(/[^\w+-]/g, '')}\n${body}\n${fence}`
    }
    if (block.flavour === 'affine:divider') return '---'
    if (block.flavour === 'monolith:linked-database')
      return `[Linked database](/databases?${new URLSearchParams({ workspace: String(block.props.workspaceId), base: String(block.props.baseId), ...(block.props.viewId ? { view: String(block.props.viewId) } : {}) })})`
    if (block.flavour === 'monolith:module') {
      const config = block.props.config as Record<string, unknown> | undefined
      return typeof config?.url === 'string' && safeLink(config.url)
        ? `[${String(config.title ?? 'Link')}](${config.url})`
        : `<!-- Monolith module: ${String(block.props.widgetId || block.props.moduleId).replaceAll('--', '')} -->`
    }
    if (block.flavour === 'monolith:group' && block.props.kind === 'quote')
      return children
        .split('\n')
        .map(line => '> ' + line)
        .join('\n')
    if (block.flavour === 'affine:list') {
      const prefix =
        block.props.type === 'numbered'
          ? `${typeof block.props.order === 'number' ? block.props.order : index || 1}. `
          : block.props.type === 'todo'
            ? `- [${block.props.checked ? 'x' : ' '}] `
            : '- '
      return (
        prefix +
        text +
        (children
          ? '\n' +
            children
              .split('\n')
              .map(line => '  ' + line)
              .join('\n')
          : '')
      )
    }
    const heading =
      typeof block.props.type === 'string' && /^h[1-6]$/.test(block.props.type)
        ? '#'.repeat(Number(block.props.type[1])) + ' '
        : ''
    return [heading + text, children].filter(Boolean).join('\n\n')
  }
  return render(parseCanonical(value).blocks)
}
