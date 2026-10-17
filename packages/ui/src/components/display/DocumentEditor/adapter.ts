import { CalloutViewExtension } from '@blocksuite/affine/blocks/callout/view'
import { CodeBlockViewExtension } from '@blocksuite/affine/blocks/code/view'
import { DividerViewExtension } from '@blocksuite/affine/blocks/divider/view'
import { ListViewExtension } from '@blocksuite/affine/blocks/list/view'
import { NoteViewExtension } from '@blocksuite/affine/blocks/note/view'
import { ParagraphViewExtension } from '@blocksuite/affine/blocks/paragraph/view'
import { RootViewExtension } from '@blocksuite/affine/blocks/root/view'
import { SurfaceViewExtension } from '@blocksuite/affine/blocks/surface/view'
import type {} from '@blocksuite/affine/effects'
import {
  StoreExtensionManager,
  ViewExtensionManager
} from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { FoundationViewExtension } from '@blocksuite/affine/foundation/view'
import type {} from '@blocksuite/affine/global/types'
import { FootnoteViewExtension } from '@blocksuite/affine/inlines/footnote/view'
import { LatexViewExtension } from '@blocksuite/affine/inlines/latex/view'
import { LinkViewExtension } from '@blocksuite/affine/inlines/link/view'
import { MentionViewExtension } from '@blocksuite/affine/inlines/mention/view'
import { InlinePresetViewExtension } from '@blocksuite/affine/inlines/preset/view'
import { ReferenceViewExtension } from '@blocksuite/affine/inlines/reference/view'
import { FeatureFlagService } from '@blocksuite/affine/shared/services'
import {
  BlockSelection,
  BlockStdScope,
  TextSelection
} from '@blocksuite/affine/std'
import { SlashMenuConfigExtension } from '@blocksuite/affine/widgets/slash-menu'
import { SlashMenuViewExtension } from '@blocksuite/affine/widgets/slash-menu/view'
import { ToolbarViewExtension } from '@blocksuite/affine/widgets/toolbar/view'
import {
  type BlockModel,
  type BlockSnapshot,
  type ExtensionType,
  type Store,
  Text
} from '@blocksuite/store'
import type { EditorSnapshot } from '@monolith/api'
import { html } from 'lit'

import type { InlineDatabaseMode } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'

import { monolithSchemas } from './schema'
import { applicationViews } from './views'

export function editorStoreExtensions(): ExtensionType[] {
  return [
    ...new StoreExtensionManager(getInternalStoreExtensions()).get('store'),
    ...monolithSchemas
  ]
}

const viewManager = new ViewExtensionManager([
  FoundationViewExtension,
  RootViewExtension,
  SurfaceViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  ListViewExtension,
  CodeBlockViewExtension,
  DividerViewExtension,
  CalloutViewExtension,
  InlinePresetViewExtension,
  LinkViewExtension,
  ReferenceViewExtension,
  LatexViewExtension,
  MentionViewExtension,
  FootnoteViewExtension,
  SlashMenuViewExtension,
  ToolbarViewExtension
])

export class DocumentAdapter {
  readonly std: BlockStdScope
  readonly host: HTMLElement
  private anchor: string | undefined

  constructor(
    readonly store: Store,
    database?: {
      label: string
      layouts: Record<InlineDatabaseMode, string>
      choose: (blockId: string, mode: InlineDatabaseMode) => void
    }
  ) {
    this.std = new BlockStdScope({
      store,
      extensions: [
        ...viewManager.get('page'),
        ...applicationViews(),
        // Monolith owns the caret-anchored surface; retain the registered block actions.
        SlashMenuConfigExtension('monolith-menu-trigger', {
          items: [],
          disableWhen: () => true
        }),
        ...(database
          ? [
              SlashMenuConfigExtension('monolith-database', {
                items: [
                  {
                    name: database.label,
                    searchAlias: [
                      'database',
                      'inline database',
                      'inline data',
                      'database inline'
                    ],
                    group: '3_Database@0',
                    icon: html`<span aria-hidden="true">▦</span>`,
                    action: ({ model }) => database.choose(model.id, 'table')
                  },
                  ...(
                    ['table', 'kanban', 'calendar', 'gallery', 'list', 'chart', 'dashboard', 'timeline'] as const
                  ).map((mode, index) => ({
                    name: database.layouts[mode],
                    searchAlias: [mode, `${mode} view`, `${mode} database`],
                    group: `3_Database@${index + 1}` as const,
                    icon: html`<span aria-hidden="true">▦</span>`,
                    action: ({ model }: { model: BlockModel }) =>
                      database.choose(model.id, mode)
                  }))
                ]
              })
            ]
          : [])
      ]
    })
    this.std.get(FeatureFlagService).setFlag('enable_callout', true)
    this.host = this.std.render()
    this.host.tabIndex = 0
    this.host.classList.add('monolith-document-host', 'affine-page-viewport')
  }

