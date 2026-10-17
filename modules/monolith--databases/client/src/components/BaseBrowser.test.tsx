// @vitest-environment jsdom
import { type ElementType, type ReactNode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type RecordPage,
  type Snapshot,
  viewConfigSchema
} from '../../../shared'
import { indexSnapshot } from '../utils/snapshotIndex'
import { BaseBrowser } from './BaseBrowser'

type PrimitiveProps = {
  as?: ElementType
  children?: ReactNode
  role?: string
  'aria-label'?: string
  'aria-current'?: 'page'
}
type ButtonProps = PrimitiveProps & {
  disabled?: boolean
  onClick?: () => void
  to?: string
}

let data: Snapshot
let baseId: string
let selectedViewId: string
let readOnly: boolean
let root: Root | undefined
let container: HTMLDivElement

vi.mock('@monolith/localization', () => ({
  useModuleTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/DatabaseProvider', () => ({
  useDatabases: () => ({
    data,
    index: indexSnapshot(data),
    base: data.bases.find(base => base.id === baseId),
    selectedViewId,
    viewHref: (id: string) => `?base=${baseId}&view=${id}`,
    busy: false,
    readOnly
  })
}))

function RecordList({ records }: { records: RecordPage[] }) {
  return createElement(
    'ul',
    { 'data-record-list': true },
    records.map(record => createElement('li', { key: record.id }, record.title))
  )
}

vi.mock('./DatabaseTable', () => ({ DatabaseTable: RecordList }))
vi.mock('./DatabaseKanban', () => ({ DatabaseKanban: RecordList }))
vi.mock('./DatabaseCalendar', () => ({ DatabaseCalendar: RecordList }))
vi.mock('./ViewSummary', () => ({ ViewSummary: () => null }))
vi.mock('./BaseEditor', () => ({ BaseEditor: () => null }))
vi.mock('./FieldEditor', () => ({ FieldEditor: () => null }))
vi.mock('./ViewEditor', () => ({ ViewEditor: () => null }))
vi.mock('./RecordEditor', () => ({ RecordEditor: () => null }))
vi.mock('@monolith/ui', () => {
  function Primitive({ as = 'div', children, role, ...props }: PrimitiveProps) {
    return createElement(
      as,
      {
        role,
        'aria-label': props['aria-label'],
        'aria-current': props['aria-current']
      },
      children
    )
  }

  return {
    Box: Primitive,
    Flex: Primitive,
    Stack: Primitive,
    Text: Primitive,
    Icon: () => null,
    TagChip: ({ label }: { label: string }) =>
      createElement('span', null, label),
    Button: ({
      as = 'button',
      children,
      disabled,
      onClick,
      to,
      'aria-label': label
    }: ButtonProps) =>
      createElement(
        as,
        { disabled, onClick, to, 'aria-label': label },
        children
      ),
    ContextMenu: Primitive,
    ContextMenuItem: ({
      label,
      disabled,
      onClick
    }: ButtonProps & { label: string }) =>
      createElement('button', { disabled, onClick }, label),
    TextInput: ({
      value,
      onChange,
      onKeyDown,
      actionButtonProps,
      ...props
    }: {
      value: string
      onChange: (value: string) => void
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
      'aria-label': string
      actionButtonProps: ButtonProps
    }) =>
      createElement(
        'div',
        null,
        createElement('input', {
          value,
          'aria-label': props['aria-label'],
          onKeyDown,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
        }),
        createElement('button', {
          disabled: actionButtonProps.disabled,
          onClick: actionButtonProps.onClick,
          'aria-label': actionButtonProps['aria-label']
        })
      )
  }
})

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

beforeEach(() => {
  data = {
    bases: [
      { id: 'projects', name: 'Projects', description: '' },
      { id: 'notes', name: 'Notes', description: '' }
    ],
    fields: [],
    links: [],
    records: [
      {
        id: 'launch',
        base_id: 'projects',
        title: 'Launch plan',
        content: '',
        values: {},
        updated: '',
        done: false
      },
      {
        id: 'done',
        base_id: 'projects',
        title: 'Launch complete',
        content: '',
        values: {},
        updated: '',
        done: true
      },
      {
        id: 'design',
        base_id: 'projects',
        title: 'Design system',
        content: '',
        values: {},
        updated: '',
        done: false
      },
      {
        id: 'note',
        base_id: 'notes',
        title: 'Research notes',
        content: '',
        values: {},
        updated: ''
      }
    ],
    views: [
      {
        id: 'active',
        base_id: 'projects',
        name: 'Active work',
        mode: 'table',
        group_field_id: null,
        config: viewConfigSchema.parse({
          filters: [{ field_id: 'done', operator: 'equals', value: false }]
        })
      },
      {
        id: 'all',
        base_id: 'projects',
        name: 'All work',
        mode: 'table',
        group_field_id: null,
        config: viewConfigSchema.parse({})
      }
    ]
  }
  baseId = 'projects'
  selectedViewId = 'active'
  readOnly = false
  container = document.createElement('div')
  document.body.append(container)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  container.remove()
})

async function renderBrowser() {
  root ??= createRoot(container)
  await act(async () =>
    root?.render(createElement(MemoryRouter, null, createElement(BaseBrowser)))
  )
}

async function search(value: string) {
  if (!container.querySelector('input'))
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="search"]')!
        .click()
    )
  const input = container.querySelector('input')!
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!
  await act(async () => {
    setValue.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function titles() {
  return Array.from(
    container.querySelectorAll('[data-record-list] li'),
    item => item.textContent
  )
}

describe('Database browsing search and view controls', () => {
  it('searches titles immediately inside the current saved filter without changing records or view configuration', async () => {
    const original = JSON.stringify(data)
    await renderBrowser()
    expect(titles()).toEqual(['Design system', 'Launch plan'])
    await search('  LAUNCH  ')
    expect(titles()).toEqual(['Launch plan'])
    expect(JSON.stringify(data)).toBe(original)
  })

  it('shows a focused no-results state and Escape restores the same saved view', async () => {
    await renderBrowser()
    await search('no title matches')
    expect(container.querySelector('[data-record-list]')).toBeNull()
    expect(container.textContent).toContain('noSearchResults')
    const input = container.querySelector('input')!
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
    expect(input.value).toBe('')
    expect(titles()).toEqual(['Design system', 'Launch plan'])
  })

  it('retains search when changing saved views and clears it on a different database', async () => {
    await renderBrowser()
    await search('launch')
    selectedViewId = 'all'
    await renderBrowser()
    expect(titles()).toEqual(['Launch complete', 'Launch plan'])
    baseId = 'notes'
    await renderBrowser()
    expect(container.querySelector('input')!.value).toBe('')
    expect(titles()).toEqual(['Research notes'])
  })

  it('lets viewers search and navigate while disabling all schema and record creation controls', async () => {
    readOnly = true
    await renderBrowser()
    expect(container.querySelectorAll('nav a')).toHaveLength(2)

    for (const action of [
      'newRecord',
      'viewSettings',
      'newView',
      'addField',
      'editBase'
    ]) {
      const button = Array.from(container.querySelectorAll('button')).find(
        button =>
          button.textContent === action ||
          button.getAttribute('aria-label') === action
      )
      expect(button?.disabled).toBe(true)
    }
    await search('launch')
    expect(titles()).toEqual(['Launch plan'])
    expect(container.querySelector('input')?.disabled).toBe(false)
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="buttons.clear"]')!
        .click()
    )
    expect(titles()).toEqual(['Design system', 'Launch plan'])
  })
})
