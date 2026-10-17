// @vitest-environment jsdom
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type CanvasWidgetCatalog,
  CanvasWidgetExtensionProvider
} from './CanvasWidgets'
import { InlineDatabasePicker } from './InlineDatabasePicker'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/primitives', () => {
  function Primitive({
    as = 'div',
    children,
    ...props
  }: {
    as?: ElementType
    children?: ReactNode
    [key: string]: unknown
  }) {
    return createElement(
      as,
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
            /^(aria-|data-|on[A-Z]|ref$|role$|value$|className$|type$|autoFocus$)/.test(
            key
          )
        )
      ),
      children
    )
  }
  return {
    Box: Primitive,
    Flex: Primitive,
    Stack: Primitive,
    Grid: Primitive,
    Text: Primitive,
    Icon: () => null
  }
})
vi.mock('@/components/inputs', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    ...props
  }: {
    children?: ReactNode
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
    [key: string]: unknown
  }) =>
    createElement(
      'button',
      {
        onClick,
        disabled: disabled || loading,
        ...Object.fromEntries(
          Object.entries(props).filter(([key]) =>
            /^(aria-|data-|className$)/.test(key)
          )
        )
      },
      children
    )
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})
const insert = vi.fn()
const reference = { workspaceId: 'current', baseId: 'created', viewId: 'view' }
async function render(createDatabase?: CanvasWidgetCatalog['createDatabase']) {
  insert.mockClear()
  await act(async () =>
    root.render(
      <CanvasWidgetExtensionProvider
        value={{
          createDatabase,
          widgets: {},
          render: () => null,
          databases: [
            {
              id: 'same',
              workspaceId: 'current',
              name: 'Studio',
              views: [
                { id: 'board', name: 'Board view' },
                { id: 'table', name: 'Table view' }
              ]
            },
            { id: 'other', workspaceId: 'foreign', name: 'Private', views: [] }
          ]
        }}
      >
        <InlineDatabasePicker workspaceId="current" onInsert={insert} />
      </CanvasWidgetExtensionProvider>
    )
  )
}
function button(label: string) {
  return [...host.querySelectorAll('button')].find(
    item => item.textContent === label
  )!
}
async function click(label: string) {
  await act(async () => button(label).click())
}

describe('database creation menu', () => {
  it('creates the chosen layout directly and suppresses repeated activation while pending', async () => {
    let finish!: (value: typeof reference) => void
    const create = vi.fn(
      () =>
        new Promise<typeof reference>(resolve => {
          finish = resolve
        })
    )
    await render(create)
    expect(host.querySelector('form')).toBeNull()
    await click('modes.kanban')
    await click('modes.table')
    expect(create).toHaveBeenCalledExactlyOnceWith('newDatabase', 'kanban')
    await act(async () => finish(reference))
    expect(insert).toHaveBeenCalledExactlyOnceWith(reference, 'newDatabase')
  })
  it('keeps the menu usable after failure and allows retry', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Error('Offline'))
      .mockResolvedValue(reference)
    await render(create)
    await click('modes.table')
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Offline')
    expect(insert).not.toHaveBeenCalled()
    await click('modes.table')
    expect(insert).toHaveBeenCalledOnce()
  })
  it('links an existing saved view without exposing another workspace', async () => {
    await render()
    expect(host.textContent).not.toContain('Private')
    await click('Studio')
    expect(document.activeElement?.textContent).toBe('Board view')
    await click('Table view')
    expect(insert).toHaveBeenCalledExactlyOnceWith(
      { workspaceId: 'current', baseId: 'same', viewId: 'table' },
      'Studio'
    )
  })
  it('does not insert into a closed editor after an in-flight creation finishes', async () => {
    let finish!: (value: typeof reference) => void
    await render(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    await click('modes.gallery')
    await act(async () => root.render(null))
    await act(async () => finish(reference))
    expect(insert).not.toHaveBeenCalled()
  })
})
