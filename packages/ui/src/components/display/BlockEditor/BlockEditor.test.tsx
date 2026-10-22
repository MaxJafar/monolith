// @vitest-environment jsdom
import { serializeDocument } from '@monolith/blocks'
import type { Editor, UseEditorOptions } from '@tiptap/react'
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CanvasWidgetExtensionProvider } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'

import { BlockEditor } from './index'

const harness = vi.hoisted(() => ({ editor: null as Editor | null }))

// Capture the actual Tiptap editor while retaining its real React/ProseMirror behavior.
vi.mock('@tiptap/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@tiptap/react')>()

  return {
    ...actual,
    useEditor: (options: UseEditorOptions) => {
      const editor = actual.useEditor(options)

      harness.editor = editor

      return editor
    }
  }
})
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/layout/WorkspaceCanvas/InlineDatabasePicker', () => ({
  InlineDatabasePicker: ({ initialMode, onInsert }: {
    initialMode: string
    onInsert: (reference: { workspaceId: string; baseId: string; viewId: string }, title: string) => void
  }) => createElement('button', {
    'data-database-mode': initialMode,
    onClick: () => onInsert({ workspaceId: crypto.randomUUID(), baseId: crypto.randomUUID(), viewId: crypto.randomUUID() }, 'Inline collection')
  }, 'Create inline database')
}))

type PrimitiveProps = {
  as?: ElementType
  children?: ReactNode
  [key: string]: unknown
}

vi.mock('@/components/primitives', () => {
  function Primitive({ as = 'div', children, ...props }: PrimitiveProps) {
    return createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          /^(aria-|data-|on[A-Z]|className$|role$|style$)/.test(key)
        )
      ),
      children
    )
  }

  return { Box: Primitive, Flex: Primitive, Stack: Primitive, Text: Primitive }
})
vi.mock('@/components/inputs', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    onMouseDown,
    ...props
  }: {
    children?: ReactNode
    disabled?: boolean
    onClick?: () => void
    onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void
    [key: string]: unknown
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        disabled,
        onClick,
        onMouseDown,
        ...Object.fromEntries(
          Object.entries(props).filter(([key]) => /^(aria-|role$)/.test(key))
        )
      },
      children
    ),
  TextInput: () => createElement('input', { type: 'text' })
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let container: HTMLDivElement
let root: Root

const originalRangeGeometry = {
  getBoundingClientRect: Object.getOwnPropertyDescriptor(
    Range.prototype,
    'getBoundingClientRect'
  ),
  getClientRects: Object.getOwnPropertyDescriptor(
    Range.prototype,
    'getClientRects'
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )

  harness.editor = null
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  // jsdom has no layout; ProseMirror uses Range geometry only to position menus.
  const bounds = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 20,
    right: 100,
    width: 100,
    height: 20,
    toJSON: () => ({})
  }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(bounds)
  Object.defineProperties(Range.prototype, {
    getBoundingClientRect: { configurable: true, value: () => bounds },
    getClientRects: { configurable: true, value: () => [bounds] }
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()

  for (const [name, descriptor] of Object.entries(originalRangeGeometry)) {
    if (descriptor) Object.defineProperty(Range.prototype, name, descriptor)
    else Reflect.deleteProperty(Range.prototype, name)
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()

  vi.useRealTimers()
})

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10)
  })
}

async function mount(value: string, readOnly: boolean, onChange = vi.fn()) {
  await act(async () =>
    root.render(
      <BlockEditor readOnly={readOnly} value={value} onChange={onChange} />
    )
  )
  await settle()

  expect(harness.editor).not.toBeNull()

  return harness.editor!
}