  get selected() {
    return this.std.selection.filter(BlockSelection).map(item => item.blockId)
  }

  setBackground(color: string) {
    if (this.store.readonly || (color && !/^#[0-9a-f]{6}$/i.test(color))) return
    this.store.captureSync()
    this.store.transact(() => {
      for (const model of this.roots())
        this.store.updateBlock(model, { 'monolith:background': color })
    })
    this.store.captureSync()
  }

  insertionPoint() {
    const text = this.std.selection.find(TextSelection)
    const current =
      this.roots().at(-1) ?? (text && this.store.getModelById(text.end.blockId))
    const parent = current && this.store.getParent(current)
    if (
      current &&
      parent &&
      this.store.schema.safeValidate('monolith:linked-database', parent.flavour)
    )
      return { parentId: parent.id, afterId: current.id }
    const note = this.store.root?.children.find(
      model => model.flavour === 'affine:note'
    )
    return note
      ? { parentId: note.id, afterId: note.children.at(-1)?.id }
      : undefined
  }

  orderedBlocks() {
    const result: BlockModel[] = []
    const visit = (model: BlockModel) => {
      if (
        ![
          'affine:page',
          'affine:surface',
          'affine:note',
          'monolith:column'
        ].includes(model.flavour)
      )
        result.push(model)
      model.children.forEach(visit)
    }
    if (this.store.root) visit(this.store.root)
    return result
  }

  select(ids: string[]) {
    const valid = [...new Set(ids)].filter(id => this.store.hasBlock(id))
    const current = this.selected
    if (
      valid.length &&
      valid.length === current.length &&
      valid.every((id, index) => current[index] === id)
    )
      return
    this.std.selection.setGroup(
      'note',
      valid.map(blockId => new BlockSelection({ blockId }))
    )
  }

  selectFromGutter(id: string, range: boolean, toggle: boolean) {
    const order = this.orderedBlocks().map(block => block.id)
    if (range && this.anchor && order.includes(this.anchor)) {
      const ends = [order.indexOf(this.anchor), order.indexOf(id)].sort(
        (a, b) => a - b
      )
      this.select(order.slice(ends[0], ends[1] + 1))
    } else {
      this.select(
        toggle
          ? this.selected.includes(id)
            ? this.selected.filter(value => value !== id)
            : [...this.selected, id]
          : [id]
      )
      this.anchor = id
    }
  }

  roots(ids = this.selected) {
    const selected = new Set(ids)
    return this.orderedBlocks().filter(model => {
      if (!selected.has(model.id)) return false
      let parent = this.store.getParent(model)
      while (parent) {
        if (selected.has(parent.id)) return false
        parent = this.store.getParent(parent)
      }
      return true
    })
  }

  canMove(ids: string[], parentId: string, siblingId?: string) {
    if (this.store.readonly) return false
    const parent = this.store.getModelById(parentId)
    const roots = this.roots(ids)
    if (!parent || !roots.length) return false
    const moving = new Set(roots.map(model => model.id))
    if (siblingId && moving.has(siblingId)) return false
    let current: BlockModel | null = parent
    while (current) {
      if (moving.has(current.id)) return false
      current = this.store.getParent(current)
    }
    return roots.every(model =>
      this.store.schema.safeValidate(model.flavour, parent.flavour)
    )
  }

  move(ids: string[], parentId: string, siblingId?: string, before = true) {
    if (!this.canMove(ids, parentId, siblingId)) return false
    this.store.captureSync()
    this.store.moveBlocks(
      this.roots(ids),
      this.store.getModelById(parentId)!,
      siblingId ? this.store.getModelById(siblingId) : null,
      before
    )
    this.store.captureSync()
    this.select(ids)
    return true
  }

  moveByKeyboard(direction: -1 | 1) {
    const roots = this.roots()
    const edge = direction < 0 ? roots[0] : roots.at(-1)
    if (!edge) return
    const parent = this.store.getParent(edge)
    const sibling = parent?.children[parent.children.indexOf(edge) + direction]
    if (parent && sibling)
      this.move(
        roots.map(model => model.id),
        parent.id,
        sibling.id,
        direction < 0
      )
  }

  snapshot(): EditorSnapshot {
    const snapshot = this.store.getTransformer().docToSnapshot(this.store)
    if (!snapshot) throw new Error('Document snapshot could not be created')
    const normalize = (block: BlockSnapshot): EditorSnapshot['blocks'] => {
      if (block.version === undefined)
        throw new Error('A block has no schema version')
      return {
        ...block,
        version: block.version,
        children: block.children.map(normalize)
      }
    }
    const title =
      (
        this.store.root?.props as { title?: Text } | undefined
      )?.title?.toString() ?? snapshot.meta.title
    return {
      ...snapshot,
      meta: { ...snapshot.meta, title },
      blocks: normalize(snapshot.blocks)
    }
  }

  copy() {
    const transformer = this.store.getTransformer()
    return this.roots().map(model => {
      const snapshot = transformer.blockToSnapshot(model)
      if (!snapshot) throw new Error('Block snapshot could not be created')
      return snapshot
    })
  }

  async paste(blocks: BlockSnapshot[], parentId: string, index?: number) {
    if (this.store.readonly || !blocks.length) return
    const parent = this.store.getModelById(parentId)
    if (!parent) return
    let count = 0
    const validate = (
      block: BlockSnapshot,
      parent: string,
      depth: number
    ): boolean => {
      if (
        !block ||
        ++count > 10000 ||
        depth > 40 ||
        block.type !== 'block' ||
        !Array.isArray(block.children) ||
        !block.props ||
        !this.store.schema.safeValidate(block.flavour, parent)
      )
        return false
      if (
        block.flavour === 'monolith:columns' &&
        (![2, 3].includes(Number(block.props.count)) ||
          block.children.length !== Number(block.props.count))
      )
        return false
      return block.children.every(child =>
        validate(child, block.flavour, depth + 1)
      )
    }
    if (!blocks.every(block => validate(block, parent.flavour, 0)))
      throw new Error('Unsupported clipboard block tree')
    // Decode before the transaction. An async callback cannot be an atomic Yjs transaction.
    const transformer = this.store.getTransformer()
    type Decoded = {
      id: string
      flavour: string
      props: object
      children: Decoded[]
    }
    const decode = async (block: BlockSnapshot): Promise<Decoded> => {
      const id = crypto.randomUUID()
      const data = await transformer.snapshotToModelData({ ...block, id })
      if (!data) throw new Error('Unsupported clipboard block')
      return {
        id,
        flavour: block.flavour,
        props: data.props,
        children: await Promise.all(block.children.map(decode))
      }
    }
    const decoded = await Promise.all(blocks.map(decode))
    if (this.store.readonly || this.store.getModelById(parentId) !== parent)
      return
    this.store.captureSync()
    this.store.transact(() => {
      const insert = (
        block: (typeof decoded)[number],
        parent: string,
        position?: number
      ) => {
        this.store.addBlock(
          block.flavour,
          { ...block.props, id: block.id },
          parent,
          position
        )
        block.children.forEach(child => insert(child, block.id))
      }
      decoded.forEach((block, offset) =>
        insert(
          block,
          parentId,
          index === undefined ? undefined : index + offset
        )
      )
    })
    this.store.captureSync()
    this.select(decoded.map(block => block.id))
  }

  async duplicate() {
    const last = this.roots().at(-1)
    const parent = last && this.store.getParent(last)
    if (parent && last)
      await this.paste(
        this.copy(),
        parent.id,
        parent.children.indexOf(last) + 1
      )
  }

  delete() {
    if (this.store.readonly) return
    const roots = this.roots()
    this.store.captureSync()
    this.store.transact(() =>
      roots.forEach(model => this.store.deleteBlock(model))
    )
    this.store.captureSync()
    this.select([])
  }

  insert(flavour: string, props: Record<string, unknown> = {}) {
    if (this.store.readonly) return
    const point = this.insertionPoint()
    const parent = point && this.store.getModelById(point.parentId)
    if (
      !point ||
      !parent ||
      !this.store.schema.safeValidate(flavour, parent.flavour)
    )
      return
    const index = parent.children.findIndex(child => child.id === point.afterId)
    this.store.captureSync()
    const id = this.store.addBlock(
      flavour,
      props,
      parent.id,
      index < 0 ? undefined : index + 1
    )
    if (flavour === 'affine:callout')
      this.store.addBlock('affine:paragraph', { text: new Text('') }, id)
    this.store.captureSync()
    this.select([id])
    return id
  }

  setParagraphType(type: 'text' | 'h1' | 'h2' | 'h3' | 'quote') {
    if (this.store.readonly) return
    const blocks = this.roots().filter(
      model => model.flavour === 'affine:paragraph'
    )
    this.store.captureSync()
    this.store.transact(() =>
      blocks.forEach(model => this.store.updateBlock(model, { type }))
    )
    this.store.captureSync()
  }

  addColumns(count: 2 | 3, parentId: string) {
    if (
      this.store.readonly ||
      this.store.getModelById(parentId)?.flavour !== 'affine:note'
    )
      return
    this.store.captureSync()
    let columns = ''
    this.store.transact(() => {
      columns = this.store.addBlock('monolith:columns', { count }, parentId)
      for (let index = 0; index < count; index++) {
        const column = this.store.addBlock('monolith:column', {}, columns)
        this.store.addBlock('affine:paragraph', { text: new Text('') }, column)
      }
    })
    this.store.captureSync()
    return columns
  }

  dispose() {
    this.host.remove()
  }
}
