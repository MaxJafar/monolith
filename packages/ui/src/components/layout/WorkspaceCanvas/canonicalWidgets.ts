import type { EditorSnapshot } from '@monolith/api'
import type { CanvasBlock } from '@monolith/blocks'

type Block = EditorSnapshot['blocks']

/** Retain every historical block, including nested text/embeds, by stable ID. */
export function readWidgetSnapshot(snapshot: EditorSnapshot) {
  const originals = new Map<string, Block>()
  const blocks: CanvasBlock[] = []
  const visit = (block: Block, width: CanvasBlock['width'] = 'full') => {
    if (['monolith:columns', 'monolith:column'].includes(block.flavour)) {
      block.children.forEach(child =>
        visit(
          child,
          block.flavour === 'monolith:columns'
            ? block.props.count === 3
              ? 'third'
              : 'half'
            : width
        )
      )

      return
    }
    originals.set(block.id, block)
    const config = (block.props.config ?? {}) as Record<string, unknown>
    const isWidget =
      block.flavour === 'monolith:module' &&
      ['native', 'widget'].includes(String(block.props.moduleId))
    blocks.push({
      id: block.id,
      type: isWidget
        ? (block.props.moduleId as 'native' | 'widget')
        : 'document',
      widget: isWidget ? String(block.props.widgetId ?? '') : '',
      title: String(config.title ?? block.props.title ?? ''),
      content: String(config.content ?? ''),
      url: '',
      width: !isWidget
        ? 'full'
        : ['full', 'half', 'third'].includes(String(config.width))
          ? (config.width as CanvasBlock['width'])
          : width,
      height: isWidget && typeof config.height === 'number' ? config.height : 0
    })
  }
  snapshot.blocks.children
    .find(block => block.flavour === 'affine:note')
    ?.children.forEach(block => visit(block))

  return { blocks, originals }
}

export function writeWidgetSnapshot(
  snapshot: EditorSnapshot,
  blocks: CanvasBlock[],
  retained = new Map<string, Block>()
): EditorSnapshot {
  const originals = new Map([
    ...retained,
    ...readWidgetSnapshot(snapshot).originals
  ])
  const children: Block[] = blocks.map(block => {
    const previous = originals.get(block.id)

    if (previous && !['widget', 'native'].includes(block.type)) return previous

    return {
      type: 'block',
      id: block.id,
      flavour: 'monolith:module',
      version: 1,
      props: {
        ...previous?.props,
        moduleId: block.type,
        widgetId: block.widget,
        config: {
          ...(previous?.props.config ?? {}),
          title: block.title,
          content: block.content,
          width: block.width,
          height: block.height ?? 0
        }
      },
      children: []
    }
  })

  return {
    ...snapshot,
    blocks: {
      ...snapshot.blocks,
      children: snapshot.blocks.children.map(block =>
        block.flavour === 'affine:note' ? { ...block, children } : block
      )
    }
  }
}
