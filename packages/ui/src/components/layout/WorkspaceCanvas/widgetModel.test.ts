import { describe, expect, it } from 'vitest'

import type { EditorSnapshot } from '@monolith/api'

import { readWidgetSnapshot, writeWidgetSnapshot } from './canonicalWidgets'
import { newCanvasBlock } from './defaults'
import { resizeWidget, scopedWidgets, templateWidgets } from './widgetModel'

describe('widget layouts', () => {
  it('restricts addon insertion to its registered widgets', () => {
    const catalog = {
      gym: { title: 'Training', icon: '', module: 'gym' },
      finance: { title: 'Balance', icon: '', module: 'wallet' },
      linkedDatabase: { title: '', icon: '', module: 'gym' }
    }
    expect(Object.keys(scopedWidgets(catalog, 'gym'))).toEqual(['gym'])
    expect(Object.keys(scopedWidgets(catalog, 'dashboard'))).toEqual([
      'gym',
      'finance'
    ])
  })
  it('omits uninstalled widgets from templates and gives every instance a new ID', () => {
    const catalog = { actionAgenda: { title: 'Actions', icon: '' } }
    const a = templateWidgets('focus', catalog, 'Overview'),
      b = templateWidgets('focus', catalog, 'Overview')
    expect(a).toHaveLength(1)
    expect(a[0]!.widget).toBe('actionAgenda')
    expect(a[0]!.id).not.toBe(b[0]!.id)
  })
  it('bounds resize values and snaps to responsive grid widths', () => {
    const block = newCanvasBlock('widget')
    expect(resizeWidget(block, 20, -50, 1200)).toMatchObject({
      width: 'third',
      height: 180
    })
    expect(resizeWidget(block, 600, 5000, 1200)).toMatchObject({
      width: 'half',
      height: 1000
    })
    expect(resizeWidget(block, 1100, 400, 1200)).toMatchObject({
      width: 'full',
      height: 400
    })
  })
  it('preserves historical rich content, widget configuration and IDs across canonical edits', () => {
    const make = (
      id: string,
      flavour: string,
      props: Record<string, unknown> = {},
      children: EditorSnapshot['blocks'][] = []
    ): EditorSnapshot['blocks'] => ({
      type: 'block',
      id,
      flavour,
      version: 1,
      props,
      children
    })
    const text = make('text', 'monolith:group', { kind: 'document' }, [
      make('paragraph', 'affine:paragraph', {
        text: { delta: [{ insert: 'Keep this content' }] }
      })
    ])
    const widget = make('widget', 'monolith:module', {
      moduleId: 'widget',
      widgetId: 'weather',
      config: { content: '{"name":"Baku"}', extra: 'preserved' }
    })
    const snapshot: EditorSnapshot = {
      type: 'page',
      meta: { id: 'page', title: 'Home', tags: [], createDate: 0 },
      blocks: make('page', 'affine:page', {}, [
        make('surface', 'affine:surface'),
        make('note', 'affine:note', {}, [
          make('columns', 'monolith:columns', { count: 2 }, [
            make('one', 'monolith:column', {}, [widget]),
            make('two', 'monolith:column', {}, [text])
          ])
        ])
      ])
    }
    const items = readWidgetSnapshot(snapshot).blocks
    expect(items[0]!.width).toBe('half')
    expect(items[1]).toMatchObject({
      type: 'document',
      width: 'full',
      height: 0
    })
    const saved = writeWidgetSnapshot(snapshot, [
      { ...items[0]!, width: 'third', height: 420 },
      items[1]!
    ])
    expect(saved.blocks.children[1]!.children[1]).toEqual(text)
    expect(saved.blocks.children[1]!.children[0]!.props.config).toMatchObject({
      extra: 'preserved',
      content: '{"name":"Baku"}',
      width: 'third',
      height: 420
    })
    expect(readWidgetSnapshot(saved).blocks[0]).toMatchObject({
      id: 'widget',
      width: 'third',
      height: 420
    })
    expect(snapshot.blocks.children[1]!.children[0]!.flavour).toBe(
      'monolith:columns'
    )
    const deleted = writeWidgetSnapshot(saved, [])
    const restored = writeWidgetSnapshot(
      deleted,
      readWidgetSnapshot(saved).blocks,
      readWidgetSnapshot(saved).originals
    )
    expect(restored.blocks.children[1]!.children[1]).toEqual(text)
  })
})