describe('Block editor cursor and read-only behavior', () => {
  it.each([['table', 'table'], ['board', 'kanban'], ['database', 'table']])(
    'inserts /%s at the caret with the %s layout and preserves surrounding text',
    async (command, mode) => {
      const onChange = vi.fn(), onInsertBlock = vi.fn()
      await act(async () => root.render(
        <CanvasWidgetExtensionProvider value={{ widgets: {}, render: () => null, createDatabase: vi.fn() }}>
          <BlockEditor value={'Before\n\nAfter'} onChange={onChange} onInsertBlock={onInsertBlock} />
        </CanvasWidgetExtensionProvider>
      ))
      await settle()
      const editor = harness.editor!
      await act(async () => {
        editor.chain().setTextSelection(editor.state.doc.child(0).nodeSize + 1).insertContent('/' + command).run()
      })
      const option = document.querySelector<HTMLButtonElement>('[role="option"]')!
      expect(option).not.toBeNull()
      await act(async () => option.click())
      await settle()
      const picker = document.querySelector<HTMLButtonElement>('[data-database-mode]')!
      expect(picker?.dataset.databaseMode).toBe(mode)
      await act(async () => picker.click())
      const json = editor.getJSON()
      expect(json.content?.filter(node => node.type === 'linkedDatabase')).toHaveLength(1)
      expect(json.content?.find(node => node.type === 'linkedDatabase')?.attrs?.height).toBe(0)
      expect(editor.getText()).toContain('Before')
      expect(editor.getText()).toContain('After')
      expect(editor.getText()).not.toContain('/' + command)
      expect(onInsertBlock).not.toHaveBeenCalled()
      expect(onChange).toHaveBeenCalled()
    }
  )

  it('reopens embedded blocks and persists a database resize without moving the text cursor', async () => {
    const onChange = vi.fn()
    const value = serializeDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Opening paragraph' }]
        },
        {
          type: 'linkedDatabase',
          attrs: {
            workspaceId: crypto.randomUUID(),
            baseId: crypto.randomUUID(),
            viewId: crypto.randomUUID(),
            title: 'Inside the page',
            height: 420
          }
        },
        {
          type: 'pageEmbed',
          attrs: {
            kind: 'record',
            targetId: crypto.randomUUID(),
            label: 'Related page'
          }
        },
        { type: 'paragraph' }
      ]
    })
    await act(async () =>
      root.render(
        <CanvasWidgetExtensionProvider
          value={{
            widgets: {},
            render: (_id, config) => (
              <button onClick={() => config?.onHeightChange?.(460)}>
                Resize database
              </button>
            )
          }}
        >
          <BlockEditor value={value} onChange={onChange} />
        </CanvasWidgetExtensionProvider>
      )
    )
    await settle()
    expect(
      container.querySelector('.monolith-inline-database-block')
    ).not.toBeNull()
    expect(
      container.querySelector('.monolith-inline-page-block')?.textContent
    ).toBe('Related page')
    const editor = harness.editor!
    await act(async () => {
      editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    })
    const position = editor.state.selection.from
    await act(async () => {
      ;(
        container.querySelector(
          '.monolith-inline-database-block button'
        ) as HTMLButtonElement
      ).click()
    })
    expect(editor.state.doc.child(1).attrs.height).toBe(460)
    expect(editor.state.selection.from).toBe(position)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringContaining('"height":460')
    )
    expect(editor.state.doc.child(0).textContent).toBe('Opening paragraph')
  })

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'does not reorder or emit edits for a read-only movement shortcut with %j',
    async modifier => {
      const onChange = vi.fn()
      const editor = await mount(
        'First paragraph\nSecond paragraph',
        true,
        onChange
      )

      await act(async () => {
        editor.commands.setTextSelection(1)
      })
      const before = editor.getJSON()
      const textbox = container.querySelector('[role="textbox"]')!

      await act(async () => {
        textbox.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            altKey: true,
            ...modifier,
            bubbles: true,
            cancelable: true
          })
        )
      })

      expect(editor.isEditable).toBe(false)
      expect(editor.getJSON()).toEqual(before)
      expect(onChange).not.toHaveBeenCalled()
      expect(container.querySelector('[role="toolbar"]')).toBeNull()
    }
  )

  it('dismisses a slash command when the cursor leaves its paragraph without deleting either block', async () => {
    const editor = await mount('\nKeep this paragraph', false)

    await act(async () => {
      editor.commands.insertContentAt(1, '/heading')
    })

    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
    const secondParagraphStart = editor.state.doc.child(0).nodeSize + 1

    await act(async () => {
      editor.commands.setTextSelection(secondParagraphStart)
    })

    expect(document.querySelector('[role="listbox"]')).toBeNull()
    const before = editor.getJSON()

    await act(async () => {
      container.querySelector('.zillion-block-editor')!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true
        })
      )
    })

    expect(editor.getJSON()).toEqual(before)
    expect(editor.state.doc.child(0).textContent).toBe('/heading')
    expect(editor.state.doc.child(1).textContent).toBe('Keep this paragraph')
  })
})

function pointer(type: string, target: EventTarget, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y
  })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  target.dispatchEvent(event)
}

describe('Block editor grips', () => {
  it('drags a paragraph although ProseMirror redraws blocks whose DOM changes mid-drag', async () => {
    const onChange = vi.fn()
    const editor = await mount('Alpha\nBravo\nCharlie', false, onChange)
    await settle()
    const grip = container.querySelector<HTMLButtonElement>(
      '.monolith-block-grips button'
    )!
    const source = editor.view.nodeDOM(0) as HTMLElement

    await act(async () => pointer('pointerdown', grip, 10, 10))

    // Real input yields between moves, so ProseMirror's DOM observer runs.
    for (const y of [30, 60, 100]) {
      await act(async () => pointer('pointermove', window, 10, y))
      await settle()
    }

    expect(source.isConnected).toBe(true)
    expect(source.dataset.dragging).toBe('true')

    await act(async () => pointer('pointerup', window, 10, 100))
    await settle()

    expect(
      Array.from({ length: editor.state.doc.childCount }, (_, index) =>
        editor.state.doc.child(index).textContent
      )
    ).toEqual(['Bravo', 'Alpha', 'Charlie'])
    expect(container.querySelector('[data-dragging]')).toBeNull()
    expect(onChange).toHaveBeenCalled()
  })
})
