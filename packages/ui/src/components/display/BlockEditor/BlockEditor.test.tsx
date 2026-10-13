// @vitest-environment jsdom
import type { Editor, UseEditorOptions } from '@tiptap/react'
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

    expect(container.querySelector('[role="listbox"]')).not.toBeNull()
    const secondParagraphStart = editor.state.doc.child(0).nodeSize + 1

    await act(async () => {
      editor.commands.setTextSelection(secondParagraphStart)
    })

    expect(container.querySelector('[role="listbox"]')).toBeNull()
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
